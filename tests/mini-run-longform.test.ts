import assert from 'node:assert/strict'

import { isAllowedMiniRunRequest } from '../lib/server/mini-run-proxy'
import { isAllowedModalBackendRequest } from '../lib/server/modal-backend-proxy'
import { createMiniRunClient } from '../lib/api/mini-run'
import { dispatchLongformFromProject } from '../lib/api/mini-run-console'

async function testAllowlists() {
  // Mini-run proxy allowlist tests
  assert.equal(isAllowedMiniRunRequest('POST', ['api', 'pipeline', 'longform']), true)
  assert.equal(isAllowedMiniRunRequest('GET', ['api', 'pipeline', 'longform', 'batch_test_123']), true)
  assert.equal(isAllowedMiniRunRequest('GET', ['api', 'pipeline', 'longform', '..']), false)
  assert.equal(isAllowedMiniRunRequest('DELETE', ['api', 'pipeline', 'longform']), false)

  // Modal backend proxy allowlist tests
  assert.equal(isAllowedModalBackendRequest('POST', ['api', 'pipeline', 'longform'], 'mini-run'), true)
  assert.equal(isAllowedModalBackendRequest('GET', ['api', 'pipeline', 'longform', 'batch_test_456'], 'mini-run'), true)
  assert.equal(isAllowedModalBackendRequest('POST', ['api', 'pipeline', 'longform'], 'landscape'), false)
}

async function testClientContract() {
  const client = createMiniRunClient(async (input, init) => {
    const url = String(input)
    if (url.endsWith('/api/pipeline/longform') && init?.method === 'POST') {
      const parsed = JSON.parse(String(init.body))
      return new Response(JSON.stringify({
        batchJobId: 'batch_contract_1',
        status: 'queued',
        nClips: parsed.nClips ?? 3,
        pollUrl: '/api/pipeline/longform/batch_contract_1',
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (url.includes('/api/pipeline/longform/batch_contract_1')) {
      return new Response(JSON.stringify({
        ok: true,
        batchJobId: 'batch_contract_1',
        state: 'completed',
        status: 'completed',
        returnvalue: {
          batchId: 'batch_contract_1_batch',
          clipCount: 3,
          succeeded: 3,
          clips: [
            {
              clipIndex: 0,
              rank: 1,
              jobId: 'batch_contract_1_clip1',
              window: { sourceStartMs: 0, sourceEndMs: 30000, durationMs: 30000 },
              viralMetadata: { viralityScore: 94, hook: 'This changes everything', reason: 'High hook potency' },
              success: true,
              outputUrl: 'https://cdn.example.test/clip1.mp4',
            },
            {
              clipIndex: 1,
              rank: 2,
              jobId: 'batch_contract_1_clip2',
              window: { sourceStartMs: 60000, sourceEndMs: 95000, durationMs: 35000 },
              viralMetadata: { viralityScore: 88, hook: 'The biggest pitfall', reason: 'Contrarian advice' },
              success: true,
              outputUrl: 'https://cdn.example.test/clip2.mp4',
            },
          ],
        },
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(null, { status: 404 })
  })

  // Test dispatch
  const submission = await client.dispatchLongform({
    source: { url: 'https://cdn.example.test/source.mp4' },
    nClips: 3,
    prompt: 'contrarian insights',
  })
  assert.equal(submission.batchJobId, 'batch_contract_1')
  assert.equal(submission.nClips, 3)
  assert.equal(submission.status, 'queued')

  // Test status poll
  const status = await client.getLongformStatus('batch_contract_1')
  assert.equal(status.batchJobId, 'batch_contract_1')
  assert.equal(status.state, 'completed')
  assert.equal(status.clipCount, 3)
  assert.equal(status.clips?.length, 2)
  assert.equal(status.clips?.[0].viralMetadata?.viralityScore, 94)
  assert.equal(status.clips?.[1].viralMetadata?.viralityScore, 88)
}

async function testConsoleDispatch() {
  let capturedBody: Record<string, unknown> = {}
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), '/api/mini-run/dispatch-longform')
    assert.equal(init?.method, 'POST')
    capturedBody = JSON.parse(String(init?.body))
    return new Response(JSON.stringify({
      batchJobId: 'batch_console_99',
      status: 'queued',
      nClips: capturedBody.nClips ?? 3,
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  const result = await dispatchLongformFromProject(
    {
      projectId: 'proj-123',
      sourceAssetId: 'asset-456',
      nClips: 5,
      prompt: 'viral hooks only',
      songPolicy: 'auto',
    },
    mockFetch as typeof fetch,
  )

  assert.equal(result.batchJobId, 'batch_console_99')
  assert.equal(result.status, 'queued')
  assert.equal(result.nClips, 5)
  assert.equal(capturedBody.projectId, 'proj-123')
  assert.equal(capturedBody.sourceAssetId, 'asset-456')
  assert.equal(capturedBody.nClips, 5)
  assert.equal(capturedBody.prompt, 'viral hooks only')
}

async function run() {
  await testAllowlists()
  await testClientContract()
  await testConsoleDispatch()
  console.log('All Mini-Run Longform holistic tests passed!')
}
void run()