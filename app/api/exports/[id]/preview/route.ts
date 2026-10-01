import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { ExportService } from '@/lib/exports/service'
import { r2Client } from '@/lib/r2/client'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const projectExport = await ExportService.getExport(id)

    if (projectExport.status !== 'completed' || !projectExport.storagePath) {
      return NextResponse.json({ error: 'Export not ready' }, { status: 404 })
    }

    const bucket = projectExport.storageBucket || process.env.R2_BUCKET_EXPORTS || 'prometheus-exports'
    const requestedRange = request.headers.get('range')
    if (requestedRange && !/^bytes=\d*-\d*$/.test(requestedRange)) {
      return new NextResponse(null, { status: 416 })
    }
    const range = requestedRange ?? undefined
    const object = await r2Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: projectExport.storagePath,
      ...(range ? { Range: range } : {}),
    }))

    if (!object.Body) return new NextResponse(null, { status: 404 })

    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
      'Content-Type': projectExport.mimeType || 'video/mp4',
      'X-Content-Type-Options': 'nosniff',
    })
    if (object.ContentLength !== undefined) headers.set('Content-Length', String(object.ContentLength))
    if (object.ContentRange) headers.set('Content-Range', object.ContentRange)

    return new NextResponse(object.Body.transformToWebStream(), {
      status: range ? 206 : 200,
      headers,
    })
  } catch (error) {
    console.error('[EXPORT_PREVIEW_GET]', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Export not found') {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Unable to preview export' }, { status: 500 })
  }
}
