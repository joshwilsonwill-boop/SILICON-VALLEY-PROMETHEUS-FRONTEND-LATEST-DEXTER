import type { ProjectExport } from '@/lib/types'

type ExportMetadata = Record<string, unknown>

function metadataOf(record: ProjectExport): ExportMetadata {
  return record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
    ? record.metadata as ExportMetadata
    : {}
}

/** A source copy or a render for a replaced source is never a finished edit. */
export function isProjectRender(record: ProjectExport, projectId: string, sourceAssetId: string): boolean {
  const metadata = metadataOf(record)
  return record.projectId === projectId
    && metadata.sourceAssetId === sourceAssetId
    && metadata.outputKind !== 'source-copy-placeholder'
    && metadata.devProof !== true
}

export function isPlayableRender(record: ProjectExport, projectId: string, sourceAssetId: string): boolean {
  return isProjectRender(record, projectId, sourceAssetId)
    && record.status === 'completed'
    && Boolean(record.storagePath)
    && (record.mimeType === 'video/mp4' || record.mimeType === null || record.mimeType === undefined)
}

export function renderPreviewPath(exportId: string): string {
  return `/api/exports/${encodeURIComponent(exportId)}/preview`
}

export function renderDownloadPath(exportId: string): string {
  return `/api/exports/${encodeURIComponent(exportId)}/download-url`
}

export function projectRenderHistory(records: ProjectExport[], projectId: string, sourceAssetId: string): ProjectExport[] {
  return records
    .filter((record) => isProjectRender(record, projectId, sourceAssetId))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
}
