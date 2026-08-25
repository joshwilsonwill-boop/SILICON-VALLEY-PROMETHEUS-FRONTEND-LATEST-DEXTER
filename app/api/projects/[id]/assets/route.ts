import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { after, NextResponse } from 'next/server'

import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import { ProjectService } from '@/lib/projects/service'
import { getPresignedGetUrl } from '@/lib/r2/presigned-url'
import { r2Client } from '@/lib/r2/client'
import { startSourceAssetTranscription } from '@/lib/server/source-transcript'
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

    let asset: any = null
    if (project.sourceAssetId) {
      const { data, error } = await supabase
        .from('source_assets')
        .select('*')
        .eq('id', project.sourceAssetId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (data && !error) asset = data
    }

    if (!asset) {
      const { data, error } = await supabase
        .from('source_assets')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data && !error) asset = data
    }

    if (asset && asset.storage_path) {
      const bucket = asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
      const sourceUrl = await getPresignedGetUrl(bucket, asset.storage_path)
      return NextResponse.json({ success: true, asset, source: { url: sourceUrl, expiresIn: 3600 } })
    }

    if (project.thumbnailUrl) {
      return NextResponse.json({ success: true, source: { url: project.thumbnailUrl, expiresIn: 3600 } })
    }

    return NextResponse.json({ error: 'Source asset record not found' }, { status: 404 })
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

    let analysisDispatch: {callId: string; status: string} | null = null

    // Kick off AssemblyAI transcription immediately for videos of sensible
    // length — this must not wait for the chat system or the editor. Best-effort:
    // the asset is already durable, so a later /transcript call can start it.
    let transcriptDispatch: {status: string; transcriptJobId?: string} | null = null
    if (committed?.asset?.id && String(committed.asset.mime_type).startsWith('video/')) {
      const committedAssetId = committed.asset.id
      transcriptDispatch = { status: 'scheduled' }
      after(async () => {
        try {
          await startSourceAssetTranscription({ assetId: committedAssetId, supabase })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Transcription could not be started.'
          // Persist the failure so the editor surfaces a real message instead of
          // an infinite "transcribing" spinner when the background dispatch dies.
          // Only write when nothing else has started, so a frontend-launched job
          // that raced past the failed dispatch is never overwritten.
          try {
            await supabase
              .from('source_assets')
              .update({
                transcript_status: 'failed',
                transcript_error: message,
              })
              .eq('id', committedAssetId)
              .or('transcript_status.is.null,transcript_status.eq.idle')
          } catch (persistError) {
            console.error('[api/projects/[id]/assets] transcript failure persistence error:', persistError)
          }
          console.error('[api/projects/[id]/assets] transcript dispatch failed:', error)
        }
      })
    }

    return NextResponse.json({...committed, analysisDispatch, transcriptDispatch})
  } catch (err) {
    console.error('[api/projects/[id]/assets] POST error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to commit source asset',
      code: 'SOURCE_COMMIT_FAILED', retryable: true,
    }, { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 })
  }
}
