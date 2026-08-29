import assert from 'node:assert/strict'
import test from 'node:test'

import { reconcileProjectFinalOutput } from '../lib/final-output'
import type { ProjectFinalOutput } from '../lib/final-output'
import { readFileSync } from 'node:fs'

const baseReceipt: ProjectFinalOutput = {
  id: 'receipt-1',
  projectId: 'project-1',
  sourceAssetId: 'source-1',
  jobId: 'job-1',
  pipelineJobId: 'pipeline-1',
  status: 'processing',
  outputUrl: null,
  r2Key: null,
  errorMessage: null,
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
}

test('does not fetch upstream for a completed receipt', async () => {
  let calls = 0
  const result = await reconcileProjectFinalOutput(
    { ...baseReceipt, status: 'completed', outputUrl: 'https://cdn.example/final.mp4' },
    async () => { calls += 1; return {} },
  )
  assert.equal(calls, 0)
  assert.equal(result.status, 'completed')
})

test('reconciles a processing receipt into completed output', async () => {
  const result = await reconcileProjectFinalOutput(baseReceipt, async () => ({
    state: 'finished',
    response: { outputUrl: '/media/final.mp4' },
  }))
  assert.equal(result.status, 'completed')
  assert.equal(result.outputUrl, '/api/mini-run/media/final.mp4')
})

test('preserves transient upstream failures as a retryable rejection', async () => {
  await assert.rejects(
    reconcileProjectFinalOutput(baseReceipt, async () => { throw new Error('upstream unavailable') }),
    /upstream unavailable/,
  )
})

test('the project route is owner-scoped and reconciles through the server proxy', () => {
  const source = readFileSync('app/api/projects/[id]/final-output/route.ts', 'utf8')
  assert.match(source, /auth\.getUser\(\)/)
  assert.match(source, /\.eq\('user_id', user\.id\)/)
  assert.match(source, /getLatestEligibleRenderReceipt/)
  assert.match(source, /resolveMiniRunConfig/)
  assert.match(source, /Modal-Key/)
  assert.match(source, /updateProjectRenderReceipt/)
})

test('the Mini-Run proxy exposes only safe media reads', () => {
  const source = readFileSync('lib/server/mini-run-proxy.ts', 'utf8')
  assert.match(source, /normalizedMethod === 'GET' && pathSegments\[0\] === 'media'/)
  assert.match(source, /hasSafeSegments/)
  assert.match(source, /\['accept', 'content-type', 'range'\]/)
})
