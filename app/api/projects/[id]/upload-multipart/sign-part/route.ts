import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse } from 'next/server'

import { PROJECT_SOURCE_MULTIPART_URL_TTL_SECONDS } from '@/lib/r2/project-source-multipart'
import { r2Client } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const partNumber = Number(body.partNumber)
    if (!sessionId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
      return NextResponse.json({ error: 'Invalid session or part number.', code: 'INVALID_SIGN_REQUEST' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: session, error } = await supabase.from('source_upload_sessions').select('*')
      .eq('id', sessionId).eq('project_id', projectId).single()
    if (error || !session) return NextResponse.json({ error: 'Upload session not found.', code: 'UPLOAD_SESSION_NOT_FOUND' }, { status: 404 })
    if (session.status !== 'uploading' || !session.multipart_upload_id || new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Upload session is not active.', code: 'UPLOAD_SESSION_INACTIVE' }, { status: 409 })
    }
    if (body.key !== session.object_key || body.uploadId !== session.multipart_upload_id) {
      return NextResponse.json({ error: 'Upload identity mismatch.', code: 'UPLOAD_SESSION_MISMATCH' }, { status: 409 })
    }

    const url = await getSignedUrl(r2Client as any, new UploadPartCommand({
      Bucket: session.bucket, Key: session.object_key, UploadId: session.multipart_upload_id, PartNumber: partNumber,
    }), { expiresIn: PROJECT_SOURCE_MULTIPART_URL_TTL_SECONDS })
    return NextResponse.json({ url, headers: {}, method: 'PUT', partNumber, expiresIn: PROJECT_SOURCE_MULTIPART_URL_TTL_SECONDS })
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/sign-part] POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to sign upload part', code: 'UPLOAD_PART_SIGN_FAILED', retryable: true }, { status: 500 })
  }
}
