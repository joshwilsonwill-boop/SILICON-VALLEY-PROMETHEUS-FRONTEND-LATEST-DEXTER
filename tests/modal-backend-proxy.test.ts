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
    PROMETHEUS_BACKEND_URL: 'https://joshuagreat965--api.modal.run/',
    MODAL_PROXY_KEY: 'wk-test-key',
    MODAL_PROXY_SECRET: 'ws-test-secret',
  }
  assert.deepEqual(proxy.resolveModalBackendConfig!(env), {
    baseUrl: 'https://joshuagreat965--api.modal.run',
    proxyKey: 'wk-test-key',
    proxySecret: 'ws-test-secret',
  })
  assert.throws(
    () => proxy.resolveModalBackendConfig!({...env, MODAL_PROXY_SECRET: ''}),
    /MODAL_PROXY_SECRET/,
  )

  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['health']), true)
  assert.equal(
    proxy.isAllowedModalBackendRequest!('POST', ['api', 'maul', 'text-chunks', 'preview']),
    true,
  )
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['api', 'render', 'jobs']), true)
  assert.equal(
    proxy.isAllowedModalBackendRequest!('GET', [
      'api',
      'render',
      'jobs',
      '123e4567-e89b-12d3-a456-426614174100',
      'calls',
      'fc-render-123',
    ]),
    true,
  )
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['media', 'job_final.mp4']), true)
  assert.equal(proxy.isAllowedModalBackendRequest!('POST', ['health']), false)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['api', 'admin']), false)
  assert.equal(proxy.isAllowedModalBackendRequest!('GET', ['media', '..']), false)

  const request = new Request('https://prometheusstudio.tech/api/modal-backend/api/render/jobs', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer browser-token',
      Cookie: 'session=browser-cookie',
      'Content-Type': 'application/json',
      'Modal-Key': 'browser-supplied-key',
    },
    body: JSON.stringify({manifest: {jobId: 'job-123'}}),
  })
  const outbound = await proxy.buildModalBackendRequest!({
    request: request.clone(),
    pathSegments: ['api', 'render', 'jobs'],
    env,
  })

  assert.equal(outbound.url, 'https://joshuagreat965--api.modal.run/api/render/jobs')
  assert.equal(outbound.init.method, 'POST')
  assert.equal(new Headers(outbound.init.headers).get('Modal-Key'), 'wk-test-key')
  assert.equal(new Headers(outbound.init.headers).get('Modal-Secret'), 'ws-test-secret')
  assert.equal(new Headers(outbound.init.headers).get('Authorization'), null)
  assert.equal(new Headers(outbound.init.headers).get('Cookie'), null)
  assert.deepEqual(JSON.parse(String(outbound.init.body)), {manifest: {jobId: 'job-123'}})

  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const response = await proxy.proxyModalBackendRequest!({
    request,
    pathSegments: ['api', 'render', 'jobs'],
    env,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url)
      capturedInit = init
      return new Response(JSON.stringify({callId: 'fc-render-123'}), {
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
  assert.deepEqual(await response.json(), {callId: 'fc-render-123'})
}

void run()
