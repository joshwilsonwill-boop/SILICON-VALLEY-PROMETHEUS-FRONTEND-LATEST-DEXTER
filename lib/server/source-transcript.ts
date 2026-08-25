import type { SupabaseClient } from '@supabase/supabase-js'

import { startAssemblyAITranscription } from '@/lib/api/assemblyai'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'

/**
 * Source videos longer than this are treated as too long to auto-transcribe
 * on upload (the user-specified ~40 minute ceiling).
 */
export const MAX_AUTO_TRANSCRIPT_DURATION_MS = 40 * 60 * 1000

/**
 * Kicks off an AssemblyAI transcription for a source asset straight after a
 * video is committed to storage. Returns the transcript job state, or null when
 * the asset is not eligible (not a video, too long, or already transcribed).
 *
 * Server-side only. Never call this from the browser.
 */
export async function startSourceAssetTranscription({
  assetId,
  supabase,
  force = false,
}: {
  assetId: string
  supabase: SupabaseClient
  force?: boolean
}) {
  const { data: asset, error } = await supabase
    .from('source_assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (error || !asset) return null

  if (!String(asset.mime_type ?? '').startsWith('video/')) return null

  if (asset.transcript_status === 'completed' && asset.transcript_r2_key) {
    return { status: 'completed', transcriptJobId: asset.transcript_job_id }
  }

  if (!force && (asset.transcript_status === 'queued' || asset.transcript_status === 'transcribing') && asset.transcript_job_id) {
    return { status: asset.transcript_status, transcriptJobId: asset.transcript_job_id }
  }

  if (Number.isFinite(Number(asset.duration_ms)) && Number(asset.duration_ms) > MAX_AUTO_TRANSCRIPT_DURATION_MS) {
    return null
  }

  if (!asset.storage_bucket || !asset.storage_path) return null

  const sourceUrl = await getPresignedGetUrl(asset.storage_bucket, asset.storage_path)
  const started = await startAssemblyAITranscription({
    audio_url: sourceUrl,
    speaker_labels: false,
    punctuate: true,
    format_text: true,
    speech_models: ['universal-2'],
  })

  if (!started.id) return null

  const { error: updateError } = await supabase
    .from('source_assets')
    .update({
      transcript_job_id: started.id,
      transcript_provider: 'assemblyai',
      transcript_status: 'queued',
      transcript_started_at: new Date().toISOString(),
      transcript_error: null,
    })
    .eq('id', assetId)

  if (updateError) return null

  return { status: 'queued', transcriptJobId: started.id }
}
