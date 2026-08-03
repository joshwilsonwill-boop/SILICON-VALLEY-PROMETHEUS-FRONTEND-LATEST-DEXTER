import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const { data: job, error } = await supabase
    .from('durable_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message, code: 'JOB_READ_FAILED', retryable: true }, { status: 500 })
  }
  if (!job) return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 })

  const etag = `W/\"${job.id}:${job.updated_at}\"`
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({
    id: job.id,
    projectId: job.project_id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    result: job.result_metadata,
    error: job.error_message,
    retryAfterMs: job.status === 'pending' || job.status === 'processing' ? 2000 : null,
    updatedAt: job.updated_at,
  }, {
    headers: {
      ETag: etag,
      'Cache-Control': 'no-store',
      ...(job.status === 'pending' || job.status === 'processing' ? { 'Retry-After': '2' } : {}),
    },
  })
}
