import { CompleteMultipartUploadCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { requireOwnedProjectSourceKey } from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'

type CompletedPartInput = {
  ETag?: unknown
  PartNumber?: unknown
  eTag?: unknown
  partNumber?: unknown
}

function normalizeCompletedParts(parts: unknown) {
  if (!Array.isArray(parts) || parts.length === 0) return null

  return parts
    .map((part: CompletedPartInput) => ({
      ETag: typeof (part.ETag ?? part.eTag) === 'string' ? String(part.ETag ?? part.eTag) : '',
      PartNumber: Number(part.PartNumber ?? part.partNumber),
    }))
    .filter((part) => part.ETag && Number.isInteger(part.PartNumber) && part.PartNumber > 0)
    .sort((a, b) => a.PartNumber - b.PartNumber)
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
      return NextResponse.json({ error: keyContext.error }, { status: keyContext.status })
    }

    const uploadId = typeof body.uploadId === 'string' ? body.uploadId.trim() : ''
    const parts = normalizeCompletedParts(body.parts)
    const expectedSizeBytes = Number(body.sizeBytes)

    if (!uploadId || !parts || !Number.isSafeInteger(expectedSizeBytes) || expectedSizeBytes <= 0) {
      return NextResponse.json({ error: 'Missing upload id, completed parts, or expected size.' }, { status: 400 })
    }

    let response: { Key?: string; Location?: string } | null = null
    try {
      response = await r2Client.send(
        new CompleteMultipartUploadCommand({
        Bucket: keyContext.bucket,
        Key: keyContext.key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      }),
      )
    } catch (error) {
      // Completion is ambiguous across a dropped connection. If R2 says the upload
      // no longer exists, HEAD is the source of truth: the prior request may have won.
      if (!isNoSuchUpload(error)) throw error
    }

    const head = await r2Client.send(
      new HeadObjectCommand({
        Bucket: keyContext.bucket,
        Key: keyContext.key,
      }),
    )
    const actualSizeBytes = Number(head.ContentLength)
    const metadata = head.Metadata ?? {}
    const metadataSizeBytes = Number(metadata['size-bytes'])

    if (actualSizeBytes !== expectedSizeBytes || metadataSizeBytes !== expectedSizeBytes) {
      return NextResponse.json(
        {
          error: 'Completed object size does not match the upload reservation.',
          code: 'UPLOAD_SIZE_MISMATCH',
          retryable: false,
        },
        { status: 409 },
      )
    }

    if (metadata['project-id'] !== keyContext.projectId || metadata['user-id'] !== keyContext.userId) {
      return NextResponse.json(
        {
          error: 'Completed object identity does not match the authenticated project.',
          code: 'UPLOAD_IDENTITY_MISMATCH',
          retryable: false,
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      bucket: keyContext.bucket,
      etag: head.ETag,
      key: response?.Key ?? keyContext.key,
      location: response?.Location,
      sizeBytes: actualSizeBytes,
      url: `${process.env.NEXT_PUBLIC_R2_SOURCE_BASE_URL ?? 'https://assets.prometheusstudio.tech'}/${keyContext.key}`,
      verified: true,
    })
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/complete] POST error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to complete multipart upload',
        code: 'UPLOAD_COMPLETE_FAILED',
        retryable: true,
      },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
