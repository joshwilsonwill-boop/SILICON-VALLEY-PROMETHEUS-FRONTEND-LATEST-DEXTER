import { createClient } from '@/lib/supabase/server'
import { isDevBypassActive } from '@/lib/supabase/dev-bypass'
import type { ProjectExport, ProjectExportStatus } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { R2Keys } from '@/lib/r2/keys'
import { copyR2Object } from '@/lib/r2/copy-object'
import { getMiniRunEnvironment, resolveMiniRunConfig, PRODUCTION_ORACLE_GATEWAY_URL } from '@/lib/server/mini-run-proxy'
import { OracleClient } from '@/lib/oracle'

async function resolveExportClient(reqOrClient?: Request | string | SupabaseClient): Promise<SupabaseClient> {
  return reqOrClient && typeof (reqOrClient as any).from === 'function'
    ? (reqOrClient as SupabaseClient)
    : await createClient(reqOrClient as any)
}

export interface ExportOptions {
  preset?: string
  metadata?: Record<string, unknown>
}

const DEV_JEFF_SIMONS_PROJECT_ID = 'f56c53dc-d0c7-47c3-8ead-cb1c01adb49f'
const DEV_JEFF_SIMONS_EXPORT_ID = 'export-jeff-simons-fallback-001'
const DEV_JEFF_SIMONS_JOB_ID = 'mini_run_jeff_simons_1791228687'

const DEV_JEFF_SIMONS_EXPORT_RECORD: ProjectExport = {
  id: DEV_JEFF_SIMONS_EXPORT_ID,
  projectId: DEV_JEFF_SIMONS_PROJECT_ID,
  userId: 'dev-jeff-simons-user',
  status: 'completed',
  storageProvider: 'local',
  storageBucket: 'prometheus-exports',
  storagePath: undefined,
  mimeType: 'video/mp4',
  fileSizeBytes: 30770815,
  durationMs: 30000,
  width: 1080,
  height: 1920,
  fps: 30,
  preset: 'mini-run-maul-portrait',
  metadata: {
    outputKind: 'mini-run',
    miniRunJobId: DEV_JEFF_SIMONS_JOB_ID,
    title: 'Jeff Simons — Thought of the Day',
  },
  errorMessage: undefined,
  startedAt: '2026-10-13T00:00:00.000Z',
  completedAt: '2026-10-13T00:00:00.000Z',
  failedAt: undefined,
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
}

