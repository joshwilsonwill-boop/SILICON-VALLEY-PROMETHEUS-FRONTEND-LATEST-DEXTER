import { AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { requireOwnedProjectSourceKey } from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'

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
    if (!uploadId) {
      return NextResponse.json({ error: 'Missing upload id.' }, { status: 400 })
    }

    let alreadyFinalized = false
    try {
      await r2Client.send(
        new AbortMultipartUploadCommand({
          Bucket: keyContext.bucket,
          Key: keyContext.key,
          UploadId: uploadId,
        }),
      )
    } catch (error) {
      // Abort is intentionally idempotent: an already-completed/already-aborted
      // upload has no orphaned parts left to clean up.
      if (!isNoSuchUpload(error)) throw error
      alreadyFinalized = true
    }

    return NextResponse.json({ success: true, alreadyFinalized })
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/abort] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to abort multipart upload' },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
