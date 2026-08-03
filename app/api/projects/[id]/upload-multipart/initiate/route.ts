import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import {
  PROJECT_SOURCE_MULTIPART_PART_SIZE,
  requireProjectSourceUploadContext,
} from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'

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
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    const response = await r2Client.send(
      new CreateMultipartUploadCommand({
        Bucket: context.bucket,
        Key: context.key,
        ContentType: context.contentType,
        Metadata: {
          'asset-id': context.assetId,
          'original-filename': context.filename,
          'size-bytes': String(context.sizeBytes),
          'project-id': context.projectId,
          'user-id': context.userId,
        },
      }),
    )

    if (!response.UploadId) {
      return NextResponse.json({ error: 'R2 did not return an upload id.' }, { status: 502 })
    }

    return NextResponse.json({
      asset: {
        id: context.assetId,
        projectId: context.projectId,
        storageProvider: 'r2',
        bucket: context.bucket,
        objectKey: context.key,
        mimeType: context.contentType,
        sizeBytes: context.sizeBytes,
      },
      upload: {
        key: context.key,
        uploadId: response.UploadId,
        partSize: PROJECT_SOURCE_MULTIPART_PART_SIZE,
      },
    })
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/initiate] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to initiate multipart upload' },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
