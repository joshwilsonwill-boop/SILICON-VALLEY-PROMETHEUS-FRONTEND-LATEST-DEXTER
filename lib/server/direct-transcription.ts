import { createClient } from '@/lib/supabase/server'
import {
  startAssemblyAITranscription,
  type AssemblyAITranscriptionResponse,
} from '@/lib/api/assemblyai'
import { uploadTranscriptToR2 } from '@/lib/r2/upload-transcript'
import { R2Keys } from '@/lib/r2/keys'
import {
  buildTranscriptResultMetadata,
  buildTranscriptSourceProfile,
} from '@/lib/server/transcript-persistence'
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
 * Dispatches a direct AssemblyAI transcription job. Completion is finalized by
 * an authenticated status request so it does not depend on request-process life.
 */
export async function startDirectTranscription(
  params: DispatchTranscriptionParams
): Promise<{ transcriptJobId: string; status: string }> {
  const { projectId, assetId, sourceUrl } = params

  console.log(`[DirectTranscription] Submitting AssemblyAI job for project=${projectId}, asset=${assetId}...`)
  const assemblyJob = await startAssemblyAITranscription({
    audio_url: sourceUrl,
    speaker_labels: true,
    punctuate: true,
    format_text: true,
  })

  const supabase = await createClient()

  const { error: assetUpdateError } = await supabase
    .from('source_assets')
    .update({
      transcript_job_id: assemblyJob.id,
      transcript_status: 'transcribing',
      transcript_provider: 'assemblyai',
      transcript_started_at: new Date().toISOString(),
      transcript_error: null,
    })
    .eq('id', assetId)

  if (assetUpdateError) {
    throw new Error(`Failed to persist AssemblyAI job: ${assetUpdateError.message}`)
  }

  return { transcriptJobId: assemblyJob.id, status: assemblyJob.status }
}

export async function persistCompletedTranscript(params: {
  userId: string
  projectId: string
  assetId: string
  bucket: string
  response: AssemblyAITranscriptionResponse
}): Promise<{ r2Key: string; segments: TranscriptSegment[]; transcriptText: string }> {
  const { userId, projectId, assetId, bucket, response } = params
  const supabase = await createClient()
  const segments = normalizeAssemblyAITranscript(response)
  const transcriptText = response.text?.trim() || segments.map((segment) => segment.text).join(' ')
  const r2Key = R2Keys.transcript(userId, projectId, assetId)

  await uploadTranscriptToR2(bucket, r2Key, response).catch((error) => {
    console.warn('[DirectTranscription] R2 upload warning:', error)
  })

  const { error: assetUpdateError } = await supabase
    .from('source_assets')
    .update({
      transcript_status: 'completed',
      transcript_r2_key: r2Key,
      transcript_completed_at: new Date().toISOString(),
      transcript_synced_at: new Date().toISOString(),
      transcript_text: transcriptText,
      transcript_error: null,
    })
    .eq('id', assetId)
    .eq('user_id', userId)

  if (assetUpdateError) {
    throw new Error(`Failed to persist source transcript: ${assetUpdateError.message}`)
  }

  const { data: ingestion, error: ingestionError } = await supabase
    .from('source_ingestions')
    .select('durable_job_id')
    .eq('source_asset_id', assetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (ingestionError) {
    throw new Error(`Failed to resolve transcript job: ${ingestionError.message}`)
  }

  const durableJobId = ingestion?.durable_job_id || assetId
  const { data: currentJob, error: jobReadError } = await supabase
    .from('durable_jobs')
    .select('id, result_metadata')
    .eq('id', durableJobId)
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (jobReadError) {
    throw new Error(`Failed to read transcript job metadata: ${jobReadError.message}`)
  }

  if (currentJob) {
    const { error: jobUpdateError } = await supabase
      .from('durable_jobs')
      .update({
        result_metadata: buildTranscriptResultMetadata(
          currentJob.result_metadata,
          segments,
          transcriptText,
        ),
      })
      .eq('id', currentJob.id)
      .eq('user_id', userId)

    if (jobUpdateError) {
      throw new Error(`Failed to persist transcript job metadata: ${jobUpdateError.message}`)
    }
  }

  const { data: project, error: projectReadError } = await supabase
    .from('projects')
    .select('source_profile')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projectReadError) {
    throw new Error(`Failed to read transcript project: ${projectReadError.message}`)
  }

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({
      source_profile: buildTranscriptSourceProfile(project.source_profile, segments),
    })
    .eq('id', projectId)
    .eq('user_id', userId)

  if (projectUpdateError) {
    throw new Error(`Failed to persist transcript project profile: ${projectUpdateError.message}`)
  }

  return { r2Key, segments, transcriptText }
}
