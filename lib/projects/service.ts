import { createClient } from '@/lib/supabase/server'
import { normalizeSourceProfile } from '@/lib/media/source-profile'
import { mapProjectRowToListItem } from '@/lib/projects/project-list'
import type { ProjectListItem } from '@/lib/projects/types'
import { WorkspaceService } from '@/lib/workspaces/service'
import type { Project, ProjectStatus, SourceProfile, AnimationPlan } from '@/lib/types'

export interface ProjectPatch {
  title?: string
  status?: ProjectStatus
  thumbnailUrl?: string
  previewKind?: 'video' | 'image'
  sourceProfile?: SourceProfile | null
  editorState?: any
  animationPlan?: AnimationPlan
  sourceAssetId?: string
}

export const ProjectService = {
  async listProjectCards(): Promise<ProjectListItem[]> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: projectRows, error: projectsError } = await supabase
      .from('projects')
      .select('id, user_id, name, status, thumbnail_url, created_at, updated_at, source_profile, editor_state')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (projectsError) {
      console.error('[ProjectService] listProjectCards projects error:', projectsError.message, projectsError.details)
      throw projectsError
    }

    const projectIds = (projectRows ?? []).map((row) => row.id)
    const jobsByProjectId = new Map<string, { progress?: number | null; status?: string | null }>()

    if (projectIds.length > 0) {
      const { data: jobs, error: jobsError } = await supabase
        .from('durable_jobs')
        .select('project_id, status, progress, updated_at')
        .eq('user_id', user.id)
        .in('project_id', projectIds)
        .order('updated_at', { ascending: false })

      if (jobsError) {
        console.error('[ProjectService] listProjectCards durable_jobs error:', jobsError.message, jobsError.details)
      } else {
        for (const job of jobs ?? []) {
          if (!job.project_id || jobsByProjectId.has(job.project_id)) continue
          jobsByProjectId.set(job.project_id, {
            progress: job.progress,
            status: job.status,
          })
        }
      }
    }

    return (projectRows ?? []).map((row) => mapProjectRowToListItem(row, jobsByProjectId.get(row.id) ?? null))
  },

  async listProjects() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[ProjectService] listProjects Supabase error:', error.message, error.details)
      throw error
    }
    return (data || []).map(mapProjectFromDb)
  },

  async getProject(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('[ProjectService] getProject Supabase error:', error.message, error.details)
      throw error
    }

    if (!data.source_asset_id) {
      const { data: latestAsset } = await supabase
        .from('source_assets')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latestAsset?.id) {
        data.source_asset_id = latestAsset.id
      }
    }

    return mapProjectFromDb(data)
  },

  async createProject(params: { 
    title?: string
    description?: string | null
    template?: string | null
    prompt?: string
    previewKind?: 'video' | 'image'
    sourceProfile?: SourceProfile | null
    sourceAssetId?: string
    workspaceId?: string
  } = {}) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('[ProjectService] createProject: No authenticated user found')
        throw new Error('Unauthorized')
      }

      // Use provided workspaceId or ensure user has one
      const workspaceId = params.workspaceId || await WorkspaceService.getOrCreatePersonalWorkspace()
      
      console.log('[ProjectService] Creating project for user:', user.id, 'in workspace:', workspaceId)

      const editorState = {
        ...(params.prompt ? { initialPrompt: params.prompt } : {}),
        ...(params.description ? { projectDescription: params.description } : {}),
        ...(params.template ? { templatePreset: params.template } : {}),
      }
      const normalizedSourceProfile = normalizeSourceProfile(params.sourceProfile)

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          workspace_id: workspaceId,
          name: params.title || 'Untitled project',
          status: 'draft',
          preview_kind: params.previewKind,
          source_profile: normalizedSourceProfile ?? {},
          source_asset_id: params.sourceAssetId,
          editor_state: editorState,
        })
        .select()
        .single()

      if (error) {
        console.error('[ProjectService] createProject Supabase insert error:', error.message, '| Details:', error.details, '| Hint:', error.hint)
        throw new Error(`DB_INSERT_FAILED: ${error.message}`)
      }

      console.log('[ProjectService] Project created successfully:', data.id)
      return mapProjectFromDb(data)
    } catch (err) {
      console.error('[ProjectService] createProject fatal error:', err)
      throw err
    }
  },

  async updateProject(id: string, patch: ProjectPatch) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Unauthorized')

    const updateData: any = {}
    if (patch.title !== undefined) updateData.name = patch.title
    if (patch.status !== undefined) updateData.status = patch.status
    if (patch.thumbnailUrl !== undefined) updateData.thumbnail_url = patch.thumbnailUrl
    if (patch.previewKind !== undefined) updateData.preview_kind = patch.previewKind
    if (patch.sourceProfile !== undefined) updateData.source_profile = normalizeSourceProfile(patch.sourceProfile) ?? {}
    if (patch.editorState !== undefined) updateData.editor_state = patch.editorState
    if (patch.animationPlan !== undefined) updateData.animation_plan = patch.animationPlan
    if (patch.sourceAssetId !== undefined) updateData.source_asset_id = patch.sourceAssetId

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[ProjectService] updateProject Supabase error:', error.message, error.details)
      throw error
    }
    return mapProjectFromDb(data)
  },

  async deleteProject(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[ProjectService] deleteProject Supabase error:', error.message, error.details)
      throw error
    }
    return true
  },

  async duplicateProject(id: string): Promise<ProjectListItem> {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: original, error: getError } = await supabase
      .from('projects')
      .select('id, user_id, workspace_id, name, status, thumbnail_url, preview_kind, source_profile, editor_state, animation_plan, source_asset_id, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (getError) {
      console.error('[ProjectService] duplicateProject fetch error:', getError.message, getError.details)
      throw getError
    }

    const { data: duplicate, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        workspace_id: original.workspace_id,
        name: `${original.name || 'Untitled project'} (Copy)`,
        status: 'draft',
        thumbnail_url: original.thumbnail_url,
        preview_kind: original.preview_kind,
        source_profile: original.source_profile ?? {},
        editor_state: original.editor_state ?? {},
        animation_plan: original.animation_plan ?? {},
        source_asset_id: original.source_asset_id,
      })
      .select('id, user_id, name, status, thumbnail_url, created_at, updated_at, source_profile, editor_state')
      .single()

    if (insertError) {
      console.error('[ProjectService] duplicateProject insert error:', insertError.message, insertError.details)
      throw insertError
    }

    return mapProjectRowToListItem(duplicate, null)
  }
}

function mapProjectFromDb(row: any): Project {
  return {
    id: row.id,
    title: row.name || 'Untitled project',
    status: row.status as ProjectStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailUrl: row.thumbnail_url,
    previewKind: row.preview_kind,
    sourceProfile: normalizeSourceProfile(row.source_profile),
    sourceAssetId: row.source_asset_id,
    editorState: row.editor_state,
    animationPlan: row.animation_plan,
  }
}
