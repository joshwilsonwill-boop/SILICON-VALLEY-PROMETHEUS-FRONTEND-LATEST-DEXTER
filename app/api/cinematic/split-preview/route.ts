import { Readable } from 'node:stream'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import {
  createSplitPreviewAssets,
  createSplitPreviewNodeStream,
  resolveSplitPreviewAssetFile,
} from '@/lib/cinematic/split-preview-assets'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const sourceVideo = formData.get('source_video')

  if (!(sourceVideo instanceof File)) {
    return NextResponse.json({ error: 'Missing source video file.' }, { status: 400 })
  }

  const buffer = Buffer.from(await sourceVideo.arrayBuffer())
  if (buffer.length === 0) {
    return NextResponse.json({ error: 'Source video file is empty.' }, { status: 400 })
  }

  try {
    const payload = await createSplitPreviewAssets({
      buffer,
      fileName: sourceVideo.name || 'source.mp4',
    })

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate split preview assets.',
      },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key')?.trim() ?? ''
  const side = url.searchParams.get('side')?.trim() === 'right' ? 'right' : 'left'

  if (!key) {
    return NextResponse.json({ error: 'Missing split preview key.' }, { status: 400 })
  }

  try {
    const file = await resolveSplitPreviewAssetFile(key, side)
    if (!file) {
      return NextResponse.json({ error: 'Unknown split preview asset.' }, { status: 404 })
    }

    return new NextResponse(Readable.toWeb(createSplitPreviewNodeStream(file.filePath)) as ReadableStream, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Length': String(file.fileStat.size),
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to read split preview asset.',
      },
      { status: 500 },
    )
  }
}
