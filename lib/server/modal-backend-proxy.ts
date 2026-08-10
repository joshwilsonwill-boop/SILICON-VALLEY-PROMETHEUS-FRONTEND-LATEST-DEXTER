type ModalBackendEnvironment = Partial<
  Record<'PROMETHEUS_BACKEND_URL' | 'MODAL_PROXY_KEY' | 'MODAL_PROXY_SECRET', string | undefined>
>

export type ModalBackendConfig = {
  baseUrl: string
  proxyKey: string
  proxySecret: string
}

const safeSegmentPattern = /^[A-Za-z0-9._~-]+$/

function requiredEnvironmentValue(
  env: ModalBackendEnvironment,
  name: keyof ModalBackendEnvironment,
) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the Modal backend proxy.`)
  return value
}

export function resolveModalBackendConfig(env: ModalBackendEnvironment): ModalBackendConfig {
  const configuredUrl = requiredEnvironmentValue(env, 'PROMETHEUS_BACKEND_URL')
  const parsedUrl = new URL(configuredUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('PROMETHEUS_BACKEND_URL must use HTTPS.')
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

export function isAllowedModalBackendRequest(method: string, pathSegments: string[]) {
  if (!hasSafeSegments(pathSegments)) return false

  const normalizedMethod = method.toUpperCase()
  const path = pathSegments.join('/')
  if (normalizedMethod === 'GET' && path === 'health') return true
  if (normalizedMethod === 'POST' && path === 'api/maul/text-chunks/preview') return true
  if (normalizedMethod === 'POST' && path === 'api/render/jobs') return true
  if (
    normalizedMethod === 'GET' &&
    /^api\/render\/jobs\/[A-Za-z0-9._~-]+\/calls\/[A-Za-z0-9._~-]+$/.test(path)
  ) {
    return true
  }
  return normalizedMethod === 'GET' && /^media\/[A-Za-z0-9._~-]+$/.test(path)
}

export async function buildModalBackendRequest({
  request,
  pathSegments,
  env,
}: {
  request: Request
  pathSegments: string[]
  env: ModalBackendEnvironment
}): Promise<{url: string; init: RequestInit}> {
  if (!isAllowedModalBackendRequest(request.method, pathSegments)) {
    throw new Error('This Modal backend route is not allowed.')
  }

  const config = resolveModalBackendConfig(env)
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

export async function proxyModalBackendRequest({
  request,
  pathSegments,
  env,
  fetchImpl = fetch,
}: {
  request: Request
  pathSegments: string[]
  env: ModalBackendEnvironment
  fetchImpl?: typeof fetch
}) {
  const outbound = await buildModalBackendRequest({request, pathSegments, env})
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
