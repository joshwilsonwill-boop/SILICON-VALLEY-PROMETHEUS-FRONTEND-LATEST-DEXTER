import { AbortMultipartUploadCommand, CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import {
  PROJECT_SOURCE_MULTIPART_PART_SIZE,
  requireProjectSourceUploadContext,
} from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

type UploadSession = {
  id: string
  asset_id: string
  project_id: string
  status: string
  bucket: string
  object_key: string
  mime_type: string
  expected_size_bytes: number | string
  multipart_upload_id: string | null
  expires_at: string
}

function responseFor(context: Awaited<ReturnType<typeof requireProjectSourceUploadContext>>, session: UploadSession) {
  if ('error' in context) throw new Error('Invalid upload context')
  return NextResponse.json({
    asset: {
      id: context.assetId,
      projectId: context.projectId,
      storageProvider: 'r2',
      bucket: session.bucket,
      objectKey: session.object_key,
      mimeType: session.mime_type,
      sizeBytes: Number(session.expected_size_bytes),
      uploadSessionId: session.id,
    },
    upload: {
      sessionId: session.id,
      key: session.object_key,
      uploadId: session.multipart_upload_id,
      partSize: PROJECT_SOURCE_MULTIPART_PART_SIZE,
      expiresAt: session.expires_at,
      status: session.status,
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    const context = await requireProjectSourceUploadContext(projectId, {
      assetId: body.assetId,
      contentType: body.contentType ?? body.mimeType,
      filename: body.filename,
      sizeBytes: body.sizeBytes,
    })
    if ('error' in context) {
      return NextResponse.json({ error: context.error, code: 'INVALID_UPLOAD_REQUEST', retryable: false }, { status: context.status })
    }

    const supabase = await createClient()
    const { data: reserved, error: reserveError } = await supabase.rpc('maul_reserve_source_upload', {
      p_project_id: context.projectId,
      p_asset_id: context.assetId,
      p_client_request_id: context.assetId,
      p_filename: context.filename,
      p_mime_type: context.contentType,
      p_size_bytes: context.sizeBytes,
      p_bucket: context.bucket,
      p_object_key: context.key,
      p_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    if (reserveError) {
      return sourceControlPlaneErrorResponse(reserveError, 'UPLOAD_RESERVATION_FAILED', 'Failed to reserve source upload.')
    }
    let session = reserved as UploadSession
    if (session.status === 'aborted' || session.status === 'expired') {
      return NextResponse.json({ error: 'This upload session is no longer active.', code: 'UPLOAD_SESSION_INACTIVE', retryable: false }, { status: 409 })
    }
    if (session.multipart_upload_id || session.status === 'committed') return responseFor(context, session)

    const created = await r2Client.send(new CreateMultipartUploadCommand({
      Bucket: session.bucket,
      Key: session.object_key,
      ContentType: session.mime_type,
      Metadata: {
        'asset-id': context.assetId,
        'upload-session-id': session.id,
        'original-filename': context.filename,
        'size-bytes': String(context.sizeBytes),
        'project-id': context.projectId,
        'user-id': context.userId,
      },
    }))
    if (!created.UploadId) {
      return NextResponse.json({ error: 'R2 did not return an upload id.', code: 'R2_UPLOAD_ID_MISSING', retryable: true }, { status: 502 })
    }

    const { data: attached, error: attachError } = await supabase.rpc('maul_attach_source_multipart', {
      p_session_id: session.id,
      p_multipart_upload_id: created.UploadId,
    })
    if (attachError) {
      await r2Client.send(new AbortMultipartUploadCommand({
        Bucket: session.bucket,
        Key: session.object_key,
        UploadId: created.UploadId,
      })).catch(() => undefined)

      if (attachError.message?.includes('MULTIPART_ALREADY_ATTACHED')) {
        const { data: racedSession } = await supabase
          .from('source_upload_sessions')
          .select('*')
          .eq('id', session.id)
          .single()
        if (racedSession?.multipart_upload_id) return responseFor(context, racedSession as UploadSession)
      }
      return sourceControlPlaneErrorResponse(attachError, 'UPLOAD_ATTACH_FAILED', 'Failed to attach the R2 multipart upload.')
    }
    session = attached as UploadSession
    return responseFor(context, session)
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/initiate] POST error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to initiate multipart upload',
      code: 'UPLOAD_INITIATE_FAILED',
      retryable: true,
    }, { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 })
  }
}
