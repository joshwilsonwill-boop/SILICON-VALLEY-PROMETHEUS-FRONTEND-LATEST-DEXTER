import {createModalBackendRouteHandler} from '@/lib/server/modal-backend-route'
import {proxyModalBackendRequest} from '@/lib/server/modal-backend-proxy'
import {createClient} from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{path: string[]}>
}

const handleModalBackendRequest = createModalBackendRouteHandler({
  authenticate: async () => {
    const supabase = await createClient()
    const {
      data: {user},
      error,
    } = await supabase.auth.getUser()
    return error ? null : user
  },
  proxy: ({request, pathSegments}) =>
    proxyModalBackendRequest({
      request,
      pathSegments,
      env: {
        PROMETHEUS_BACKEND_URL: process.env.PROMETHEUS_BACKEND_URL,
        MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
        MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
      },
    }),
})

async function handle(request: Request, context: RouteContext) {
  const {path} = await context.params
  return handleModalBackendRequest(request, path)
}

export const GET = handle
export const POST = handle
