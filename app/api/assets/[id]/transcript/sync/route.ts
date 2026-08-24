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
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch asset record
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
    const assemblyResponse = await getAssemblyAITranscriptionStatus(asset.transcript_job_id)

    if (assemblyResponse.status === 'queued' || assemblyResponse.status === 'processing') {
      // Update DB if it moved from queued to transcribing
      const nextStatus = assemblyResponse.status === 'processing' ? 'transcribing' : 'queued'
      if (asset.transcript_status !== nextStatus) {
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
      
      await uploadTranscriptToR2(bucket, r2Key, assemblyResponse)

      // 4. Update Supabase
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
    console.error('[api/assets/[id]/transcript/sync] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync transcript' },
      { status: 500 }
    )
  }
}
