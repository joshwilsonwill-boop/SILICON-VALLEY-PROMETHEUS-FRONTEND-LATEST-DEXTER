import assert from 'node:assert/strict'

type ProxyModule = typeof import('@/lib/server/modal-backend-proxy')

async function loadProxyModule(): Promise<Partial<ProxyModule>> {
  try {
    return await import('@/lib/server/modal-backend-proxy')
  } catch {
    return {}
  }
}

async function run() {
  const proxy = await loadProxyModule()

  assert.equal(typeof proxy.resolveModalBackendConfig, 'function')
  assert.equal(typeof proxy.isAllowedModalBackendRequest, 'function')
  assert.equal(typeof proxy.buildModalBackendRequest, 'function')
  assert.equal(typeof proxy.proxyModalBackendRequest, 'function')

  const env = {
    MINI_RUN_BACKEND_URL: 'https://joshuagreat965--mini-run.modal.run/',
    LANDSCAPE_BACKEND_URL: 'https://joshuagreat965--landscape-studio.modal.run/',
    MODAL_PROXY_KEY: 'wk-test-key',
    MODAL_PROXY_SECRET: 'ws-test-secret',
  }
  assert.deepEqual(proxy.resolveModalBackendConfig!(env, 'mini-run'), {
    target: 'mini-run',
    baseUrl: 'https://joshuagreat965--mini-run.modal.run',
    proxyKey: 'wk-test-key',
    proxySecret: 'ws-test-secret',
  })
  assert.deepEqual(proxy.resolveModalBackendConfig!(env, 'landscape'), {
    target: 'landscape',
    baseUrl: 'https://joshuagreat965--landscape-studio.modal.run',
    proxyKey: 'wk-test-key',
    proxySecret: 'ws-test-secret',
  })
  assert.throws(
    () => proxy.resolveModalBackendConfig!({...env, MODAL_PROXY_SECRET: ''}, 'mini-run'),
    /MODAL_PROXY_SECRET/,
  )
  assert.throws(
    () => proxy.resolveModalBackendConfig!({...env, MINI_RUN_BACKEND_URL: ''}, 'mini-run'),
    /MINI_RUN_BACKEND_URL/,
  )

  // Mini-run allow-list
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['health'], 'mini-run'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'pipeline', 'transcribe'], 'mini-run'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'pipeline', 'chunk'], 'mini-run'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'pipeline', 'video_chunker'], 'mini-run'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'pipeline', 'matte'], 'mini-run'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'pipeline', 'render'], 'mini-run'), true)
  assert.equal(
    proxy.isAllowedModalBackendRequest!('GET', ['api', 'pipeline', 'job', 'job_abc_123'], 'mini-run'),
    true,
  )
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'render', 'jobs'], 'mini-run'), false)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['media', 'job_final.mp4'], 'mini-run'), false)

  // Landscape allow-list
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['health'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['api', 'status'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['api', 'runs'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'runs'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['api', 'run', 'run-1'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['api', 'manifest'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['p', 'run-1'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['landscape'], 'landscape'), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'runs'], 'mini-run'), false)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['api', 'admin'], 'mini-run'), false)

  const request = new Request('https://prometheusstudio.tech/api/modal-backend/api/pipeline/render', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer browser-token',
      Cookie: 'session=browser-cookie',
      'Content-Type': 'application/json',
      'Modal-Key': 'browser-supplied-key',
    },
    body: JSON.stringify({source: 'https://example.com/video.mp4', metadata: {durationSec: 45}}),
  })
  const outbound = await proxy.buildModalBackendRequest!({
    request: request.clone(),
    pathSegments: ['api', 'pipeline', 'render'],
    target: 'mini-run',
    env,
  })

  assert.equal(outbound.url, 'https://joshuagreat965--mini-run.modal.run/api/pipeline/render')
  assert.equal(outbound.init.method, 'POST')
  assert.equal(new Headers(outbound.init.headers).get('Modal-Key'), 'wk-test-key')
  assert.equal(new Headers(outbound.init.headers).get('Modal-Secret'), 'ws-test-secret')
  assert.equal(new Headers(outbound.init.headers).get('Authorization'), null)
  assert.equal(new Headers(outbound.init.headers).get('Cookie'), null)
  assert.deepEqual(JSON.parse(String(outbound.init.body)), {
    source: 'https://example.com/video.mp4',
    metadata: {durationSec: 45},
  })

  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const response = await proxy.proxyModalBackendRequest!({
    request,
    pathSegments: ['api', 'pipeline', 'render'],
    target: 'mini-run',
    env,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url)
      capturedInit = init
      return new Response(JSON.stringify({jobId: 'job_1_2', status: 'queued'}), {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '2',
          'X-Internal-Header': 'must-not-leak',
        },
      })
    },
  })

  assert.equal(capturedUrl, outbound.url)
  assert.equal(new Headers(capturedInit?.headers).get('Modal-Key'), 'wk-test-key')
  assert.equal(response.status, 202)
  assert.equal(response.headers.get('Content-Type'), 'application/json')
  assert.equal(response.headers.get('Retry-After'), '2')
  assert.equal(response.headers.get('X-Internal-Header'), null)
  assert.deepEqual(await response.json(), {jobId: 'job_1_2', status: 'queued'})
}

void run()
