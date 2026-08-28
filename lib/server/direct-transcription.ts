import { createClient } from '@/lib/supabase/server'
import {
  startAssemblyAITranscription,
  getAssemblyAITranscriptionStatus,
  type AssemblyAITranscriptionResponse,
} from '@/lib/api/assemblyai'
import { uploadTranscriptToR2 } from '@/lib/r2/upload-transcript'
import { R2Keys } from '@/lib/r2/keys'
import type { TranscriptSegment } from '@/lib/types'

type AssemblyAIWord = {
  text: string
  start: number
  end: number
  confidence: number
  speaker?: string | null
}

/**
 * Transforms AssemblyAI utterances and word-level output into standard Prometheus TranscriptSegment format.
 */
export function normalizeAssemblyAITranscript(
  response: AssemblyAITranscriptionResponse
): TranscriptSegment[] {
  if (Array.isArray(response.utterances) && response.utterances.length > 0) {
    return response.utterances.map((u, idx) => ({
      id: `segment-${idx + 1}`,
      text: u.text.trim(),
      startMs: Math.max(0, Math.round(u.start)),
      endMs: Math.max(Math.round(u.start), Math.round(u.end)),
      speaker: u.speaker || 'A',
    }))
  }

  // Fallback: If no utterances are provided, group raw words into sentence-like segments (~6-8 words)
  const words: AssemblyAIWord[] = response.words || []
  if (words.length === 0) {
    if (response.text && response.text.trim().length > 0) {
      return [
        {
          id: 'segment-1',
          text: response.text.trim(),
          startMs: 0,
          endMs: Math.round((response.audio_duration || 30) * 1000),
          speaker: 'A',
        },
      ]
    }
    return []
  }

  const segments: TranscriptSegment[] = []
  const CHUNK_SIZE = 8
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const chunkWords = words.slice(i, i + CHUNK_SIZE)
    const firstWord = chunkWords[0]
    const lastWord = chunkWords[chunkWords.length - 1]
    const segmentText = chunkWords.map((w) => w.text).join(' ')
    segments.push({
      id: `segment-${segments.length + 1}`,
      text: segmentText,
      startMs: Math.max(0, Math.round(firstWord.start)),
      endMs: Math.max(Math.round(firstWord.start), Math.round(lastWord.end)),
      speaker: firstWord.speaker || 'A',
    })
  }

  return segments
}

export interface DispatchTranscriptionParams {
  userId: string
  projectId: string
  assetId: string
  jobId?: string
  sourceUrl: string
  bucket?: string
}

/**
 * Dispatches a direct AssemblyAI transcription job and kicks off the background poller.
 */
export async function startDirectTranscription(
  params: DispatchTranscriptionParams
): Promise<{ transcriptJobId: string; status: string }> {
  const { userId, projectId, assetId, jobId, sourceUrl, bucket } = params

  console.log(`[DirectTranscription] Submitting AssemblyAI job for project=${projectId}, asset=${assetId}...`)
  const assemblyJob = await startAssemblyAITranscription({
    audio_url: sourceUrl,
    speaker_labels: true,
    punctuate: true,
    format_text: true,
  })

  const supabase = await createClient()

  // 1. Update source_assets with the active transcript job ID
  await supabase
    .from('source_assets')
    .update({
      transcript_job_id: assemblyJob.id,
      transcript_status: 'transcribing',
    })
    .eq('id', assetId)

  // 2. Update durable_jobs if jobId provided
  if (jobId) {
    await supabase
      .from('durable_jobs')
      .update({
        transcript_job_id: assemblyJob.id,
        transcript_status: 'transcribing',
      })
      .eq('id', jobId)
  }

  // 3. Kick off async polling loop in background (non-blocking)
  runDirectTranscriptionBackground({
    userId,
    projectId,
    assetId,
    jobId,
    transcriptJobId: assemblyJob.id,
    bucket: bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources',
  }).catch((err) => {
    console.error(`[DirectTranscription] Background error for asset=${assetId}:`, err)
  })

  return { transcriptJobId: assemblyJob.id, status: assemblyJob.status }
}

/**
 * Background polling loop that resolves the transcript from AssemblyAI,
 * uploads the artifacts to R2, and commits them to Supabase durable_jobs and projects.
 */
export async function runDirectTranscriptionBackground(params: {
  userId: string
  projectId: string
  assetId: string
  jobId?: string
  transcriptJobId: string
  bucket: string
}): Promise<void> {
  const { userId, projectId, assetId, jobId, transcriptJobId, bucket } = params
  const supabase = await createClient()

  const MAX_ATTEMPTS = 60 // 60 attempts * 2s = 120s max
  let attempts = 0

  while (attempts < MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    attempts++

    try {
      const statusRes = await getAssemblyAITranscriptionStatus(transcriptJobId)

      if (statusRes.status === 'completed') {
        console.log(`[DirectTranscription] AssemblyAI job=${transcriptJobId} completed in attempt ${attempts}!`)
        const segments = normalizeAssemblyAITranscript(statusRes)

        // 1. Upload to Cloudflare R2
        const r2Key = R2Keys.transcript(userId, projectId, assetId)
        await uploadTranscriptToR2(bucket, r2Key, statusRes).catch((err) => {
          console.warn('[DirectTranscription] R2 upload warning:', err)
        })

        // 2. Update source_assets
        await supabase
          .from('source_assets')
          .update({
            transcript_status: 'completed',
            transcript_r2_key: r2Key,
            transcript_completed_at: new Date().toISOString(),
            transcript_synced_at: new Date().toISOString(),
            transcript_text: statusRes.text || '',
            transcript_error: null,
          })
          .eq('id', assetId)

        // 3. Update durable_jobs
        if (jobId) {
          const { data: currentJob } = await supabase
            .from('durable_jobs')
            .select('artifacts')
            .eq('id', jobId)
            .single()

          const currentArtifacts = (currentJob?.artifacts && typeof currentJob.artifacts === 'object')
            ? currentJob.artifacts
            : {}

          await supabase
            .from('durable_jobs')
            .update({
              status: 'completed',
              progress: 100,
              transcript_status: 'completed',
              transcript_text: statusRes.text || '',
              artifacts: {
                ...currentArtifacts,
                transcript: segments,
              },
            })
            .eq('id', jobId)
        }

        // 4. Update project source_profile
        const { data: projectData } = await supabase
          .from('projects')
          .select('source_profile')
          .eq('id', projectId)
          .single()

        const currentProfile = (projectData?.source_profile && typeof projectData.source_profile === 'object')
          ? projectData.source_profile
          : {}

        await supabase
          .from('projects')
          .update({
            source_profile: {
              ...currentProfile,
              transcript: segments,
            },
          })
          .eq('id', projectId)

        console.log(`[DirectTranscription] Successfully persisted ${segments.length} transcript segments for project=${projectId}.`)
        return
      }

      if (statusRes.status === 'error') {
        console.error(`[DirectTranscription] AssemblyAI job=${transcriptJobId} failed:`, statusRes.error)
        await supabase
          .from('source_assets')
          .update({
            transcript_status: 'failed',
            transcript_error: statusRes.error || 'AssemblyAI transcription failed',
          })
          .eq('id', assetId)

        if (jobId) {
          await supabase
            .from('durable_jobs')
            .update({
              transcript_status: 'failed',
              status: 'failed',
            })
            .eq('id', jobId)
        }
        return
      }
    } catch (pollErr) {
      console.warn(`[DirectTranscription] Polling attempt ${attempts} warning:`, pollErr)
    }
  }

  console.warn(`[DirectTranscription] Polling timed out for transcriptJobId=${transcriptJobId}`)
}
