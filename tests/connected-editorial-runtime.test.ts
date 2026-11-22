import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import ts from 'typescript'

function load(path: string, imports: Record<string, any> = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText
  const module = {exports: {} as any}
  new Function('require', 'module', 'exports', compiled)((name: string) => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`)
    return imports[name]
  }, module, module.exports)
  return module.exports
}
const payloadModule = load('lib/server/mini-run-render-payload.ts')
const proxy = load('lib/server/mini-run-proxy.ts', {'@/lib/crypto/wire-shield': {}})
const source = 'https://media.example.test/raw.mp4'
const shot = {sourceStartMs: 12000, sourceEndMs: 42000, brollPreference: 'broll_cutaway',
  motionGraphicsPreference: 'cinematic', songPolicy: 'auto', songTitle: 'Blue Horizon',
  songArtist: 'Example Artist', brandPreferences: {palette: 'deep blue'}}

test('raw transport preserves creative directives without injecting prepared editorial decisions', () => {
  const payload = payloadModule.buildMiniRunRenderPayload({sourceUrl: source,
    source: {durationMs: 90000}, shot, jobId: 'frontend-123', prompt: 'Follow the speaker’s argument.',
    draftManifest: {chunks: [{text: 'injected draft'}]}, transcriptSegments: ['injected transcript'],
    words: ['injected words'], textLayers: [{text: 'injected text layer'}], quality: 'maximum'})
  assert.deepEqual(Object.keys(payload).sort(), ['prompt', 'source'])
  assert.equal(payload.source, source)
  for (const value of ['Follow the speaker’s argument.', 'Use source window from 12000 ms through 42000 ms.',
    'broll_cutaway', 'cinematic', 'Blue Horizon', 'Example Artist', 'deep blue', 'maximum']) {
    assert.ok(payload.prompt.includes(value), `Missing user directive: ${value}`)
  }
  assert.doesNotMatch(payload.prompt, /injected (draft|transcript|words|text layer)/)
})

test('server export dispatch sends exact raw body, session auth and stable frontend job key', async () => {
  const {dispatchMiniRunRender} = load('lib/server/mini-run-dispatch.ts', {
    '@/lib/r2/presigned-url': {}, '@/lib/server/mini-run-proxy': proxy,
    '@/lib/server/mini-run-render-payload': payloadModule,
    '@/lib/oracle': {},
  })
  const received: Array<{body: any; headers: Headers}> = []
  for (let attempt = 0; attempt < 2; attempt++) {
    await dispatchMiniRunRender({request: {projectId: 'project-1', sourceAssetId: 'asset-1',
      bucket: '', storagePath: source, mimeType: 'video/mp4', durationMs: 90000,
      jobId: 'frontend-123', shot, prompt: 'Causal editorial treatment.', draftManifest: {chunks: []}},
    env: {MINI_RUN_AWS_API_URL: 'https://current-runtime.example.test'}, accessToken: 'session-token',
    fetchImpl: async (url: string, init: RequestInit) => {
      assert.equal(url, 'https://current-runtime.example.test/api/pipeline/render')
      received.push({body: JSON.parse(String(init.body)), headers: new Headers(init.headers)})
      return Response.json({jobId: 'cloud-123', status: 'queued'})
    }})
  }
  for (const request of received) {
    assert.deepEqual(Object.keys(request.body).sort(), ['prompt', 'source'])
    assert.equal(request.headers.get('Idempotency-Key'), 'frontend-123')
    assert.equal(request.headers.get('X-Mini-Run-User-Token'), 'session-token')
  }
})

test('owned project dispatch route uses the raw transport and sends its generated job key', async (t) => {
  let outbound: {body: any; headers: Headers} | undefined
  t.mock.method(globalThis, 'fetch', async (_url: any, init: any) => {
    outbound = {body: JSON.parse(init.body), headers: new Headers(init.headers)}
    return Response.json({jobId: outbound.headers.get('Idempotency-Key'), status: 'queued'})
  })
  const query: any = {select: () => query, eq: () => query,
    maybeSingle: async () => ({data: {id: 'asset-1', storage_path: source, duration_ms: 90000}})}
  const {POST} = load('app/api/mini-run/dispatch/route.ts', {
    'next/server': {NextResponse: Response},
    '@/lib/projects/service': {ProjectService: {getProject: async () => ({id: 'project-1', sourceAssetId: 'asset-1'})}},
    '@/lib/server/mini-run-render-payload': payloadModule,
    '@/lib/server/mini-run-dispatch': {buildMiniRunSourceUrl: async () => source},
    '@/lib/server/mini-run-proxy': {...proxy, getMiniRunEnvironment: () => ({MINI_RUN_AWS_API_URL: 'https://current-runtime.example.test'})},
    '@/lib/oracle': {},
    '@/lib/supabase/server': {createClient: async () => ({from: () => query, auth: {
      getUser: async () => ({data: {user: {id: 'owner-1'}}}),
      getSession: async () => ({data: {session: {access_token: 'session-token'}}}),
    }})}, '@/lib/supabase/dev-bypass': {isDevBypassActive: () => false},
  })
  const response = await POST(new Request('https://frontend.example.test/api/mini-run/dispatch', {
    method: 'POST', body: JSON.stringify({projectId: 'project-1', sourceAssetId: 'asset-1', shot,
      prompt: 'Causal editorial treatment.', draftManifest: {chunks: [{text: 'injected draft'}]}}),
  }))
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.deepEqual(Object.keys(outbound!.body).sort(), ['prompt', 'source'])
  assert.equal(outbound!.headers.get('Idempotency-Key'), result.jobId)
  assert.ok(result.jobId)
  assert.equal(outbound!.headers.get('X-Mini-Run-User-Token'), 'session-token')
})

test('missing runtime configuration cannot silently route to the old gateway', () => {
  assert.throws(() => proxy.resolveMiniRunConfig({}), /required/)
  assert.notEqual(
    proxy.getMiniRunEnvironment().MINI_RUN_AWS_API_URL,
    'https://fb2ehi5jgjh6tue43q5vfwvmxy0rspjd.lambda-url.us-east-1.on.aws',
  )
})

test('source window is bounded while preview props stay independent of raw dispatch', () => {
  const payload = payloadModule.buildMiniRunRenderPayload({sourceUrl: source,
    source: {durationMs: 25000}, shot: {sourceStartMs: -4000, sourceEndMs: 90000, songPolicy: 'disabled'},
    jobId: 'frontend-window'})
  assert.match(payload.prompt, /^Use source window from 0 ms through 25000 ms\.$/m)
  assert.match(payload.prompt, /Music policy: disabled/)
  const chunks = [{text: 'Preview only', startMs: 0, endMs: 1200}]
  const preview = payloadModule.buildPrometheusMinRunProps({sourcePath: source, chunks, effectiveDurationMs: 1200})
  assert.equal(preview.videoSrc, source)
  assert.equal(preview.chunks, chunks)
  assert.equal(preview.durationMs, 1200)
})

test('generic authenticated proxy preserves the caller idempotency key', async () => {
  const request = new Request('https://frontend.example.test/api/mini-run/api/pipeline/render', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'Idempotency-Key': 'frontend-proxy-1'},
    body: JSON.stringify({source, prompt: 'Create a cinematic mini-run.'}),
  })
  const outbound = await proxy.buildMiniRunRequest({request,
    pathSegments: ['api', 'pipeline', 'render'], accessToken: 'session-token',
    env: {MINI_RUN_AWS_API_URL: 'https://current-runtime.example.test'}})
  const headers = new Headers(outbound.init.headers)
  assert.equal(headers.get('Idempotency-Key'), 'frontend-proxy-1')
  assert.equal(headers.get('X-Mini-Run-User-Token'), 'session-token')
})
