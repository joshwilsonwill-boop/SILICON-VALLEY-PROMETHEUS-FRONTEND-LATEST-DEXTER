import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import {
  startDirectTranscription,
  normalizeAssemblyAITranscript,
} from '@/lib/server/direct-transcription'
import { getAssemblyAITranscriptionStatus } from '@/lib/api/assemblyai'
import { uploadTranscriptToR2 } from '@/lib/r2/upload-transcript'
import { R2Keys } from '@/lib/r2/keys'

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

    // If completed and we have transcript text / status
    if (asset.transcript_status === 'completed') {
      const { data: projectRow } = await supabase
        .from('projects')
        .select('source_profile')
        .eq('id', asset.project_id)
        .single()

      const segments = projectRow?.source_profile?.transcript || []
      return NextResponse.json({
        status: 'completed',
        transcriptText: asset.transcript_text,
        segments,
      })
    }

    // If transcribing and has job id, check AssemblyAI live
    if (asset.transcript_job_id) {
      const statusRes = await getAssemblyAITranscriptionStatus(asset.transcript_job_id)

      if (statusRes.status === 'completed') {
        const segments = normalizeAssemblyAITranscript(statusRes)
        const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
        const r2Key = R2Keys.transcript(user.id, asset.project_id, asset.id)

        await uploadTranscriptToR2(bucket, r2Key, statusRes).catch(() => undefined)

        await supabase
          .from('source_assets')
          .update({
            transcript_status: 'completed',
            transcript_r2_key: r2Key,
            transcript_completed_at: new Date().toISOString(),
            transcript_text: statusRes.text || '',
          })
          .eq('id', asset.id)

        await supabase
          .from('projects')
          .update({
            source_profile: { transcript: segments },
          })
          .eq('id', asset.project_id)

        return NextResponse.json({
          status: 'completed',
          transcriptText: statusRes.text,
          segments,
        })
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
