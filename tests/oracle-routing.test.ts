import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchMiniRunRender } from '../lib/server/mini-run-dispatch'
import {
  PRODUCTION_ORACLE_GATEWAY_URL,
  getMiniRunEnvironment,
  resolveMiniRunConfig,
} from '../lib/server/mini-run-proxy'

test('Oracle Gateway Routing - Environment resolution', () => {
  const env = getMiniRunEnvironment()
  assert.equal(env.MINI_RUN_AWS_API_URL, PRODUCTION_ORACLE_GATEWAY_URL)
  assert.equal(env.MINI_RUN_BACKEND_URL, PRODUCTION_ORACLE_GATEWAY_URL)
  assert.equal(resolveMiniRunConfig(env).baseUrl, 'https://prometheus-runner.taile46eb2.ts.net')
})

test('Oracle Gateway Routing - dispatchMiniRunRender re-routes to Oracle gateway contract', async () => {
  const calls: Array<{ url: string; method: string; headers: Headers; body: any }> = []

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method || 'GET'
    const headers = new Headers(init?.headers)
    const body = init?.body ? JSON.parse(String(init.body)) : null
    calls.push({ url, method, headers, body })

    if (url.endsWith('/api/process')) {
      return Response.json({
        jobId: 'oracle-job-001',
        sessionId: 'oracle-session-001',
        status: 'queued',
        urls: {
          status: 'https://prometheus-runner.taile46eb2.ts.net/api/session/oracle-session-001/status',
          preview: 'https://prometheus-runner.taile46eb2.ts.net/api/session/oracle-session-001/preview',
          render: 'https://prometheus-runner.taile46eb2.ts.net/api/session/oracle-session-001/render',
          events: 'https://prometheus-runner.taile46eb2.ts.net/api/session/oracle-session-001/events',
        },
      })
    }

    if (url.endsWith('/api/session/oracle-session-001/render')) {
      return Response.json({
        renderJobId: 'oracle-render-job-001',
        jobId: 'oracle-render-job-001',
        sessionId: 'oracle-session-001',
        status: 'queued',
      })
    }

    return Response.json({ error: `Not found: ${url}` }, { status: 404 })
  }

  const result = await dispatchMiniRunRender({
    request: {
      projectId: 'proj-123',
      sourceAssetId: 'asset-456',
      bucket: 'prometheus-sources',
      storagePath: 'raw-videos/clip1.mp4',
      mimeType: 'video/mp4',
      durationMs: 45000,
      width: 1080,
      height: 1920,
      prompt: 'Make an energetic vertical cut focusing on the speaker.',
      // Even if legacy callers attempt to pass transcripts, chunks, or draftManifest:
      draftManifest: { chunks: [] },
      transcriptSegments: [{ text: 'forbidden' }],
      words: [{ word: 'forbidden' }],
    },
    env: { MINI_RUN_AWS_API_URL: PRODUCTION_ORACLE_GATEWAY_URL },
    accessToken: 'valid-supabase-bearer-token',
    fetchImpl: mockFetch as unknown as typeof fetch,
  })

  // 1. Returns Oracle job and pipeline identifiers
  assert.equal(result.jobId, 'oracle-render-job-001')
  assert.equal(result.pipelineJobId, 'oracle-session-001')
  assert.equal(result.status, 'queued')

  // 2. Exactly 2 calls made: POST /api/process and POST /render
  assert.equal(calls.length, 2)

  // 3. First call was to Oracle POST /api/process
  const processCall = calls[0]
  assert.equal(processCall.url, 'https://prometheus-runner.taile46eb2.ts.net/api/process')
  assert.equal(processCall.method, 'POST')
  assert.equal(processCall.headers.get('authorization'), 'Bearer valid-supabase-bearer-token')

  // Intake Law Verification: client sends ONLY raw video references and creative prompt.
  // NO transcripts, word timestamps, chunks, manifests, or client userId in the payload.
  assert.equal(processCall.body.bucket, 'prometheus-sources')
  assert.equal(processCall.body.key, 'raw-videos/clip1.mp4')
  assert.equal(processCall.body.filename, 'clip1.mp4')
  assert.equal(processCall.body.contentType, 'video/mp4')
  assert.equal(processCall.body.metadata?.creativePrompt, 'Make an energetic vertical cut focusing on the speaker.')
  assert.equal(processCall.body.transcript, undefined)
  assert.equal(processCall.body.transcripts, undefined)
  assert.equal(processCall.body.chunks, undefined)
  assert.equal(processCall.body.draftManifest, undefined)
  assert.equal(processCall.body.words, undefined)
  assert.equal(processCall.body.userId, undefined)
  assert.equal(processCall.body.user_id, undefined)

  // 4. Second call was to Oracle POST render URL
  const renderCall = calls[1]
  assert.equal(renderCall.url, 'https://prometheus-runner.taile46eb2.ts.net/api/session/oracle-session-001/render')
  assert.equal(renderCall.method, 'POST')
  assert.equal(renderCall.headers.get('authorization'), 'Bearer valid-supabase-bearer-token')
})

test('Oracle Gateway Routing - Legacy Lambda fallback when explicitly configured with lambda URL', async () => {
  const calls: Array<{ url: string; method: string; headers: Headers; body: any }> = []

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method || 'GET'
    const headers = new Headers(init?.headers)
    const body = init?.body ? JSON.parse(String(init.body)) : null
    calls.push({ url, method, headers, body })

    return Response.json({
      jobId: 'legacy-lambda-job-777',
      pipelineJobId: 'legacy-pipe-777',
      status: 'queued',
    })
  }

  const result = await dispatchMiniRunRender({
    request: {
      projectId: 'proj-legacy',
      sourceAssetId: 'asset-legacy',
      bucket: 'prometheus-sources',
      storagePath: 'raw-videos/legacy.mp4',
      mimeType: 'video/mp4',
      durationMs: 30000,
      jobId: 'legacy-frontend-id',
      prompt: 'Legacy cut',
    },
    env: { MINI_RUN_AWS_API_URL: 'https://custom-service.lambda-url.us-east-1.on.aws' },
    accessToken: 'legacy-session-token',
    fetchImpl: mockFetch as unknown as typeof fetch,
  })

  assert.equal(result.jobId, 'legacy-lambda-job-777')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://custom-service.lambda-url.us-east-1.on.aws/api/pipeline/render')
  assert.equal(calls[0].headers.get('x-mini-run-user-token'), 'legacy-session-token')
  assert.equal(calls[0].headers.get('idempotency-key'), 'legacy-frontend-id')
})