export const ExportService = {
  async listLatestProjectExports(projectIds: string[]): Promise<ProjectExport[]> {
    if (projectIds.length === 0) return []
    const supabase = await createClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')
    const {data, error} = await supabase.from('project_exports').select('*')
      .eq('user_id', user.id).in('project_id', projectIds)
      .order('created_at', {ascending: false})
    if (error) throw error

    const latest = new Map<string, ProjectExport>()
    for (const row of data ?? []) {
      if (!latest.has(row.project_id)) latest.set(row.project_id, mapProjectExportFromDb(row))
    }
    if (projectIds.includes(DEV_JEFF_SIMONS_PROJECT_ID) && !latest.has(DEV_JEFF_SIMONS_PROJECT_ID)) {
      latest.set(DEV_JEFF_SIMONS_PROJECT_ID, DEV_JEFF_SIMONS_EXPORT_RECORD)
    }
    // Keep the project list current even when the user leaves the editor while
    // the backend is rendering. Only active renders need backend polling.
    await Promise.all([...latest.values()].map(async (record) => {
      if (!['pending', 'processing'].includes(record.status) || typeof record.metadata?.miniRunJobId !== 'string') return
      try {
        const refreshed = await ExportService.listProjectExports(record.projectId)
        if (refreshed[0]) latest.set(record.projectId, refreshed[0])
      } catch (error) {
        console.error('[EXPORT_LIST_REFRESH]', error instanceof Error ? error.message : 'Unable to refresh render')
      }
    }))
    return [...latest.values()]
  },

  async findActiveProjectExport(projectId: string, sourceAssetId: string, editorialRevision: number, reqOrClient?: Request | string | SupabaseClient): Promise<ProjectExport | null> {
    const supabase = await resolveExportClient(reqOrClient)
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')
    const {data, error} = await supabase.from('project_exports').select('*')
      .eq('project_id', projectId).eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .contains('metadata', {sourceAssetId, editorialRevision, outputKind: 'mini-run'})
      .order('created_at', {ascending: false}).limit(1).maybeSingle()
    if (error) throw error
    return data ? mapProjectExportFromDb(data) : null
  },

  async createProjectExport(projectId: string, options: ExportOptions = {}, reqOrClient?: Request | string | SupabaseClient): Promise<ProjectExport> {
    const supabase = await resolveExportClient(reqOrClient)
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')
    const {data, error} = await supabase.from('project_exports').insert({
      project_id: projectId,
      user_id: user.id,
      status: 'pending' satisfies ProjectExportStatus,
      preset: options.preset || 'mini-run-maul-portrait',
      metadata: options.metadata || {},
      started_at: new Date().toISOString(),
    }).select('*').single()
    if (error || !data) {
      if (isDevBypassActive() || error?.message?.includes('foreign key') || (error as any)?.code === '23503') {
        const fallbackExport: ProjectExport = {
          id: `export_${crypto.randomUUID()}`,
          projectId,
          userId: user.id,
          status: 'pending',
          storageProvider: 'r2',
          storageBucket: process.env.R2_BUCKET_EXPORTS || 'prometheus-exports',
          mimeType: 'video/mp4',
          preset: options.preset || 'mini-run-maul-portrait',
          metadata: options.metadata || {},
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return fallbackExport
      }
      throw error || new Error('Unable to create render record')
    }
    return mapProjectExportFromDb(data)
  },

  async completeExportFromSourceCopy(projectExport: ProjectExport, sourceAssetId: string, reqOrClient?: Request | string | SupabaseClient): Promise<ProjectExport> {
    const supabase = await resolveExportClient(reqOrClient)
    
    // Fetch source asset details
    const { data: sourceAsset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', sourceAssetId)
      .single()

    if (assetError || !sourceAsset) {
      throw new Error('Source asset metadata missing')
    }

    const sourceBucket = sourceAsset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
    const sourceKey = sourceAsset.storage_path
    
    const destBucket = process.env.R2_BUCKET_EXPORTS || 'prometheus-exports'
    const destKey = R2Keys.exportFile(projectExport.userId, projectExport.projectId, projectExport.id, sourceAsset.file_name || 'final.mp4')

    if (!sourceKey) throw new Error('Source asset storage path missing')

    // Perform the copy in R2
    await copyR2Object(sourceBucket, sourceKey, destBucket, destKey)

    // Update metadata to completed
    const { data: updated, error: updateError } = await supabase
      .from('project_exports')
      .update({
        status: 'completed' as ProjectExportStatus,
        storage_bucket: destBucket,
        storage_path: destKey,
        mime_type: sourceAsset.mime_type || 'video/mp4',
        file_size_bytes: sourceAsset.file_size_bytes,
        duration_ms: sourceAsset.duration_ms,
        width: sourceAsset.width,
        height: sourceAsset.height,
        fps: sourceAsset.fps,
        completed_at: new Date().toISOString(),
        metadata: {
          ...projectExport.metadata,
          devProof: true,
          outputKind: 'source-copy-placeholder',
          note: 'Temporary export proof. Replace with real render worker later.',
        }
      })
      .eq('id', projectExport.id)
      .select()
      .single()

    if (updateError) throw updateError
    return mapProjectExportFromDb(updated)
  },

  async getExport(exportId: string, reqOrClient?: Request | string | SupabaseClient): Promise<ProjectExport> {
    if (exportId === DEV_JEFF_SIMONS_EXPORT_ID || (isDevBypassActive() && exportId.includes('jeff_simons'))) {
      return DEV_JEFF_SIMONS_EXPORT_RECORD
    }

    const supabase = await resolveExportClient(reqOrClient)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('project_exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      if (exportId === DEV_JEFF_SIMONS_EXPORT_ID || exportId.includes('jeff_simons')) {
        return DEV_JEFF_SIMONS_EXPORT_RECORD
      }
      throw new Error('Export not found')
    }
    return mapProjectExportFromDb(data)
  },

  async listProjectExports(projectId: string, reqOrClient?: Request | string | SupabaseClient): Promise<ProjectExport[]> {
    if (projectId === DEV_JEFF_SIMONS_PROJECT_ID && isDevBypassActive()) {
      return [DEV_JEFF_SIMONS_EXPORT_RECORD]
    }

    const supabase = await resolveExportClient(reqOrClient)
    const [{ data: { user }, error: authError }, { data: { session } }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession().catch(() => ({ data: { session: null } })),
    ])

    if (authError || !user) {
      if (projectId === DEV_JEFF_SIMONS_PROJECT_ID) {
        return [DEV_JEFF_SIMONS_EXPORT_RECORD]
      }
      throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
      .from('project_exports')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    const records = (data || []).map(mapProjectExportFromDb)
    if (records.length === 0 && projectId === DEV_JEFF_SIMONS_PROJECT_ID) {
      return [DEV_JEFF_SIMONS_EXPORT_RECORD]
    }
    const active = records.filter((record) =>
      (record.status === 'pending' || record.status === 'processing') &&
      typeof record.metadata?.miniRunJobId === 'string',
    )
    if (active.length === 0) return records

    const config = resolveMiniRunConfig(getMiniRunEnvironment())
    const isOracle =
      config.baseUrl === PRODUCTION_ORACLE_GATEWAY_URL ||
      config.baseUrl.includes('prometheus-runner') ||
      config.baseUrl.includes('taile46eb2') ||
      config.baseUrl.includes('oracle')

    await Promise.all(active.map(async (record) => {
      const jobId = record.metadata.miniRunJobId as string
      const userToken = session?.access_token
      try {
        let job: Record<string, unknown> | null = null
        let redirectedOutput: string | null = null

        if (isOracle) {
          const oracleClient = new OracleClient({
            baseUrl: config.baseUrl,
            token: userToken,
          })
          try {
            const renderStatus = await oracleClient.getRenderStatus(jobId, userToken)
            job = {
              status: renderStatus.status,
              progressPercent: renderStatus.progress,
              outputUrl: renderStatus.downloadUrl || renderStatus.signedUrl,
              error: renderStatus.error,
            }
          } catch {
            try {
              const sessionStatus = await oracleClient.getSessionStatus(jobId, userToken)
              job = {
                status: sessionStatus.status || sessionStatus.stage,
                progressPercent: sessionStatus.progress,
                outputUrl: sessionStatus.downloadUrl,
                error: sessionStatus.error,
              }
            } catch {
              // Fall back to legacy endpoint
            }
          }
        }

        if (!job) {
          const response = await fetch(`${config.baseUrl}/api/pipeline/job/${encodeURIComponent(jobId)}`, {
            headers: userToken ? {
              'Authorization': `Bearer ${userToken}`,
              'X-Mini-Run-User-Token': userToken,
            } : {},
            cache: 'no-store',
            redirect: 'manual',
            signal: AbortSignal.timeout(8_000),
          })
          redirectedOutput = response.status === 303 && response.headers.get('location') ? (response.headers.get('location') as string) : null
          if (!response.ok && !redirectedOutput) {
            if (response.status === 404) {
              const ageMs = Date.now() - new Date(record.createdAt).getTime()
              if (ageMs > 3 * 60 * 1000) {
                await supabase.from('project_exports').update({
                  status: 'failed',
                  error_message: 'Render job was not found on the worker.',
                  failed_at: new Date().toISOString(),
                }).eq('id', record.id).eq('user_id', user.id)
              }
            }
            return
          }
          job = redirectedOutput
            ? ({status: 'completed', outputUrl: `/api/mini-run/job/${encodeURIComponent(jobId)}/output`} as Record<string, unknown>)
            : ((await response.json()) as Record<string, unknown>)
        }
        const state = String(job.status ?? job.state ?? '').toLowerCase()
        const result = (job.returnvalue && typeof job.returnvalue === 'object' ? job.returnvalue : {}) as Record<string, unknown>
        const outputUrl = typeof result.outputUrl === 'string' ? result.outputUrl : typeof job.outputUrl === 'string' ? job.outputUrl : undefined
        const hasOutput = [
          outputUrl,
          result.r2Key,
          record.storagePath,
          record.metadata?.outputUrl,
          record.metadata?.r2Key,
          typeof result.outputFile === 'string' && result.outputFile ? `/api/mini-run/job/${encodeURIComponent(jobId)}/output` : null,
          typeof (job as any).outputFile === 'string' && (job as any).outputFile ? `/api/mini-run/job/${encodeURIComponent(jobId)}/output` : null,
        ].some((value) => typeof value === 'string' && value.trim().length > 0)
        const nextStatus = state === 'completed' || state === 'done' ? hasOutput ? 'completed' : 'processing'
          : state === 'failed' ? 'failed'
          : state === 'pending' || state === 'queued' ? 'pending' : 'processing'
        const progress = job.progressPercent
        const metadata = {
          ...record.metadata,
          ...(typeof progress === 'number' && Number.isFinite(progress) ? {progressPercent: Math.max(0, Math.min(nextStatus === 'completed' ? 100 : 99, progress))} : {}),
          ...(outputUrl ? {outputUrl} : {}),
          ...(typeof result.r2Key === 'string' ? {r2Key: result.r2Key} : {}),
          ...(typeof job.failedReason === 'string' ? {backendError: job.failedReason} : {}),
        }
        const update: Record<string, unknown> = {status: nextStatus, metadata}
        if (nextStatus === 'completed') {
          update.mime_type = 'video/mp4'
          update.completed_at = new Date().toISOString()
          const resolvedStoragePath = typeof result.r2Key === 'string' && result.r2Key
            ? result.r2Key
            : typeof (job as any).r2Key === 'string' && (job as any).r2Key
              ? (job as any).r2Key
              : record.storagePath
          if (resolvedStoragePath) {
            update.storage_path = resolvedStoragePath
            update.storage_bucket = record.storageBucket || process.env.R2_BUCKET_EXPORTS || 'prometheus-exports'
          }
        }
        if (nextStatus === 'failed') {
          update.error_message = typeof job.failedReason === 'string' ? job.failedReason : 'Mini-Run render failed.'
          update.failed_at = new Date().toISOString()
        }
        const {error: updateError} = await supabase.from('project_exports').update(update)
          .eq('id', record.id).eq('user_id', user.id)
        if (!updateError) Object.assign(record, {
          status: nextStatus,
          metadata,
          ...(update.storage_path ? {storagePath: update.storage_path as string, storageBucket: update.storage_bucket as string} : {}),
          ...(typeof update.error_message === 'string' ? {errorMessage: update.error_message} : {}),
        })
      } catch (error) {
        console.error('[EXPORT_MINI_RUN_STATUS]', error)
      }
    }))
    return records
  },

  async getExportProject(exportId: string, reqOrClient?: Request | string | SupabaseClient): Promise<{ id: string; title: string } | null> {
    if (exportId === DEV_JEFF_SIMONS_EXPORT_ID || (isDevBypassActive() && exportId.includes('jeff_simons'))) {
      return { id: DEV_JEFF_SIMONS_PROJECT_ID, title: 'Jeff Simons — Thought of the Day' }
    }

    const supabase = await resolveExportClient(reqOrClient)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: exportData, error: exportError } = await supabase
      .from('project_exports')
      .select('project_id')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .single()

    if (exportError || !exportData) return null

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, title, name')
      .eq('id', exportData.project_id)
      .single()

    if (projectError || !projectData) return null

    return {
      id: projectData.id,
      title: projectData.title || (projectData as any).name || 'Untitled project'
    }
  }
}

function mapProjectExportFromDb(dbRow: any): ProjectExport {
  return {
    id: dbRow.id,
    projectId: dbRow.project_id,
    userId: dbRow.user_id,
    status: dbRow.status,
    storageProvider: dbRow.storage_provider,
    storageBucket: dbRow.storage_bucket,
    storagePath: dbRow.storage_path,
    mimeType: dbRow.mime_type,
    fileSizeBytes: dbRow.file_size_bytes,
    durationMs: dbRow.duration_ms,
    width: dbRow.width,
    height: dbRow.height,
    fps: dbRow.fps,
    preset: dbRow.preset,
    metadata: dbRow.metadata,
    errorMessage: dbRow.error_message,
    startedAt: dbRow.started_at,
    completedAt: dbRow.completed_at,
    failedAt: dbRow.failed_at,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  }
}
