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
      // 3. Normalize and save to R2
      const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
      const r2Key = R2Keys.transcript(user.id, asset.project_id, assetId)
      
      stage = 'upload_transcript_to_r2'
      await uploadTranscriptToR2(bucket, r2Key, assemblyResponse)

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
          transcript_segments: assemblyTranscriptToSegments(assemblyResponse as unknown as Record<string, unknown>),
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
