import {NextResponse} from 'next/server'

import {createClient} from '@/lib/supabase/server'

async function ownedIngestion(projectId: string) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return {supabase, response: NextResponse.json({error: 'Unauthorized'}, {status: 401})}

  const {data: ingestion, error} = await supabase
    .from('source_ingestions')
    .select('id,durable_job_id,source_asset_id,status,stage,progress,error_message,result_snapshot_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .order('created_at', {ascending: false})
    .limit(1)
    .maybeSingle()
  if (error) return {supabase, response: NextResponse.json({error: error.message}, {status: 500})}
  if (!ingestion) {
    return {supabase, response: NextResponse.json({error: 'Source analysis job not found'}, {status: 404})}
  }
  return {supabase, ingestion}
}

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id: projectId} = await params
  const owned = await ownedIngestion(projectId)
  if ('response' in owned) return owned.response
  const {supabase, ingestion} = owned
  let snapshot: Record<string, unknown> | null = null
  if (ingestion.result_snapshot_id) {
    const {data, error} = await supabase
      .from('source_observation_snapshots')
      .select('payload')
      .eq('id', ingestion.result_snapshot_id)
      .single()
    if (error) return NextResponse.json({error: error.message}, {status: 500})
    snapshot = data?.payload ?? null
  }
  return NextResponse.json({
    jobId: ingestion.durable_job_id,
    sourceAssetId: ingestion.source_asset_id,
    status: ingestion.status,
    stage: ingestion.stage,
    progress: ingestion.progress,
    error: ingestion.error_message,
    snapshot,
  })
}

export async function POST(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id: projectId} = await params
  const owned = await ownedIngestion(projectId)
  if ('response' in owned) return owned.response
  // The legacy Modal `api/source-analysis/jobs` dispatch endpoint no longer
  // exists. Ingestion now flows through the MAUL control-plane worker which
  // leases source ingestions directly from Supabase — the frontend just reports
  // current state and lets the worker pick the job up.
  return NextResponse.json({jobId: owned.ingestion.durable_job_id, status: owned.ingestion.status})
}
