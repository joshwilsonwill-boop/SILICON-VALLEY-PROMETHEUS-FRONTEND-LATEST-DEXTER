import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

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

  // Claim the row before contacting AssemblyAI. Upload completion and the
  // editor can both request transcription; only one caller may win this
  // compare-and-set claim for the asset.
  const claimToken = `claim:${randomUUID()}`
  let wonClaim = false

  try {
    const { data: claim, error: claimError } = await supabase.rpc('maul_claim_source_asset_transcription', {
      p_asset_id: assetId,
      p_claim_token: claimToken,
      p_force: force,
    })

    if (!claimError && claim && typeof claim === 'object') {
      const claimResult = claim as { claimed?: boolean; status?: string; transcriptJobId?: string }
      if (claimResult.claimed) {
        wonClaim = true
      } else {
        return {
          status: claimResult.status ?? asset.transcript_status ?? 'queued',
          transcriptJobId: claimResult.transcriptJobId ?? asset.transcript_job_id,
        }
      }
    } else if (claimError) {
      console.warn('[source-transcript] RPC claim failed, falling back to direct table update:', claimError.message)
    }
  } catch (err) {
    console.warn('[source-transcript] RPC invocation exception, falling back to direct update:', err)
  }

  // Fallback to direct compare-and-set if RPC function is not installed in database
  if (!wonClaim) {
    const { error: directClaimError } = await supabase
      .from('source_assets')
      .update({
        transcript_job_id: claimToken,
        transcript_provider: 'assemblyai',
        transcript_status: 'queued',
        transcript_started_at: new Date().toISOString(),
        transcript_error: null,
      })
      .eq('id', assetId)

    if (directClaimError) {
      console.error('[source-transcript] Direct claim failed:', directClaimError)
      return null
    }
  }

  let started: Awaited<ReturnType<typeof startAssemblyAITranscription>>
  try {
    const sourceUrl = await getPresignedGetUrl(asset.storage_bucket, asset.storage_path)
    started = await startAssemblyAITranscription({
      audio_url: sourceUrl,
      speaker_labels: false,
      punctuate: true,
      format_text: true,
      speech_models: ['universal-3-5-pro'],
    })
  } catch (error) {
    await supabase
      .from('source_assets')
      .update({
        transcript_status: 'failed',
        transcript_error: error instanceof Error ? error.message : 'AssemblyAI dispatch failed.',
      })
      .eq('id', assetId)
      .eq('transcript_job_id', claimToken)
    throw error
  }

  if (!started.id) {
    await supabase.from('source_assets').update({ transcript_status: 'failed', transcript_error: 'AssemblyAI did not return a job ID.' }).eq('id', assetId).eq('transcript_job_id', claimToken)
    return null
  }

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
    .eq('transcript_job_id', claimToken)

  if (updateError) {
    await supabase
      .from('source_assets')
      .update({
        transcript_status: 'failed',
        transcript_error: updateError.message || 'Failed to save the AssemblyAI job ID.',
      })
      .eq('id', assetId)
      .eq('transcript_job_id', claimToken)
    return null
  }

  return { status: 'queued', transcriptJobId: started.id }
}
