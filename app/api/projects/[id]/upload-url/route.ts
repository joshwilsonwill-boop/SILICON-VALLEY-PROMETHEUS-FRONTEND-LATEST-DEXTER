import { NextResponse } from 'next/server'
import { requireProjectSourceUploadContext } from '@/lib/r2/project-source-multipart'
import { getPresignedPutUrl } from '@/lib/r2/presigned-url'
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

    const uploadUrl = await getPresignedPutUrl(context.bucket, context.key, context.contentType)

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
      upload: {
        url: uploadUrl,
        method: 'PUT',
        headers: {
          'Content-Type': context.contentType,
        },
      },
    })
  } catch (err) {
    console.error('[api/projects/[id]/upload-url] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate upload URL' },
      { status: err instanceof Error && err.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
