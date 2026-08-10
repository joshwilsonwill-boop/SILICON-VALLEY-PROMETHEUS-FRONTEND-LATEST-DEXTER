type AuthenticatedUser = {id: string}

type ProxyRequest = {
  request: Request
  pathSegments: string[]
}

type RouteDependencies = {
  authenticate: () => Promise<AuthenticatedUser | null>
  proxy: (request: ProxyRequest) => Promise<Response>
}

function jsonError(message: string, status: number) {
  return Response.json({error: message}, {status})
}

export function createModalBackendRouteHandler({authenticate, proxy}: RouteDependencies) {
  return async (request: Request, pathSegments: string[]) => {
    const user = await authenticate()
    if (!user) return jsonError('Unauthorized', 401)

    try {
      return await proxy({request, pathSegments})
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'This Modal backend route is not allowed.') {
        return jsonError('Not found', 404)
      }
      if (message.includes('required for the Modal backend proxy')) {
        console.error('[Modal backend configuration error]', message)
        return jsonError('Backend unavailable', 503)
      }

      console.error('[Modal backend proxy error]', error)
      return jsonError('Backend request failed', 502)
    }
  }
}
