import type { ProjectFinalOutput } from '@/lib/final-output'

type SupabaseLike = {
  from: (table: string) => any
}

export type ProjectRenderDispatchInput = {
  projectId: string
  sourceAssetId: string
  userId: string
  jobId: string
  pipelineJobId?: string | null
  status?: string | null
}

export type ProjectRenderReceiptPatch = Partial<Pick<
  ProjectFinalOutput,
  'status' | 'outputUrl' | 'r2Key' | 'errorMessage' | 'pipelineJobId'
>>

function mapReceipt(row: Record<string, unknown>): ProjectFinalOutput {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    sourceAssetId: String(row.source_asset_id),
    jobId: String(row.job_id),
    pipelineJobId: typeof row.pipeline_job_id === 'string' ? row.pipeline_job_id : null,
    status: (row.status as ProjectFinalOutput['status']) ?? 'queued',
    outputUrl: typeof row.output_url === 'string' ? row.output_url : null,
    r2Key: typeof row.r2_key === 'string' ? row.r2_key : null,
    errorMessage: typeof row.error_message === 'string' ? row.error_message : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function dbPatch(patch: ProjectRenderReceiptPatch) {
  return {
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.outputUrl !== undefined ? { output_url: patch.outputUrl } : {}),
    ...(patch.r2Key !== undefined ? { r2_key: patch.r2Key } : {}),
    ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
    ...(patch.pipelineJobId !== undefined ? { pipeline_job_id: patch.pipelineJobId } : {}),
  }
}

export async function recordProjectRenderDispatch(
  client: SupabaseLike,
  input: ProjectRenderDispatchInput,
): Promise<ProjectFinalOutput> {
  const { data, error } = await client
    .from('project_render_receipts')
    .upsert({
      project_id: input.projectId,
      source_asset_id: input.sourceAssetId,
      user_id: input.userId,
      job_id: input.jobId,
      pipeline_job_id: input.pipelineJobId ?? null,
      status: input.status === 'processing' ? 'processing' : 'queued',
      output_url: null,
      error_message: null,
    }, { onConflict: 'project_id,source_asset_id,job_id' })
    .select()
    .single()

  if (error || !data) throw error ?? new Error('Render receipt was not created.')
  return mapReceipt(data as Record<string, unknown>)
}

export async function getLatestEligibleRenderReceipt(
  client: SupabaseLike,
  input: { projectId: string; sourceAssetId: string; userId: string },
): Promise<ProjectFinalOutput | null> {
  const { data, error } = await client
    .from('project_render_receipts')
    .select('*')
    .eq('project_id', input.projectId)
    .eq('source_asset_id', input.sourceAssetId)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? mapReceipt(data as Record<string, unknown>) : null
}

export async function updateProjectRenderReceipt(
  client: SupabaseLike,
  id: string,
  userId: string,
  patch: ProjectRenderReceiptPatch,
): Promise<ProjectFinalOutput> {
  const { data, error } = await client
    .from('project_render_receipts')
    .update(dbPatch(patch))
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) throw error ?? new Error('Render receipt was not updated.')
  return mapReceipt(data as Record<string, unknown>)
}

export { mapReceipt }
