import { PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { NextResponse } from 'next/server'

import { r2Client } from '@/lib/r2/client'
import { requireProjectSourceUploadContext } from '@/lib/r2/project-source-multipart'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const encodedFilename = req.headers.get('x-file-name')?.trim()
    const mimeType = req.headers.get('x-mime-type')?.trim()
    const providedAssetId = req.headers.get('x-asset-id')?.trim()
    const sizeBytesHeader = req.headers.get('x-file-size')?.trim()
    const filename = encodedFilename ? decodeURIComponent(encodedFilename) : null

    if (!filename || !mimeType || !providedAssetId || !req.body) {
      return NextResponse.json({ error: 'Missing upload payload or metadata' }, { status: 400 })
    }

    const context = await requireProjectSourceUploadContext(projectId, {
      assetId: providedAssetId,
      contentType: mimeType,
      filename,
      sizeBytes: sizeBytesHeader,
    })

    if ('error' in context) {
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    await r2Client.send(
      new PutObjectCommand({
        Bucket: context.bucket,
        Key: context.key,
        Body: Readable.fromWeb(req.body as unknown as NodeReadableStream),
        ContentType: context.contentType,
      }),
    )

    return NextResponse.json({
      asset: {
        id: context.assetId,
        projectId,
        storageProvider: 'r2',
        bucket: context.bucket,
        objectKey: context.key,
        mimeType: context.contentType,
        sizeBytes: context.sizeBytes,
      },
    })
  } catch (err) {
    console.error('[api/projects/[id]/upload-source] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload source to R2' },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 },
    )
  }
}
