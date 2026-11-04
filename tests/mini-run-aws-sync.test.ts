import assert from 'node:assert/strict'

import {POST as mcpPost} from '../app/api/mcp/route'
import {buildMcpOAuthChallenge, buildMcpOAuthResourceMetadata, mcpProtectedResourceMetadataUrl} from '../lib/server/mcp-oauth'
import {buildMiniRunRenderPayload} from '../lib/server/mini-run-render-payload'
import {
  buildMiniRunRequest,
  getMiniRunEnvironment,
  miniRunUserHeaders,
  PRODUCTION_MINI_RUN_AWS_API_URL,
  proxyMiniRunRequest,
  resolveMiniRunConfig,
} from '../lib/server/mini-run-proxy'

async function run() {
  assert.equal(getMiniRunEnvironment().MINI_RUN_AWS_API_URL, PRODUCTION_MINI_RUN_AWS_API_URL)
  assert.equal(getMiniRunEnvironment().MINI_RUN_BACKEND_URL, PRODUCTION_MINI_RUN_AWS_API_URL)
  assert.equal(
    getMiniRunEnvironment({ MINI_RUN_AWS_API_URL: 'https://custom.lambda.test' }).MINI_RUN_AWS_API_URL,
    'https://custom.lambda.test'
  )
  assert.deepEqual(resolveMiniRunConfig(getMiniRunEnvironment()), {
    baseUrl: PRODUCTION_MINI_RUN_AWS_API_URL,
  })
  assert.deepEqual(resolveMiniRunConfig({MINI_RUN_AWS_API_URL: 'https://mini-run.aws.example.test/?ignored=1#fragment'}), {
    baseUrl: 'https://mini-run.aws.example.test',
  })
  assert.deepEqual(resolveMiniRunConfig({MINI_RUN_BACKEND_URL: 'https://mini-run.backend.example.test'}), {
    baseUrl: 'https://mini-run.backend.example.test',
  })
  assert.deepEqual(resolveMiniRunConfig({MINI_RUN_AWS_API_URL: 'https://aws.example.test', MINI_RUN_BACKEND_URL: 'https://backend.example.test'}), {
    baseUrl: 'https://aws.example.test',
  })
  assert.throws(() => resolveMiniRunConfig({}), /MINI_RUN_AWS_API_URL/)
  assert.throws(() => resolveMiniRunConfig({MINI_RUN_AWS_API_URL: 'http://mini-run.aws.example.test'}), /HTTPS/)
  assert.throws(() => resolveMiniRunConfig({MINI_RUN_AWS_API_URL: 'https://user:secret@mini-run.aws.example.test'}), /credentials/)

  const authHeaders = miniRunUserHeaders('user-token', {'Content-Type': 'application/json'})
  assert.equal(authHeaders.get('X-Mini-Run-User-Token'), 'user-token')
  assert.equal(authHeaders.get('Modal-Key'), null)

  const request = new Request('https://prometheus.example.test/api/mini-run/api/pipeline/render', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Cookie: 'browser-session=secret'},
    body: JSON.stringify({source: {url: 'https://cdn.example.test/source.mp4'}}),
  })
  const outbound = await buildMiniRunRequest({
    request,
    pathSegments: ['api', 'pipeline', 'render'],
    env: {MINI_RUN_AWS_API_URL: 'https://mini-run.aws.example.test'},
    accessToken: 'verified-user-token',
  })
  const outboundHeaders = new Headers(outbound.init.headers)
  assert.equal(outbound.url, 'https://mini-run.aws.example.test/api/pipeline/render')
  assert.equal(outboundHeaders.get('X-Mini-Run-User-Token'), 'verified-user-token')
  assert.equal(outboundHeaders.get('Cookie'), null)
  assert.equal(outboundHeaders.get('Modal-Key'), null)
  assert.equal(outboundHeaders.get('Modal-Secret'), null)
  assert.throws(() => miniRunUserHeaders('invalid token'), /valid Supabase access token/)

  const renderPayload = buildMiniRunRenderPayload({
    sourceUrl: 'https://storage.example.test/presigned/source.mp4',
    source: {durationMs: 60_000, width: 1920, height: 1080},
    shot: {preferredDurationSec: 30},
    jobId: 'source-job-1',
  })
  assert.equal(renderPayload.source, 'https://storage.example.test/presigned/source.mp4')
  assert.equal(typeof renderPayload.prompt, 'string')
  assert.equal('projectId' in renderPayload, false)
  assert.equal('sourceAssetId' in renderPayload, false)
  assert.equal('projectId' in (renderPayload.metadata as Record<string, unknown> || {}), false)

  let receivedToken: string | null = null
  const response = await proxyMiniRunRequest({
    request: new Request('https://prometheus.example.test/api/mini-run/api/pipeline/job/job_123'),
    pathSegments: ['api', 'pipeline', 'job', 'job_123'],
    env: {MINI_RUN_AWS_API_URL: 'https://mini-run.aws.example.test'},
    accessToken: 'verified-user-token',
    fetchImpl: async (_url, init) => {
      receivedToken = new Headers(init?.headers).get('X-Mini-Run-User-Token')
      return Response.json({jobId: 'job_123', state: 'queued'})
    },
  })
  assert.equal(response.status, 200)
  assert.equal(receivedToken, 'verified-user-token')

  await assert.rejects(() => buildMiniRunRequest({
    request: new Request('https://prometheus.example.test/api/mini-run/api/pipeline/render', {method: 'POST'}),
    pathSegments: ['api', 'pipeline', 'render'],
    env: {MINI_RUN_AWS_API_URL: 'https://mini-run.aws.example.test'},
  }), /signed-in Mini-Run user session/)

  const initialize = await mcpPost(new Request('https://prometheus.example.test/api/mcp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-03-26'}}),
  }))
  assert.equal(initialize.status, 401)
  assert.equal(initialize.headers.get('WWW-Authenticate'), 'Bearer resource_metadata="https://prometheus.example.test/.well-known/oauth-protected-resource/api/mcp"')

  const tools = await mcpPost(new Request('https://prometheus.example.test/api/mcp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', id: 2, method: 'tools/list'}),
  }))
  assert.equal(tools.status, 401)

  const unauthorizedTool = await mcpPost(new Request('https://prometheus.example.test/api/mcp', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({jsonrpc: '2.0', id: 3, method: 'tools/call', params: {name: 'list_my_source_videos', arguments: {}}}),
  }))
  assert.equal(unauthorizedTool.status, 401)

  assert.equal(mcpProtectedResourceMetadataUrl('https://prometheus.example.test/api/mcp'), 'https://prometheus.example.test/.well-known/oauth-protected-resource/api/mcp')
  assert.deepEqual(buildMcpOAuthResourceMetadata({
    requestUrl: 'https://prometheus.example.test/api/mcp',
    supabaseUrl: 'https://project-ref.supabase.co/',
  }), {
    resource: 'https://prometheus.example.test/api/mcp',
    authorization_servers: ['https://project-ref.supabase.co/auth/v1'],
    bearer_methods_supported: ['header'],
    resource_name: 'Prometheus Mini-Run',
  })
  assert.equal(buildMcpOAuthChallenge('https://prometheus.example.test/api/mcp'), 'Bearer resource_metadata="https://prometheus.example.test/.well-known/oauth-protected-resource/api/mcp"')

  console.log('Mini-Run AWS sync checks passed')
}

void run()
