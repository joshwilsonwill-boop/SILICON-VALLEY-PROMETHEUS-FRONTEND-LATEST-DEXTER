import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAssemblyAITranscriptionStatus } from '@/lib/api/assemblyai'
import { persistCompletedTranscript } from '@/lib/server/direct-transcription'

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

    // Return an already-complete editor payload when all persistence steps ran.
    // Otherwise continue to AssemblyAI below to repair partial legacy writes.
    if (asset.transcript_status === 'completed') {
      const { data: project } = await supabase
        .from('projects')
        .select('source_profile')
        .eq('id', asset.project_id)
        .eq('user_id', user.id)
        .single()
      const segments = project?.source_profile?.transcript
      if (Array.isArray(segments) && segments.length > 0) {
        return NextResponse.json({
          status: 'completed',
          r2Key: asset.transcript_r2_key,
          transcriptText: asset.transcript_text || '',
          segments,
          segmentsCount: segments.length,
        })
      }
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
      const persisted = await persistCompletedTranscript({
        userId: user.id,
        projectId: asset.project_id,
        assetId,
        bucket: asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources',
        response: assemblyResponse,
      })

      return NextResponse.json({
        status: 'completed',
        r2Key: persisted.r2Key,
        transcriptText: persisted.transcriptText,
        segments: persisted.segments,
        segmentsCount: persisted.segments.length,
      })
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
