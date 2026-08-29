import assert from 'node:assert/strict'
import test from 'node:test'

import {
  browserFinalOutputUrl,
  isFinalOutputEligible,
  normalizeFinalOutputSnapshot,
  resolveActivePreview,
} from '../lib/final-output'

const receipt = {
  id: 'receipt-1', projectId: 'project-1', sourceAssetId: 'source-1',
  jobId: 'job-1', pipelineJobId: 'pipeline-1', status: 'processing' as const,
  outputUrl: null, r2Key: null, errorMessage: null,
  createdAt: '2026-08-29T00:00:00.000Z', updatedAt: '2026-08-29T00:00:00.000Z',
}

test('normalizes a completed Mini-Run envelope with an output URL', () => {
  const result = normalizeFinalOutputSnapshot({
    state: 'completed',
    returnvalue: { outputUrl: 'https://cdn.example/final.mp4', r2Key: 'renders/final.mp4' },
  }, receipt)
  assert.equal(result.status, 'completed')
  assert.equal(result.outputUrl, 'https://cdn.example/final.mp4')
})

test('completed without an output is a failed display result', () => {
  const result = normalizeFinalOutputSnapshot({ state: 'completed' }, receipt)
  assert.equal(result.status, 'failed')
  assert.match(result.errorMessage ?? '', /output/i)
})

test('maps backend media to the same-origin Mini-Run proxy', () => {
  assert.equal(browserFinalOutputUrl('/media/final.mp4'), '/api/mini-run/media/final.mp4')
})

test('rejects an output from a replaced source', () => {
  const output = { ...receipt, status: 'completed' as const, outputUrl: 'https://cdn.example/final.mp4' }
  assert.equal(isFinalOutputEligible(output, 'source-2'), false)
})

test('uses final only when selected and playable', () => {
  const original = { url: 'blob:original', kind: 'video' as const }
  const final = { url: 'https://cdn.example/final.mp4', kind: 'video' as const }
  assert.deepEqual(resolveActivePreview({ view: 'final', original, final, finalPlayable: true }), final)
  assert.deepEqual(resolveActivePreview({ view: 'final', original, final, finalPlayable: false }), original)
})
