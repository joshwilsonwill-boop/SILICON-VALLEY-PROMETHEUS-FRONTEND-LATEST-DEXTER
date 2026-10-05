import assert from 'node:assert/strict'
import type { ProjectExport } from '@/lib/types'
import { isPlayableRender, projectRenderHistory, renderPreviewPath } from '@/lib/editor/render-delivery'

const base: ProjectExport = {
  id: 'render-1', projectId: 'project-1', userId: 'user-1', status: 'completed',
  storageProvider: 'r2', storageBucket: 'exports', storagePath: 'renders/final.mp4',
  mimeType: 'video/mp4', fileSizeBytes: 1024, durationMs: 1000, width: 1080,
  height: 1920, fps: 30, preset: 'default', metadata: {sourceAssetId: 'source-1', outputKind: 'rendered'},
  completedAt: '2026-10-04T00:00:00Z',
  createdAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z',
}

const records: ProjectExport[] = [
  {...base, id: 'old-source', metadata: {sourceAssetId: 'source-0'}, createdAt: '2026-10-05T00:00:00Z'},
  {...base, id: 'placeholder', metadata: {sourceAssetId: 'source-1', outputKind: 'source-copy-placeholder'}, createdAt: '2026-10-06T00:00:00Z'},
  {...base, id: 'wrong-project', projectId: 'project-2', createdAt: '2026-10-07T00:00:00Z'},
  {...base, id: 'pending', status: 'processing', storagePath: undefined, createdAt: '2026-10-04T02:00:00Z'},
  base,
]

assert.deepEqual(projectRenderHistory(records, 'project-1', 'source-1').map((record) => record.id), ['pending', 'render-1'])
assert.equal(isPlayableRender(records[0]!, 'project-1', 'source-1'), false)
assert.equal(isPlayableRender(records[1]!, 'project-1', 'source-1'), false)
assert.equal(isPlayableRender(records[3]!, 'project-1', 'source-1'), false)
assert.equal(isPlayableRender(base, 'project-1', 'source-1'), true)
assert.equal(renderPreviewPath(base.id), '/api/exports/render-1/preview')
console.log('editorial delivery assertions passed')
