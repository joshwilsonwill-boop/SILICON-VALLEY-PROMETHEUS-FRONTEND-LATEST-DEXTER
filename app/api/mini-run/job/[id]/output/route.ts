import {NextResponse} from 'next/server'

import {resolveMiniRunConfig} from '@/lib/server/mini-run-proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const safeIdentifierPattern = /^[A-Za-z0-9._~-]+$/
const forwardedResponseHeaders = [
  'accept-ranges',
  'cache-control',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
  'etag',
] as const

function upstreamHeaders(config: ReturnType<typeof resolveMiniRunConfig>) {
  return {
    'Modal-Key': config.proxyKey,
    'Modal-Secret': config.proxySecret,
  }
}

function outputUrlFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const record = payload as Record<string, unknown>
  if (typeof record.outputUrl === 'string' && record.outputUrl) return record.outputUrl
  return outputUrlFromPayload(record.returnvalue ?? record.response ?? null)
}

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  if (!safeIdentifierPattern.test(id)) {
    return NextResponse.json({error: 'Invalid Mini-Run job id.'}, {status: 400})
  }

  try {
    const config = resolveMiniRunConfig({
      MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
      MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
      MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
    })
    const statusUrl = `${config.baseUrl}/api/pipeline/job/${encodeURIComponent(id)}`
    const statusResponse = await fetch(statusUrl, {
      headers: upstreamHeaders(config),
      redirect: 'manual',
      cache: 'no-store',
    })
    const location = statusResponse.headers.get('location')

    if (statusResponse.status !== 303 || !location) {
      return NextResponse.json(
        {error: 'Mini-Run output is not ready.', status: statusResponse.status},
        {status: statusResponse.status === 404 ? 404 : 409},
      )
    }

    const handoffUrl = new URL(location, statusUrl)
    let mediaResponse = await fetch(handoffUrl, {
      headers: handoffUrl.origin === config.baseUrl ? upstreamHeaders(config) : undefined,
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!mediaResponse.ok || !mediaResponse.body) {
      return NextResponse.json(
        {error: `Mini-Run output handoff returned HTTP ${mediaResponse.status}.`},
        {status: 502},
      )
    }

    if (mediaResponse.headers.get('content-type')?.includes('application/json')) {
      const payload = await mediaResponse.json()
      const outputUrl = outputUrlFromPayload(payload)
      if (!outputUrl) {
        return NextResponse.json({error: 'Mini-Run handoff returned no MP4 URL.'}, {status: 502})
      }
      const mediaUrl = new URL(outputUrl, handoffUrl)
      mediaResponse = await fetch(mediaUrl, {
        headers: mediaUrl.origin === config.baseUrl ? upstreamHeaders(config) : undefined,
        redirect: 'follow',
        cache: 'no-store',
      })
      if (!mediaResponse.ok || !mediaResponse.body) {
        return NextResponse.json(
          {error: `Mini-Run MP4 delivery returned HTTP ${mediaResponse.status}.`},
          {status: 502},
        )
      }
    }

    const headers = new Headers({'Cache-Control': 'no-store'})
    for (const name of forwardedResponseHeaders) {
      const value = mediaResponse.headers.get(name)
      if (value) headers.set(name, value)
    }
    if (!headers.has('content-type')) headers.set('content-type', 'video/mp4')

    return new Response(mediaResponse.body, {
      status: mediaResponse.status,
      headers,
    })
  } catch (error) {
    console.error('[api/mini-run/job/output] error:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Unable to fetch Mini-Run output.'},
      {status: 502},
    )
  }
}
