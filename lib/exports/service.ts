import { createClient } from '@/lib/supabase/server'
import type { ProjectExport, ProjectExportStatus } from '@/lib/types'
import { R2Keys } from '@/lib/r2/keys'
import { copyR2Object } from '@/lib/r2/copy-object'

export interface ExportOptions {
  preset?: string
  metadata?: Record<string, unknown>
}

export const ExportService = {
  async createProjectExport(projectId: string, options: ExportOptions = {}): Promise<ProjectExport> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Verify project ownership and get source asset ID
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, source_asset_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found or access denied')
    }

    if (!project.source_asset_id) {
      throw new Error('Project has no source asset to export')
    }

    // 2. Insert the export job in "pending" status
    const { data, error } = await supabase
      .from('project_exports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        status: 'pending' as ProjectExportStatus,
        preset: options.preset || 'default',
        metadata: {
          source: 'editor_prepare_export',
          ...options.metadata,
        },
      })
      .select()
      .single()

    if (error) throw error

    const projectExport = mapProjectExportFromDb(data)

    // 3. Phase 3C: Minimal Real Export Proof - Copy source to exports bucket
    return await this.completeExportFromSourceCopy(projectExport, project.source_asset_id)
  },

  async completeExportFromSourceCopy(projectExport: ProjectExport, sourceAssetId: string): Promise<ProjectExport> {
    const supabase = await createClient()
    
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

  async getExport(exportId: string): Promise<ProjectExport> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('project_exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .single()

    if (error || !data) throw new Error('Export not found')
    return mapProjectExportFromDb(data)
  },

  async listProjectExports(projectId: string): Promise<ProjectExport[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('project_exports')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(mapProjectExportFromDb)
  },

  async getExportProject(exportId: string): Promise<{ id: string; title: string } | null> {
    const supabase = await createClient()
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
      .select('id, title')
      .eq('id', exportData.project_id)
      .single()

    if (projectError || !projectData) return null

    return {
      id: projectData.id,
      title: projectData.title
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
