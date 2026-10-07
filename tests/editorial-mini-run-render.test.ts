import assert from 'node:assert/strict'
import {test} from 'node:test'

import {isPlayableRender, isProjectRender} from '../lib/editor/render-delivery'
import {buildMiniRunRenderPayload} from '../lib/server/mini-run-render-payload'
import {isAllowedMiniRunRequest} from '../lib/server/mini-run-proxy'

test('Mini-Run payload applies its portrait profile and selected shot window', () => {
  const payload = buildMiniRunRenderPayload({
    sourceUrl: 'https://media.example.test/source.mp4',
    source: {durationMs: 90_000, width: 1920, height: 1080},
    shot: {sourceStartMs: 12_000, sourceEndMs: 42_000, songPolicy: 'disabled'},
    jobId: 'export-123',
  })

  assert.deepEqual(payload.source, {url: 'https://media.example.test/source.mp4'})
  assert.deepEqual(payload.design, {canvasWidth: 1080, canvasHeight: 1920})
  assert.deepEqual(payload.selectedWindow, {sourceStartMs: 12_000, sourceEndMs: 42_000})
  assert.equal((payload.metadata as Record<string, unknown>).pipeline, 'maul')
  assert.deepEqual(payload.audio, {songPolicy: 'disabled'})
  assert.equal(payload.jobId, 'export-123')
})

test('editorial edits remain explicitly outside this worker contract', () => {
  const payload = buildMiniRunRenderPayload({
    sourceUrl: 'https://media.example.test/source.mp4',
    source: {durationMs: 90_000},
    shot: {},
    jobId: 'export-456',
  })
  assert.equal('draftManifest' in payload, false)
})

test('an owned completed Mini-Run receipt is playable only for its originating source and project', () => {
  const record = {
    id: 'export-789',
    projectId: 'project-a',
    userId: 'user-a',
    status: 'completed' as const,
    storageProvider: 'r2',
    mimeType: 'video/mp4',
    preset: 'mini-run-maul-portrait',
    metadata: {sourceAssetId: 'source-a', outputKind: 'mini-run', miniRunJobId: 'job-789'},
    createdAt: '2026-10-07T12:00:00.000Z',
    updatedAt: '2026-10-07T12:00:00.000Z',
  }

  assert.equal(isProjectRender(record, 'project-a', 'source-a'), true)
  assert.equal(isPlayableRender(record, 'project-a', 'source-a'), true)
  assert.equal(isPlayableRender(record, 'project-a', 'source-b'), false)
  assert.equal(isPlayableRender(record, 'project-b', 'source-a'), false)
})

test('job status remains reachable only through the allow-listed Mini-Run route', () => {
  assert.equal(isAllowedMiniRunRequest('GET', ['api', 'pipeline', 'job', 'job-123']), true)
  assert.equal(isAllowedMiniRunRequest('POST', ['api', 'pipeline', 'job', 'job-123']), false)
  assert.equal(isAllowedMiniRunRequest('GET', ['api', 'pipeline', 'job', '..']), false)
})
