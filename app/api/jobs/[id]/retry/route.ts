import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

  const { data: job, error: readError } = await supabase
    .from('durable_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (readError) {
    return NextResponse.json({ error: readError.message, code: 'JOB_READ_FAILED', retryable: true }, { status: 500 })
  }
  if (!job) return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 })
  if (job.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed jobs can be retried.', code: 'JOB_NOT_RETRYABLE' }, { status: 409 })
  }

  const sourceAssetId = job.result_metadata?.source_asset_id
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('source_asset_id')
    .eq('id', job.project_id)
    .eq('user_id', user.id)
    .single()
  if (projectError) {
    return NextResponse.json({ error: projectError.message, code: 'PROJECT_READ_FAILED', retryable: true }, { status: 500 })
  }
  if (typeof sourceAssetId !== 'string' || project.source_asset_id !== sourceAssetId) {
    return NextResponse.json({ error: 'This job belongs to a superseded source.', code: 'SOURCE_SUPERSEDED' }, { status: 409 })
  }

  const { data: retried, error: retryError } = await supabase
    .from('durable_jobs')
    .update({
      status: 'pending',
      progress: 0,
      error_message: null,
      result_metadata: {
        ...(job.result_metadata ?? {}),
        stage: 'retry_requested',
        retry_requested_at: new Date().toISOString(),
        retry_count: Number(job.result_metadata?.retry_count ?? 0) + 1,
      },
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'failed')
    .select()
    .maybeSingle()
  if (retryError) {
    return NextResponse.json({ error: retryError.message, code: 'JOB_RETRY_FAILED', retryable: true }, { status: 500 })
  }
  if (!retried) return NextResponse.json({ error: 'Job state changed; refresh and try again.', code: 'JOB_STATE_CONFLICT' }, { status: 409 })
  return NextResponse.json({ job: retried })
}
