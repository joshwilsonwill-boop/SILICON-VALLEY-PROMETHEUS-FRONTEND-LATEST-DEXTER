import type { ProjectListItem, ProjectCardStatus } from '@/lib/projects/types'

type DurableJobRecord = {
  progress?: number | null
  project_id?: string | null
  status?: string | null
}

type ProjectRowRecord = {
  id: string
  user_id: string
  name?: string | null
  title?: string | null
  status?: string | null
  thumbnail_url?: string | null
  created_at: string
  updated_at: string
  source_profile?: Record<string, unknown> | null
  editor_state?: Record<string, unknown> | null
  source_asset_id?: string | null
}

export function normalizeProjectCardStatus(
  projectStatus: string | null | undefined,
  jobStatus?: string | null,
): ProjectCardStatus {
  if (jobStatus === 'failed' || projectStatus === 'failed') return 'failed'
  if (jobStatus === 'processing' || projectStatus === 'processing' || projectStatus === 'rendering') return 'rendering'
  if (jobStatus === 'completed' || projectStatus === 'ready' || projectStatus === 'exported' || projectStatus === 'completed') {
    return 'completed'
  }
  return 'draft'
}

export function mapProjectRowToListItem(
  row: ProjectRowRecord,
  latestJob?: DurableJobRecord | null,
): ProjectListItem {
  const inspection = extractInspection(row.source_profile)
  const editorState = row.editor_state && typeof row.editor_state === 'object' ? row.editor_state : {}

  return {
    id: row.id,
    userId: row.user_id,
    title: (row.name || row.title || 'Untitled project').trim() || 'Untitled project',
    description: extractDescription(editorState),
    thumbnailUrl: row.thumbnail_url ?? null,
    status: normalizeProjectCardStatus(row.status, latestJob?.status),
    progress: latestJob?.status === 'processing' ? latestJob.progress ?? 0 : latestJob?.status === 'completed' ? 100 : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    duration: numberOrNull(inspection.durationSec),
    width: numberOrNull(inspection.width),
    height: numberOrNull(inspection.height),
    fps: numberOrNull(inspection.fps),
    sourceAssetId: row.source_asset_id ?? null,
  }
}

function extractInspection(sourceProfile: Record<string, unknown> | null | undefined) {
  if (!sourceProfile || typeof sourceProfile !== 'object') return {}
  const inspection = sourceProfile.inspection
  if (!inspection || typeof inspection !== 'object') return {}
  return inspection as Record<string, unknown>
}

function extractDescription(editorState: Record<string, unknown>) {
  const value = editorState.projectDescription ?? editorState.description ?? editorState.initialPrompt
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
