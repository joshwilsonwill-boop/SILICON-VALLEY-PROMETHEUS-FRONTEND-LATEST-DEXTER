import { unwrapWirePayload, wrapWireResponse } from '@/lib/crypto/wire-shield'

export type MiniRunEnvironment = Partial<
  Record<'MINI_RUN_AWS_API_URL' | 'MINI_RUN_BACKEND_URL', string | undefined>
>

export type MiniRunConfig = {
  baseUrl: string
}

const safeSegmentPattern = /^[A-Za-z0-9._~-]+$/

function requiredEnvironmentValue(env: MiniRunEnvironment, name: keyof MiniRunEnvironment) {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required for the Mini-Run AWS API.`)
  return value
}

// Re-routed to Oracle gateway (OCI) per user architecture directive.
export const PRODUCTION_ORACLE_GATEWAY_URL = 'https://prometheus-runner.taile46eb2.ts.net'
export const PRODUCTION_MINI_RUN_AWS_API_URL = PRODUCTION_ORACLE_GATEWAY_URL

export function getMiniRunEnvironment(override?: MiniRunEnvironment): MiniRunEnvironment {
  const configured =
    override?.MINI_RUN_AWS_API_URL?.trim() ||
    override?.MINI_RUN_BACKEND_URL?.trim() ||
    process.env.VITE_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.MINI_RUN_AWS_API_URL?.trim() ||
    process.env.MINI_RUN_BACKEND_URL?.trim() ||
    PRODUCTION_ORACLE_GATEWAY_URL

  return {
    MINI_RUN_AWS_API_URL: configured,
    MINI_RUN_BACKEND_URL: configured,
  }
}

/** Resolve the server-only Mini-Run API endpoint. Supports MINI_RUN_AWS_API_URL or MINI_RUN_BACKEND_URL. */
export function resolveMiniRunConfig(env: MiniRunEnvironment): MiniRunConfig {
  const configuredUrl = env.MINI_RUN_AWS_API_URL?.trim() || env.MINI_RUN_BACKEND_URL?.trim()
  if (!configuredUrl) {
    throw new Error('MINI_RUN_AWS_API_URL is required for the Mini-Run AWS API.')
  }
  const parsedUrl = new URL(configuredUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('MINI_RUN_AWS_API_URL must use HTTPS.')
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('MINI_RUN_AWS_API_URL must not contain embedded credentials.')
  }
  parsedUrl.search = ''
  parsedUrl.hash = ''

  return {baseUrl: parsedUrl.toString().replace(/\/+$/, '')}
}

export function miniRunUserHeaders(accessToken: string, initial?: HeadersInit) {
  const token = accessToken.trim()
  if (!token || /\s/.test(token)) {
    throw new Error('A valid Supabase access token is required for Mini-Run requests.')
  }
  const headers = new Headers(initial)
  headers.set('X-Mini-Run-User-Token', token)
  return headers
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

/** Allowlist for the Mini-Run API routes exposed by the frontend proxy. */
export function isAllowedMiniRunRequest(method: string, pathSegments: string[]) {
  if (!hasSafeSegments(pathSegments)) return false

  const normalizedMethod = method.toUpperCase()
  const path = pathSegments.join('/')
  if (normalizedMethod === 'GET' && path === 'health') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/plan') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/transcribe') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/chunk') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/video_chunker') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/matte') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/render') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/preview-slice') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/longform') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/url-ingest') return true
  if (normalizedMethod === 'POST' && path === 'api/pipeline/manifest/edit') return true
  if (
    normalizedMethod === 'GET' &&
    (/^api\/pipeline\/job\/[A-Za-z0-9._~-]+$/.test(path) ||
      /^api\/pipeline\/job\/[A-Za-z0-9._~-]+\/manifest$/.test(path) ||
      /^api\/pipeline\/longform\/[A-Za-z0-9._~-]+$/.test(path))
  ) {
    return true
  }
  return false
}

export async function buildMiniRunRequest({
  request,
  pathSegments,
  env,
  accessToken,
}: {
  request: Request
  pathSegments: string[]
  env: MiniRunEnvironment
  accessToken?: string
}): Promise<{url: string; init: RequestInit; isShielded?: boolean}> {
  if (!isAllowedMiniRunRequest(request.method, pathSegments)) {
    throw new Error('This Mini-Run pipeline route is not allowed.')
  }

  const config = resolveMiniRunConfig(env)
  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/')
  const isHealthCheck = request.method.toUpperCase() === 'GET' && pathSegments.join('/') === 'health'
  const headers = accessToken ? miniRunUserHeaders(accessToken) : new Headers()
  if (!isHealthCheck && !headers.has('X-Mini-Run-User-Token')) {
    throw new Error('A signed-in Mini-Run user session is required.')
  }
  for (const name of ['accept', 'content-type', 'range', 'idempotency-key']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  let body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text()
  let isShielded = false
  if (body) {
    try {
      const parsed = JSON.parse(body)
      const unwrapped = await unwrapWirePayload(parsed)
      if (unwrapped.isShielded) {
        body = JSON.stringify(unwrapped.data)
        isShielded = true
      }
    } catch {
      // Keep plain body
    }
  }

  return {
    url: `${config.baseUrl}/${encodedPath}`,
    init: {
      method: request.method.toUpperCase(),
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
    },
    isShielded,
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
  accessToken,
  fetchImpl = fetch,
}: {
  request: Request
  pathSegments: string[]
  env: MiniRunEnvironment
  accessToken?: string
  fetchImpl?: typeof fetch
}) {
  const outbound = await buildMiniRunRequest({request, pathSegments, env, accessToken})
  const upstream = await fetchImpl(outbound.url, outbound.init)

  if (request.method.toUpperCase() === 'GET' && /^api\/pipeline\/(job|longform)\/[A-Za-z0-9._~-]+$/.test(pathSegments.join('/')) && upstream.status === 303) {
    const location = upstream.headers.get('location')
    if (location) {
      const respObj = {
        jobId: pathSegments[pathSegments.length - 1],
        state: 'completed',
        status: 'completed',
        outputUrl: `/api/mini-run/job/${encodeURIComponent(pathSegments[pathSegments.length - 1])}/output`,
      }
      const finalBody = outbound.isShielded ? await wrapWireResponse(respObj, true) : respObj
      return Response.json(finalBody, {headers: {'Cache-Control': 'no-store'}})
    }
  }

  const contentType = upstream.headers.get('content-type') || ''
  if (outbound.isShielded && contentType.includes('application/json') && upstream.ok) {
    try {
      const upstreamJson = await upstream.json()
      const shieldedResponse = await wrapWireResponse(upstreamJson, true)
      return Response.json(shieldedResponse, {
        status: upstream.status,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      })
    } catch {
      // fallback to streaming raw upstream if JSON parse fails
    }
  }

  const headers = new Headers()
  for (const name of forwardedResponseHeaders) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has('cache-control')) headers.set('Cache-Control', 'no-store')

  return new Response(upstream.body, {status: upstream.status, statusText: upstream.statusText, headers})
}
