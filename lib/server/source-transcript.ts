import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

import { startAssemblyAITranscription } from '@/lib/api/assemblyai'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import { reserveCompute, settleCompute } from '@/lib/compute/credits'
import type { ComputeConfirmation } from '@/lib/compute/policy'

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
  confirmation,
}: {
  assetId: string
  supabase: SupabaseClient
  force?: boolean
  confirmation?: ComputeConfirmation
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

  if ((asset.transcript_status === 'queued' || asset.transcript_status === 'transcribing') && asset.transcript_job_id) {
    return { status: asset.transcript_status, transcriptJobId: asset.transcript_job_id }
  }

  if (Number.isFinite(Number(asset.duration_ms)) && Number(asset.duration_ms) > MAX_AUTO_TRANSCRIPT_DURATION_MS) {
    return null
  }

  if (!asset.storage_bucket || !asset.storage_path) return null
  // Upload persistence never authorizes paid transcription automatically.
  if (!confirmation) return null

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

  // A missing atomic claim must fail closed; direct updates permit duplicate jobs.
  if (!wonClaim) {
    throw new Error('Transcription is temporarily unavailable. No job was started.')
  }

  let started: Awaited<ReturnType<typeof startAssemblyAITranscription>>
  let reservation: string | null = null
  try {
    reservation = await reserveCompute(asset.user_id, 'transcribe', confirmation, assetId)
    const { error: reservationError } = await supabase.from('source_assets')
      .update({ transcript_credit_request_id: reservation }).eq('id', assetId).eq('transcript_job_id', claimToken)
    if (reservationError) throw new Error('Unable to record transcription reservation.')
    const sourceUrl = await getPresignedGetUrl(asset.storage_bucket, asset.storage_path)
    started = await startAssemblyAITranscription({
      audio_url: sourceUrl,
      speaker_labels: false,
      punctuate: true,
      format_text: true,
      speech_models: ['universal-3-5-pro'],
    })
  } catch (error) {
    if (reservation) await settleCompute(asset.user_id, reservation, 'refunded')
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
    if (reservation) await settleCompute(asset.user_id, reservation, 'refunded')
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
    // Provider accepted this job. Keep reservation for reconciliation; do not
    // refund a running provider job merely because a persistence retry failed.
    throw new Error('Transcription started, but status could not be saved. Contact support with your request ID.')
  }

  return { status: 'queued', transcriptJobId: started.id }
}
