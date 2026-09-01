import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAssemblyAITranscriptionStatus } from '@/lib/api/assemblyai'
import { uploadTranscriptToR2 } from '@/lib/r2/upload-transcript'
import { R2Keys } from '@/lib/r2/keys'
import { assemblyTranscriptToSegments } from '@/lib/r2/assembly-transcript'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let assetId = 'unknown'
  let stage = 'resolve_request'
  try {
    const { id } = await params
    assetId = id
    stage = 'authenticate'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch asset record
    stage = 'load_asset'
    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (!asset.transcript_job_id) {
      return NextResponse.json({ error: 'Asset has no transcript job ID' }, { status: 400 })
    }

    // If already completed, return current state
    if (asset.transcript_status === 'completed') {
      return NextResponse.json({ status: 'completed', r2Key: asset.transcript_r2_key })
    }

    // If still in the middle of being claimed, wait or reset if stale
    if (asset.transcript_job_id.startsWith('claim:')) {
      const startedAt = asset.transcript_started_at ? Date.parse(asset.transcript_started_at) : NaN
      const isFresh = Number.isFinite(startedAt) && (Date.now() - startedAt < 45_000)
      if (isFresh) {
        return NextResponse.json({ status: 'queued' })
      }
      await supabase
        .from('source_assets')
        .update({ transcript_status: 'idle', transcript_error: null })
        .eq('id', assetId)
        .eq('transcript_job_id', asset.transcript_job_id)
      return NextResponse.json({ status: 'idle' })
    }

    // 2. Poll AssemblyAI
    stage = 'poll_assemblyai'
    const assemblyResponse = await getAssemblyAITranscriptionStatus(asset.transcript_job_id)

    if (assemblyResponse.status === 'queued' || assemblyResponse.status === 'processing') {
      // Update DB if it moved from queued to transcribing
      const nextStatus = assemblyResponse.status === 'processing' ? 'transcribing' : 'queued'
      if (asset.transcript_status !== nextStatus) {
        stage = 'update_inflight_status'
        await supabase
          .from('source_assets')
          .update({ transcript_status: nextStatus })
          .eq('id', assetId)
      }
      return NextResponse.json({ status: nextStatus })
    }

    if (assemblyResponse.status === 'completed') {
      const segments = assemblyTranscriptToSegments(assemblyResponse as unknown as Record<string, unknown>)
      if (segments.length === 0) {
        const providerText = typeof assemblyResponse.text === 'string' ? assemblyResponse.text.trim() : ''
        const errorMessage = providerText
          ? 'AssemblyAI completed without timed transcript data. Please retry transcription.'
          : 'AssemblyAI completed without transcript text. Please retry transcription.'
        stage = 'persist_empty_provider_result'
        await supabase
          .from('source_assets')
          .update({ transcript_status: 'failed', transcript_error: errorMessage, transcript_synced_at: new Date().toISOString() })
          .eq('id', assetId)
          .eq('transcript_job_id', asset.transcript_job_id)
        return NextResponse.json({ status: 'failed', error: errorMessage }, { status: 422 })
      }
      // 3. Normalize and save to R2 (non-blocking fallback)
      const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
      const r2Key = R2Keys.transcript(user.id, asset.project_id, assetId)
      
      stage = 'upload_transcript_to_r2'
      try {
        await uploadTranscriptToR2(bucket, r2Key, assemblyResponse)
      } catch (r2Err) {
        console.warn('[api/assets/[id]/transcript/sync] R2 transcript upload warning (non-fatal, continuing to save segments to database):', r2Err)
      }

      // 4. Update Supabase
      stage = 'persist_transcript'
      const { error: updateError } = await supabase
        .from('source_assets')
        .update({
          transcript_status: 'completed',
          transcript_r2_key: r2Key,
          transcript_completed_at: new Date().toISOString(),
          transcript_synced_at: new Date().toISOString(),
          transcript_error: null,
          transcript_segments: segments,
          // Store a tiny preview if useful, otherwise leave null
          transcript_text: assemblyResponse.text?.slice(0, 500) || null
        })
        .eq('id', assetId)

      if (updateError) throw updateError

      return NextResponse.json({ status: 'completed', r2Key })
    }

    if (assemblyResponse.status === 'error') {
      stage = 'persist_provider_error'
      await supabase
        .from('source_assets')
        .update({
          transcript_status: 'failed',
          transcript_error: assemblyResponse.error || 'AssemblyAI job failed'
        })
        .eq('id', assetId)
      
      return NextResponse.json({ status: 'failed', error: assemblyResponse.error })
    }

    return NextResponse.json({ status: asset.transcript_status })

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to sync transcript'
    console.error('[api/assets/[id]/transcript/sync] POST error:', { assetId, stage, error, err })
    return NextResponse.json(
      { error, stage },
      { status: 500 }
    )
  }
}
