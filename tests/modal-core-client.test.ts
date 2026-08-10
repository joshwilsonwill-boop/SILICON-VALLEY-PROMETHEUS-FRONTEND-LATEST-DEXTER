import assert from 'node:assert/strict'

import {createModalCoreClient} from '@/lib/api/modal-core'

async function main() {
  const calls: Array<{url: string; init?: RequestInit}> = []
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({url, init})
    if (url.endsWith('/api/render/jobs')) {
      return Response.json(
        {jobId: 'job-1', callId: 'call-1', status: 'queued', statusUrl: '/upstream'},
        {status: 202},
      )
    }
    if (url.includes('/calls/')) {
      return Response.json({
        jobId: 'job-1',
        callId: 'call-1',
        status: 'completed',
        outputUrl: '/media/final.mp4',
      })
    }
    if (url.endsWith('/health')) return Response.json({ok: true})
    return Response.json({chunks: [{text: 'Ship it'}]})
  }

  const client = createModalCoreClient(fetchImpl)
  assert.deepEqual(await client.health(), {ok: true})
  assert.deepEqual(await client.previewTextChunks({transcript: {text: 'Ship it'}}), {
    chunks: [{text: 'Ship it'}],
  })

  const submission = await client.dispatchRender({jobId: 'job-1'})
  assert.equal(submission.statusUrl, '/api/modal-backend/api/render/jobs/job-1/calls/call-1')

  const status = await client.getRenderStatus('job-1', 'call-1')
  assert.equal(status.outputUrl, '/api/modal-backend/media/final.mp4')
  assert.equal(client.getMediaUrl('another_final.mp4'), '/api/modal-backend/media/another_final.mp4')
  assert.throws(() => client.getMediaUrl('../secret'), /Invalid media filename/)

  assert.equal(calls[0]?.url, '/api/modal-backend/health')
  assert.equal(calls[1]?.init?.credentials, 'same-origin')
  assert.equal(calls[1]?.init?.headers && new Headers(calls[1].init.headers).get('content-type'), 'application/json')

  const failingClient = createModalCoreClient(async () =>
    Response.json({error: 'Bad manifest'}, {status: 400}),
  )
  await assert.rejects(() => failingClient.dispatchRender({}), /Bad manifest/)
}

void main()
