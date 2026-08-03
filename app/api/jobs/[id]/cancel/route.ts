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

  const { data: existing, error: readError } = await supabase
    .from('durable_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (readError) {
    return NextResponse.json({ error: readError.message, code: 'JOB_READ_FAILED', retryable: true }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Job not found', code: 'JOB_NOT_FOUND' }, { status: 404 })
  if (existing.status === 'completed' || existing.status === 'failed') {
    return NextResponse.json({ job: existing, alreadyTerminal: true })
  }

  const { data: cancelled, error: cancelError } = await supabase
    .from('durable_jobs')
    .update({
      status: 'failed',
      progress: 100,
      error_message: 'CANCELLED_BY_USER',
      result_metadata: {
        ...(existing.result_metadata ?? {}),
        stage: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .in('status', ['pending', 'processing'])
    .select()
    .maybeSingle()
  if (cancelError) {
    return NextResponse.json({ error: cancelError.message, code: 'JOB_CANCEL_FAILED', retryable: true }, { status: 500 })
  }
  return NextResponse.json({ job: cancelled ?? existing, alreadyTerminal: !cancelled })
}
