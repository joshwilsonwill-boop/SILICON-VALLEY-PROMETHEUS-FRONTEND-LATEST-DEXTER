export type MiniRunEnvironment = Partial<
  Record<'MINI_RUN_BACKEND_URL' | 'MODAL_PROXY_KEY' | 'MODAL_PROXY_SECRET', string | undefined>
>

export type MiniRunConfig = {
  baseUrl: string
  proxyKey: string
  proxySecret: string
}

const safeSegmentPattern = /^[A-Za-z0-9._~-]+$/

function requiredEnvironmentValue(env: MiniRunEnvironment, name: keyof MiniRunEnvironment) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the Mini-Run proxy.`)
  return value
}

/**
 * Resolve the Prometheus Mini-Runs Modal app config. This is a *separate* Modal
 * app (`prometheus-mini-run-studio`) from the source-analysis/render app
 * reached via `PROMETHEUS_BACKEND_URL`, but it lives in the same workspace, so
 * it authenticates with the same workspace-level Modal proxy credentials.
 */
export function resolveMiniRunConfig(env: MiniRunEnvironment): MiniRunConfig {
  const configuredUrl = requiredEnvironmentValue(env, 'MINI_RUN_BACKEND_URL')
  const parsedUrl = new URL(configuredUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('MINI_RUN_BACKEND_URL must use HTTPS.')
  }
  parsedUrl.search = ''
  parsedUrl.hash = ''

  return {
    baseUrl: parsedUrl.toString().replace(/\/+$/, ''),
    proxyKey: requiredEnvironmentValue(env, 'MODAL_PROXY_KEY'),
    proxySecret: requiredEnvironmentValue(env, 'MODAL_PROXY_SECRET'),
  }
}

function hasSafeSegments(pathSegments: string[]) {
  return (
    pathSegments.length > 0 &&
    pathSegments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== '.' &&
        segment !== '..' &&
        safeSegmentPattern.test(segment),
    )
  )
}

/**
 * Allowlist for the Mini-Runs gateway routes. Only these are reachable from the
 * browser through the server proxy; everything else is rejected so the proxy
 * never becomes an open door to the Modal app.
 */
export function isAllowedMiniRunRequest(method: string, pathSegments: string[]) {
  if (!hasSafeSegments(pathSegments)) return false

  const normalizedMethod = method.toUpperCase()
  const path = pathSegments.join('/')
  if (normalizedMethod === 'GET' && path === 'health') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/transcribe') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/chunk') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/video_chunker') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/matte') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/render') return true
  if (normalizedMethod === 'GET' && pathSegments[0] === 'media' && pathSegments.length > 1) return true
  if (
    normalizedMethod === 'GET' &&
    /^api\/pipeline\/job\/[A-Za-z0-9._~-]+$/.test(path)
  ) {
    return true
  }
  return false
}

export async function buildMiniRunRequest({
  request,
  pathSegments,
  env,
}: {
  request: Request
  pathSegments: string[]
  env: MiniRunEnvironment
}): Promise<{url: string; init: RequestInit}> {
  if (!isAllowedMiniRunRequest(request.method, pathSegments)) {
    throw new Error('This Mini-Run pipeline route is not allowed.')
  }

  const config = resolveMiniRunConfig(env)
  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/')
  const headers = new Headers({
    'Modal-Key': config.proxyKey,
    'Modal-Secret': config.proxySecret,
  })
  for (const name of ['accept', 'content-type', 'range']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  return {
    url: `${config.baseUrl}/${encodedPath}`,
    init: {
      method: request.method.toUpperCase(),
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
      redirect: 'manual',
    },
  }
}

const forwardedResponseHeaders = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'retry-after',
] as const

export async function proxyMiniRunRequest({
  request,
  pathSegments,
  env,
  fetchImpl = fetch,
}: {
  request: Request
  pathSegments: string[]
  env: MiniRunEnvironment
  fetchImpl?: typeof fetch
}) {
  const outbound = await buildMiniRunRequest({request, pathSegments, env})
  const upstream = await fetchImpl(outbound.url, outbound.init)
  const headers = new Headers()
  for (const name of forwardedResponseHeaders) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has('cache-control')) headers.set('Cache-Control', 'no-store')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  })
}
