import { AbortMultipartUploadCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import { r2Client } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    if (!sessionId) return NextResponse.json({ error: 'Missing session id.', code: 'UPLOAD_SESSION_REQUIRED' }, { status: 400 })

    const supabase = await createClient()
    const { data: session, error: readError } = await supabase.from('source_upload_sessions').select('*')
      .eq('id', sessionId).eq('project_id', projectId).single()
    if (readError || !session) return NextResponse.json({ error: 'Upload session not found.', code: 'UPLOAD_SESSION_NOT_FOUND' }, { status: 404 })

    const { data: aborted, error: abortError } = await supabase.rpc('maul_abort_source_upload', { p_session_id: sessionId })
    if (abortError) return sourceControlPlaneErrorResponse(abortError, 'UPLOAD_ABORT_FAILED', 'Failed to abort upload session.')
    if (aborted.status === 'committed') return NextResponse.json({ success: true, alreadyCommitted: true, session: aborted })

    if (session.multipart_upload_id) {
      await r2Client.send(new AbortMultipartUploadCommand({
        Bucket: session.bucket, Key: session.object_key, UploadId: session.multipart_upload_id,
      })).catch((error) => console.warn('[SOURCE_MULTIPART_ABORT_CLEANUP]', { sessionId, error }))
    }
    // Handles a completion/abort race and verified-but-uncommitted objects. The
    // control-plane transition above prevents a later commit of this object.
    await r2Client.send(new DeleteObjectCommand({ Bucket: session.bucket, Key: session.object_key }))
      .catch((error) => console.warn('[SOURCE_OBJECT_ABORT_CLEANUP]', { sessionId, error }))

    return NextResponse.json({ success: true, session: aborted })
  } catch (err) {
    console.error('[api/projects/[id]/upload-multipart/abort] POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to abort multipart upload', code: 'UPLOAD_ABORT_FAILED', retryable: true }, { status: 500 })
  }
}
