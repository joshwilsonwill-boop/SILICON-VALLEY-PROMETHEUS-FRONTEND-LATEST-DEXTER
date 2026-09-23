import {NextResponse} from 'next/server'

import {proxyMiniRunRequest} from '@/lib/server/mini-run-proxy'
import {createClient} from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {params: Promise<{path: string[]}>}

async function handleMiniRun(request: Request, params: {path: string[]}) {
  const rawPath = params.path || []
  const joinedPath = rawPath.join('/')
  const isHealthCheck = request.method.toUpperCase() === 'GET' && joinedPath === 'health'

  // Pipeline execution endpoints must be protected: verify authenticated session
  if (!isHealthCheck) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // The environment is resolved lazily by the proxy; fail fast with a clear
  // status when the Mini-Runs app is not configured for this deployment.
  if (!process.env.MINI_RUN_BACKEND_URL) {
    return NextResponse.json(
      {error: 'MINI_RUN_BACKEND_URL is not configured.', code: 'MINI_RUN_NOT_CONFIGURED'},
      {status: 503},
    )
  }

  try {
    return await proxyMiniRunRequest({
      request,
      pathSegments: params.path,
      env: {
        MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
        MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
        MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
      },
    })
  } catch (error) {
    console.error('[api/mini-run] proxy error:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Mini-Run proxy failed.'},
      {status: 500},
    )
  }
}

export async function GET(request: Request, context: RouteContext) {
  return handleMiniRun(request, await context.params)
}

export async function POST(request: Request, context: RouteContext) {
  return handleMiniRun(request, await context.params)
}

export async function HEAD(request: Request, context: RouteContext) {
  return handleMiniRun(request, await context.params)
}
