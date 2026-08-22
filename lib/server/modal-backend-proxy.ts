export type ModalBackendTarget = 'mini-run' | 'landscape'

export type ModalBackendEnvironment = Partial<
  Record<
    | 'MINI_RUN_BACKEND_URL'
    | 'LANDSCAPE_BACKEND_URL'
    | 'MODAL_PROXY_KEY'
    | 'MODAL_PROXY_SECRET',
    string | undefined
  >
>

export type ModalBackendConfig = {
  target: ModalBackendTarget
  baseUrl: string
  proxyKey: string
  proxySecret: string
}

const safeSegmentPattern = /^[A-Za-z0-9._~-]+$/

const BACKEND_URL_ENV: Record<ModalBackendTarget, keyof ModalBackendEnvironment> = {
  'mini-run': 'MINI_RUN_BACKEND_URL',
  landscape: 'LANDSCAPE_BACKEND_URL',
}

function requiredEnvironmentValue(
  env: ModalBackendEnvironment,
  name: keyof ModalBackendEnvironment,
) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the Modal backend proxy.`)
  return value
}

export function resolveModalBackendConfig(
  env: ModalBackendEnvironment,
  target: ModalBackendTarget = 'mini-run',
): ModalBackendConfig {
  const configuredUrl = requiredEnvironmentValue(env, BACKEND_URL_ENV[target])
  const parsedUrl = new URL(configuredUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`${BACKEND_URL_ENV[target]} must use HTTPS.`)
  }
  parsedUrl.search = ''
  parsedUrl.hash = ''

  return {
    target,
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
 * Authoritative route tables for the two scale-to-zero Modal web servers.
 *
 * Mini-run (9:16 short-form, `modal_mini_run.py`): the pipeline endpoints.
 * Landscape (16:9 long-form, `modal_landscape.py`): runs, manifest, studio.
 * Neither serves `media/{filename}` anymore — final MP4s come back as an R2
 * `outputUrl` on the job receipt.
 */
export function isAllowedModalBackendRequest(
  method: string,
  pathSegments: string[],
  target: ModalBackendTarget = 'mini-run',
) {
  if (!hasSafeSegments(pathSegments)) return false

  const normalizedMethod = method.toUpperCase()
  const path = pathSegments.join('/')

  if (target === 'landscape') {
    if (normalizedMethod === 'GET' && path === 'health') return true
    if (normalizedMethod === 'GET' && path === 'api/status') return true
    if (normalizedMethod === 'GET' && path === 'api/runs') return true
    if (normalizedMethod === 'POST' && path === 'api/runs') return true
    if (normalizedMethod === 'GET' && /^api\/run\/[A-Za-z0-9_.~-]+$/.test(path)) return true
    if (normalizedMethod === 'GET' && path === 'api/manifest') return true
    if (normalizedMethod === 'GET' && /^p\/[A-Za-z0-9_.~-]+$/.test(path)) return true
    return normalizedMethod === 'GET' && path === 'landscape'
  }

  if (normalizedMethod === 'GET' && path === 'health') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/transcribe') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/chunk') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/video_chunker') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/matte') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/render') return true
  return normalizedMethod === 'GET' && /^api\/pipeline\/job\/[A-Za-z0-9_.~-]+$/.test(path)
}

export async function buildModalBackendRequest({
  request,
  pathSegments,
  env,
  target = 'mini-run',
}: {
  request: Request
  pathSegments: string[]
  env: ModalBackendEnvironment
  target?: ModalBackendTarget
}): Promise<{url: string; init: RequestInit}> {
  if (!isAllowedModalBackendRequest(request.method, pathSegments, target)) {
    throw new Error('This Modal backend route is not allowed.')
  }

  const config = resolveModalBackendConfig(env, target)
  const sourceUrl = new URL(request.url)
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
    url: `${config.baseUrl}/${encodedPath}${sourceUrl.search}`,
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

/**
 * Upstream latency budget. Mini-run enqueues are fast (30s is generous). The
 * landscape `POST /api/runs` is synchronous and runs the whole treatment
 * pipeline + optional L4 GPU bake, which can take 10+ minutes — it must not be
 * cut off by the proxy's default timeout.
 */
const MODAL_PROXY_TIMEOUT_MS = 30_000
const LANDSCAPE_RUN_TIMEOUT_MS = 15 * 60 * 1000

function modalProxyTimeoutFor(method: string, pathSegments: string[], target: ModalBackendTarget) {
  const path = pathSegments.join('/')
  if (target === 'landscape' && method.toUpperCase() === 'POST' && path === 'api/runs') {
    return LANDSCAPE_RUN_TIMEOUT_MS
  }
  return MODAL_PROXY_TIMEOUT_MS
}

export async function proxyModalBackendRequest({
  request,
  pathSegments,
  env,
  target = 'mini-run',
  fetchImpl = fetch,
}: {
  request: Request
  pathSegments: string[]
  env: ModalBackendEnvironment
  target?: ModalBackendTarget
  fetchImpl?: typeof fetch
}) {
  const outbound = await buildModalBackendRequest({request, pathSegments, env, target})
  const upstream = await fetchImpl(outbound.url, {
    ...outbound.init,
    signal: AbortSignal.timeout(modalProxyTimeoutFor(request.method, pathSegments, target)),
  })
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
