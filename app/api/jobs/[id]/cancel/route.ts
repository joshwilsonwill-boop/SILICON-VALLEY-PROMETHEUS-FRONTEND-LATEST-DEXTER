import { NextResponse } from 'next/server'
import { sourceControlPlaneErrorResponse } from '@/lib/api/source-control-plane-errors'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  const { data, error } = await supabase.rpc('maul_cancel_source_ingestion', { p_durable_job_id: id })
  if (error) return sourceControlPlaneErrorResponse(error, 'JOB_CANCEL_FAILED', 'Failed to cancel source processing.')
  return NextResponse.json(data)
}
