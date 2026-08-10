import assert from 'node:assert/strict'

import {createModalBackendRouteHandler} from '@/lib/server/modal-backend-route'

async function main() {
  let proxyCalls = 0
  const request = new Request('https://prometheusstudio.tech/api/modal-backend/health')

  const unauthorized = createModalBackendRouteHandler({
    authenticate: async () => null,
    proxy: async () => {
      proxyCalls += 1
      return new Response('unexpected')
    },
  })
  const unauthorizedResponse = await unauthorized(request, ['health'])
  assert.equal(unauthorizedResponse.status, 401)
  assert.equal(proxyCalls, 0)

  const authorized = createModalBackendRouteHandler({
    authenticate: async () => ({id: 'user-1'}),
    proxy: async ({pathSegments}) => {
      proxyCalls += 1
      return Response.json({pathSegments}, {status: 202})
    },
  })
  const authorizedResponse = await authorized(request, ['health'])
  assert.equal(authorizedResponse.status, 202)
  assert.deepEqual(await authorizedResponse.json(), {pathSegments: ['health']})
  assert.equal(proxyCalls, 1)

  const rejected = createModalBackendRouteHandler({
    authenticate: async () => ({id: 'user-1'}),
    proxy: async () => {
      throw new Error('This Modal backend route is not allowed.')
    },
  })
  assert.equal((await rejected(request, ['admin'])).status, 404)

  const unavailable = createModalBackendRouteHandler({
    authenticate: async () => ({id: 'user-1'}),
    proxy: async () => {
      throw new Error('MODAL_PROXY_SECRET is required for the Modal backend proxy.')
    },
  })
  assert.equal((await unavailable(request, ['health'])).status, 503)
}

void main()
