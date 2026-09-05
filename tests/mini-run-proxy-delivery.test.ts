import assert from 'node:assert/strict'

import { proxyMiniRunRequest } from '../lib/server/mini-run-proxy'

async function run() {
  const response = await proxyMiniRunRequest({
    request: new Request('https://prometheusstudio.tech/api/mini-run/api/pipeline/job/job_123', {method: 'GET'}),
    pathSegments: ['api', 'pipeline', 'job', 'job_123'],
    env: {
      MINI_RUN_BACKEND_URL: 'https://mini-run.example.test',
      MODAL_PROXY_KEY: 'test-key',
      MODAL_PROXY_SECRET: 'test-secret',
    },
    fetchImpl: async () => new Response(null, {
      status: 303,
      headers: {location: '/api/pipeline/job/job_123?attempt=complete'},
    }),
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    jobId: 'job_123',
    state: 'completed',
    status: 'completed',
    outputUrl: '/api/mini-run/job/job_123/output',
  })
}

void run()
