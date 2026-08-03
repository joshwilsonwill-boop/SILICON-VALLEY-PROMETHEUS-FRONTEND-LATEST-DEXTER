import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { startAssemblyAITranscription } from '@/lib/api/assemblyai'
import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import { ProjectService } from '@/lib/projects/service'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import { r2Client } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await ProjectService.getProject(projectId)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (!project.sourceAssetId) return NextResponse.json({ error: 'Project has no source asset' }, { status: 404 })

    const { data: asset, error } = await supabase.from('source_assets').select('*')
      .eq('id', project.sourceAssetId).eq('project_id', projectId).eq('user_id', user.id).single()
    if (error || !asset) return NextResponse.json({ error: 'Source asset record not found' }, { status: 404 })
    if (!asset.storage_path) return NextResponse.json({ error: 'Asset storage path is missing' }, { status: 500 })
    const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
    const sourceUrl = await getPresignedGetUrl(bucket, asset.storage_path)
    return NextResponse.json({ asset, source: { url: sourceUrl, expiresIn: 3600 } })
  } catch (err) {
    console.error('[api/projects/[id]/assets] GET error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to recover source asset' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    const uploadSessionId = typeof body.uploadSessionId === 'string' ? body.uploadSessionId.trim() : ''
    if (!uploadSessionId) {
      return NextResponse.json({ error: 'Missing uploadSessionId.', code: 'UPLOAD_SESSION_REQUIRED', retryable: false }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const { data: session, error: sessionError } = await supabase.from('source_upload_sessions').select('*')
      .eq('id', uploadSessionId).eq('project_id', projectId).eq('user_id', user.id).single()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Upload session not found.', code: 'UPLOAD_SESSION_NOT_FOUND', retryable: false }, { status: 404 })
    }
    if (!['verified', 'committed'].includes(session.status)) {
      return NextResponse.json({ error: 'Upload must be verified before commit.', code: 'UPLOAD_SESSION_NOT_COMMITTABLE', retryable: false }, { status: 409 })
    }

    const head = await r2Client.send(new HeadObjectCommand({ Bucket: session.bucket, Key: session.object_key }))
    const metadata = head.Metadata ?? {}
    const actualSize = Number(head.ContentLength)
    if (
      actualSize !== Number(session.expected_size_bytes)
      || metadata['upload-session-id'] !== session.id
      || metadata['asset-id'] !== session.asset_id
      || metadata['project-id'] !== projectId
      || metadata['user-id'] !== user.id
      || (head.ETag ?? '').replaceAll('"', '') !== String(session.verified_etag ?? '').replaceAll('"', '')
    ) {
      return NextResponse.json({ error: 'R2 object no longer matches its verified reservation.', code: 'SOURCE_COMMIT_WITNESS_MISMATCH', retryable: false }, { status: 409 })
    }

    const { data: committed, error: commitError } = await supabase.rpc('maul_commit_source_revision', {
      p_session_id: uploadSessionId,
      p_duration_ms: Number.isFinite(Number(body.durationMs)) ? Math.max(0, Math.round(Number(body.durationMs))) : null,
      p_width: Number.isFinite(Number(body.width)) ? Math.max(0, Math.round(Number(body.width))) : null,
      p_height: Number.isFinite(Number(body.height)) ? Math.max(0, Math.round(Number(body.height))) : null,
      p_profile: body.profile && typeof body.profile === 'object' ? body.profile : {},
    })
    if (commitError) {
      if (commitError.message?.includes('STORAGE_QUOTA_EXCEEDED')) {
        const { error: abortError } = await supabase.rpc('maul_abort_source_upload', { p_session_id: uploadSessionId })
        if (abortError) console.warn('[SOURCE_UPLOAD_ABORT_AFTER_QUOTA]', { uploadSessionId, error: abortError })
        await r2Client.send(new DeleteObjectCommand({ Bucket: session.bucket, Key: session.object_key })).catch(() => undefined)
      }
      return sourceControlPlaneErrorResponse(commitError, 'SOURCE_COMMIT_FAILED', 'Failed to commit source revision.')
    }

    const asset = committed?.asset
    if (asset && (String(asset.mime_type).startsWith('video/') || String(asset.mime_type).startsWith('audio/'))) {
      const { data: claim, error: claimError } = await supabase.from('source_assets').update({
        transcript_status: 'transcribing', transcript_error: null, transcript_started_at: new Date().toISOString(),
      }).eq('id', asset.id).eq('transcript_status', 'idle').is('transcript_job_id', null).select('id').maybeSingle()
      if (claimError) throw claimError
      if (claim) {
        try {
          if (!process.env.ASSEMBLYAI_API_KEY) {
            await supabase.from('source_assets').update({ transcript_status: 'skipped' }).eq('id', asset.id)
          } else {
            const sourceUrl = await getPresignedGetUrl(asset.storage_bucket, asset.storage_path)
            const transcript = await startAssemblyAITranscription({ audio_url: sourceUrl })
            await supabase.from('source_assets').update({
              transcript_status: 'queued', transcript_job_id: transcript.id, transcript_provider: 'assemblyai',
            }).eq('id', asset.id).eq('transcript_status', 'transcribing')
          }
        } catch (error) {
          console.error('[api/projects/[id]/assets] transcription start failed:', error)
          await supabase.from('source_assets').update({
            transcript_status: 'failed', transcript_error: error instanceof Error ? error.message : 'Unknown error',
          }).eq('id', asset.id).eq('transcript_status', 'transcribing')
        }
      }
    }

    return NextResponse.json(committed)
  } catch (err) {
    console.error('[api/projects/[id]/assets] POST error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to commit source asset',
      code: 'SOURCE_COMMIT_FAILED', retryable: true,
    }, { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 })
  }
}
