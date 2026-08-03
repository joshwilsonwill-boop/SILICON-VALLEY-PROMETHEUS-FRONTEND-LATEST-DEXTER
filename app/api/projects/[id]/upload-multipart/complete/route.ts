import { CompleteMultipartUploadCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import { requireOwnedProjectSourceKey } from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

type CompletedPartInput = {
  ETag?: unknown
  PartNumber?: unknown
  eTag?: unknown
  partNumber?: unknown
}

function normalizeCompletedParts(parts: unknown) {
  if (!Array.isArray(parts) || parts.length === 0) return null
  const normalized = parts.map((part: CompletedPartInput) => ({
    ETag: typeof (part.ETag ?? part.eTag) === 'string' ? String(part.ETag ?? part.eTag) : '',
    PartNumber: Number(part.PartNumber ?? part.partNumber),
  })).sort((a, b) => a.PartNumber - b.PartNumber)
  if (
    normalized.some((part) => !part.ETag || !Number.isInteger(part.PartNumber) || part.PartNumber <= 0)
    || normalized.some((part, index) => part.PartNumber !== index + 1)
  ) return null
  return normalized
}

function isNoSuchUpload(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } }
  return candidate.name === 'NoSuchUpload'
    || candidate.Code === 'NoSuchUpload'
    || candidate.$metadata?.httpStatusCode === 404
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    const keyContext = await requireOwnedProjectSourceKey(projectId, body.key)
    if ('error' in keyContext) {
      return NextResponse.json({ error: keyContext.error, code: 'INVALID_SOURCE_KEY', retryable: false }, { status: keyContext.status })
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId.trim() : ''
    const expectedSizeBytes = Number(body.sizeBytes)
    const parts = normalizeCompletedParts(body.parts)
    if (!sessionId || !uploadId || !parts || !Number.isSafeInteger(expectedSizeBytes) || expectedSizeBytes <= 0) {
      return NextResponse.json({ error: 'Missing session, upload id, completed parts, or expected size.', code: 'INVALID_COMPLETE_REQUEST', retryable: false }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: session, error: sessionError } = await supabase
      .from('source_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('project_id', projectId)
      .single()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Upload session not found.', code: 'UPLOAD_SESSION_NOT_FOUND', retryable: false }, { status: 404 })
    }
    if (
      session.object_key !== keyContext.key
      || session.multipart_upload_id !== uploadId
      || Number(session.expected_size_bytes) !== expectedSizeBytes
    ) {
      return NextResponse.json({ error: 'Multipart completion does not match its reservation.', code: 'UPLOAD_SESSION_MISMATCH', retryable: false }, { status: 409 })
    }
    if (session.status === 'aborted' || session.status === 'expired') {
      return NextResponse.json({ error: 'Upload session is no longer active.', code: 'UPLOAD_SESSION_INACTIVE', retryable: false }, { status: 409 })
    }

    let completion: { Key?: string; Location?: string } | null = null
    if (session.status === 'uploading') {
      try {
        completion = await r2Client.send(new CompleteMultipartUploadCommand({
          Bucket: keyContext.bucket,
          Key: keyContext.key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }))
      } catch (error) {
        // A lost response can leave R2 complete while the client believes it failed.
        // NoSuchUpload is resolved below by authoritative HEAD verification.
        if (!isNoSuchUpload(error)) throw error
      }
    }

    const head = await r2Client.send(new HeadObjectCommand({
      Bucket: keyContext.bucket,
      Key: keyContext.key,
    }))
    const metadata = head.Metadata ?? {}
    const actualSizeBytes = Number(head.ContentLength)
    if (actualSizeBytes !== expectedSizeBytes || Number(metadata['size-bytes']) !== expectedSizeBytes) {
      return NextResponse.json({ error: 'Completed object size does not match its reservation.', code: 'UPLOAD_SIZE_MISMATCH', retryable: false }, { status: 409 })
    }
    if (
      metadata['upload-session-id'] !== sessionId
      || metadata['asset-id'] !== session.asset_id
      || metadata['project-id'] !== keyContext.projectId
      || metadata['user-id'] !== keyContext.userId
    ) {
      return NextResponse.json({ error: 'Completed object identity does not match its reservation.', code: 'UPLOAD_IDENTITY_MISMATCH', retryable: false }, { status: 409 })
    }

    const { data: verified, error: verifyError } = await supabase.rpc('maul_verify_source_upload', {
      p_session_id: sessionId,
      p_etag: head.ETag ?? '',
      p_size_bytes: actualSizeBytes,
    })
    if (verifyError) {
      return sourceControlPlaneErrorResponse(verifyError, 'UPLOAD_VERIFY_FAILED', 'Failed to verify the completed source upload.')
    }

    return NextResponse.json({
      sessionId,
      sessionStatus: verified.status,
      bucket: keyContext.bucket,
      etag: head.ETag,
      key: completion?.Key ?? keyContext.key,
      location: completion?.Location,
      sizeBytes: actualSizeBytes,
      verified: true,
    })
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/complete] POST error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to complete multipart upload',
      code: 'UPLOAD_COMPLETE_FAILED',
      retryable: true,
    }, { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 })
  }
}
