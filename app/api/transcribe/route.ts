import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import {
  startDirectTranscription,
  persistCompletedTranscript,
} from '@/lib/server/direct-transcription'
import { getAssemblyAITranscriptionStatus } from '@/lib/api/assemblyai'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''

    if (!projectId || !assetId) {
      return NextResponse.json(
        { error: 'projectId and assetId are required' },
        { status: 400 }
      )
    }

    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', assetId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Source asset not found' }, { status: 404 })
    }

    if (!asset.storage_path) {
      return NextResponse.json({ error: 'Asset has no storage path' }, { status: 400 })
    }

    const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
    const sourceUrl = await getPresignedGetUrl(bucket, asset.storage_path)

    const dispatch = await startDirectTranscription({
      userId: user.id,
      projectId,
      assetId,
      sourceUrl,
      bucket,
    })

    return NextResponse.json({ ok: true, ...dispatch })
  } catch (err) {
    console.error('[api/transcribe] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription dispatch failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const assetId = searchParams.get('assetId') || ''
    const projectId = searchParams.get('projectId') || ''

    if (!assetId && !projectId) {
      return NextResponse.json(
        { error: 'assetId or projectId is required' },
        { status: 400 }
      )
    }

    let query = supabase.from('source_assets').select('*').eq('user_id', user.id)
    if (assetId) query = query.eq('id', assetId)
    if (projectId) query = query.eq('project_id', projectId)

    const { data: assets, error } = await query.limit(1)
    if (error || !assets || assets.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const asset = assets[0]

    // Return already-persisted segments without calling the provider again.
    // If a previous completion only updated source_assets, fall through and
    // repair the missing editor payload from the AssemblyAI job.
    if (asset.transcript_status === 'completed') {
      const { data: projectRow } = await supabase
        .from('projects')
        .select('source_profile')
        .eq('id', asset.project_id)
        .single()

      const segments = projectRow?.source_profile?.transcript || []
      if (Array.isArray(segments) && segments.length > 0) {
        return NextResponse.json({
          status: 'completed',
          transcriptText: asset.transcript_text,
          segments,
        })
      }

      // Repair legacy completions that stored only transcript_text on the asset.
      // This keeps existing uploads visible without requiring a provider job id.
      if (
        !asset.transcript_job_id &&
        typeof asset.transcript_text === 'string' &&
        asset.transcript_text.trim()
      ) {
        const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
        const persisted = await persistCompletedTranscript({
          userId: user.id,
          projectId: asset.project_id,
          assetId: asset.id,
          bucket,
          response: {
            id: `legacy-${asset.id}`,
            status: 'completed',
            text: asset.transcript_text,
            audio_duration:
              typeof asset.duration_ms === 'number' ? asset.duration_ms / 1000 : undefined,
          },
        })

        return NextResponse.json({
          status: 'completed',
          transcriptText: persisted.transcriptText,
          segments: persisted.segments,
        })
      }
    }

    // If transcribing and has job id, check AssemblyAI live
    if (asset.transcript_job_id) {
      const statusRes = await getAssemblyAITranscriptionStatus(asset.transcript_job_id)

      if (statusRes.status === 'completed') {
        const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
        const persisted = await persistCompletedTranscript({
          userId: user.id,
          projectId: asset.project_id,
          assetId: asset.id,
          bucket,
          response: statusRes,
        })

        return NextResponse.json({
          status: 'completed',
          transcriptText: persisted.transcriptText,
          segments: persisted.segments,
        })
      }

      if (statusRes.status === 'error') {
        const { error: failureUpdateError } = await supabase
          .from('source_assets')
          .update({
            transcript_status: 'failed',
            transcript_error: statusRes.error || 'AssemblyAI transcription failed',
          })
          .eq('id', asset.id)
          .eq('user_id', user.id)

        if (failureUpdateError) throw failureUpdateError
      }

      return NextResponse.json({
        status: statusRes.status === 'processing' ? 'transcribing' : statusRes.status,
      })
    }

    return NextResponse.json({
      status: asset.transcript_status || 'idle',
    })
  } catch (err) {
    console.error('[api/transcribe] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get transcript status' },
      { status: 500 }
    )
  }
}
