import {NextResponse} from 'next/server'

import {dispatchModalSourceAnalysis} from '@/lib/server/modal-source-analysis'
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

  // Fallback: If snapshot is not present but direct AssemblyAI transcription completed
  if (!snapshot) {
    const { data: projectRow } = await supabase
      .from('projects')
      .select('source_profile')
      .eq('id', projectId)
      .single()

    const transcriptSegments = projectRow?.source_profile?.transcript
    if (Array.isArray(transcriptSegments) && transcriptSegments.length > 0) {
      const mergedWords = transcriptSegments.flatMap((seg: any) =>
        (seg.text || '')
          .split(' ')
          .map((word: string, wIdx: number) => ({
            text: word,
            start_ms: (seg.startMs || 0) + wIdx * 200,
            end_ms: Math.min(seg.endMs || ((seg.startMs || 0) + (wIdx + 1) * 200), (seg.startMs || 0) + (wIdx + 1) * 200),
          }))
      )
      snapshot = {
        transcript: {
          mergedWords,
          segments: transcriptSegments,
        },
      }
    }
  }

  const effectiveStatus = snapshot ? 'completed' : ingestion.status
  const effectiveProgress = snapshot ? 100 : ingestion.progress

  return NextResponse.json({
    jobId: ingestion.durable_job_id,
    sourceAssetId: ingestion.source_asset_id,
    status: effectiveStatus,
    stage: ingestion.stage,
    progress: effectiveProgress,
    error: ingestion.error_message,
    snapshot,
  })
}

export async function POST(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id: projectId} = await params
  const owned = await ownedIngestion(projectId)
  if ('response' in owned) return owned.response
  const {ingestion} = owned
  if (ingestion.status !== 'queued') {
    return NextResponse.json({jobId: ingestion.durable_job_id, status: ingestion.status})
  }
  try {
    const dispatch = await dispatchModalSourceAnalysis({
      request: {jobId: ingestion.durable_job_id, sourceAssetId: ingestion.source_asset_id},
      env: {
        PROMETHEUS_BACKEND_URL: process.env.PROMETHEUS_BACKEND_URL,
        MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
        MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
      },
    })
    return NextResponse.json({jobId: ingestion.durable_job_id, ...dispatch}, {status: 202})
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Source analysis dispatch failed',
    }, {status: 502})
  }
}
