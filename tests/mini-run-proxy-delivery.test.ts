import assert from 'node:assert/strict'

import {createMiniRunClient} from '../lib/api/mini-run'
import {fetchMiniRunMedia, isAllowedMiniRunMediaUrl} from '../lib/server/mini-run-delivery'
import { proxyMiniRunRequest } from '../lib/server/mini-run-proxy'

async function run() {
  assert.equal(isAllowedMiniRunMediaUrl('/api/pipeline/result', 'https://mini-run.example.test'), true)
  assert.equal(isAllowedMiniRunMediaUrl('https://cdn.r2.dev/video.mp4', 'https://mini-run.example.test'), true)
  assert.equal(isAllowedMiniRunMediaUrl('https://media.example.test/video.mp4', 'https://mini-run.example.test', 'media.example.test'), true)
  assert.equal(isAllowedMiniRunMediaUrl('http://127.0.0.1/video.mp4', 'https://mini-run.example.test'), false)
  assert.equal(isAllowedMiniRunMediaUrl('https://attacker.example/video.mp4', 'https://mini-run.example.test'), false)

  const requests: Array<{url: string; headers: Headers}> = []
  const delivered = await fetchMiniRunMedia({
    url: 'https://mini-run.example.test/api/pipeline/output',
    backendBaseUrl: 'https://mini-run.example.test',
    proxyHeaders: {'Modal-Key': 'server-only'},
    range: 'bytes=0-15',
    fetchImpl: async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      requests.push({url, headers})
      if (url === 'https://mini-run.example.test/api/pipeline/output') {
        return new Response(null, {status: 302, headers: {location: 'https://cdn.r2.dev/video.mp4'}})
      }
      return new Response('video bytes', {status: 206, headers: {'content-type': 'video/mp4'}})
    },
  })
  assert.equal(delivered.status, 206)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].headers.get('Modal-Key'), 'server-only')
  assert.equal(requests[1].headers.get('Modal-Key'), null)
  assert.equal(requests[1].headers.get('Range'), 'bytes=0-15')

  const client = createMiniRunClient(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/pipeline/job/single_123')) {
      return Response.json({jobId: 'single_123', state: 'completed', outputUrl: 'https://cdn.r2.dev/single.mp4'})
    }
    return Response.json({
      ok: true,
      batchJobId: 'batch_123',
      state: 'completed',
      returnvalue: {
        clips: [{
          clipIndex: 0,
          rank: 1,
          jobId: 'clip_123',
          window: {sourceStartMs: 0, sourceEndMs: 10000, durationMs: 10000},
          viralMetadata: {},
          success: true,
          outputUrl: 'https://cdn.r2.dev/clip.mp4',
        }],
      },
    })
  })
  const single = await client.getRenderStatus('single_123')
  const batch = await client.getLongformStatus('batch_123')
  assert.equal(single.outputUrl, '/api/mini-run/job/single_123/output')
  assert.equal(batch.clips?.[0].outputUrl, '/api/mini-run/job/clip_123/output')

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
  console.log('mini-run output delivery checks passed')
}

void run()
