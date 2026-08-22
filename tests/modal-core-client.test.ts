import assert from 'node:assert/strict'

import {createModalCoreClient} from '@/lib/api/modal-core'

async function main() {
  const calls: Array<{url: string; init?: RequestInit}> = []
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({url, init})
    if (url.endsWith('/api/pipeline/render')) {
      return Response.json(
        {jobId: 'job_abc_123', status: 'queued', pipeline: 'maul', pipelineJobId: 'maul:replay-1'},
        {status: 202},
      )
    }
    if (url.includes('/api/pipeline/job/')) {
      return Response.json({
        ok: true,
        state: 'completed',
        status: 'completed',
        returnvalue: {outputUrl: 'https://r2.example.com/final.mp4'},
      })
    }
    if (url.includes('/api/landscape-backend/api/runs') && init?.method === 'POST') {
      return Response.json({ok: true, status: 'queued', runId: 'run-1'}, {status: 202})
    }
    if (url.endsWith('/api/landscape-backend/api/runs')) {
      return Response.json([{runId: 'run-1'}])
    }
    if (url.endsWith('/api/landscape-backend/health')) return Response.json({ok: true})
    if (url.endsWith('/health')) return Response.json({ok: true})
    if (url.endsWith('/api/pipeline/chunk')) {
      return Response.json({chunks: [{text: 'Ship it'}]})
    }
    if (url.endsWith('/p/run-1') || url.endsWith('/landscape')) {
      return new Response('<html><body>studio</body></html>', {headers: {'Content-Type': 'text/html'}})
    }
    if (url.includes('/api/run/')) {
      return Response.json({runId: 'run-1', stage: 'complete'})
    }
    return Response.json({ok: true})
  }

  const client = createModalCoreClient(fetchImpl)
  assert.deepEqual(await client.health(), {ok: true})
  assert.deepEqual(await client.landscapeHealth(), {ok: true})
  assert.deepEqual(await client.chunk({transcript: {text: 'Ship it'}}), {chunks: [{text: 'Ship it'}]})

  const submission = await client.dispatchRender({
    source: 'https://example.com/video.mp4',
    metadata: {durationSec: 45, width: 1080, height: 1920},
  })
  assert.equal(submission.jobId, 'job_abc_123')
  assert.equal(submission.pipeline, 'maul')

  const status = await client.getPipelineJob('job_abc_123')
  assert.equal(status.state, 'completed')
  assert.equal(status.returnvalue?.outputUrl, 'https://r2.example.com/final.mp4')

  const run = await client.startRun({input_path: 'https://example.com/video.mp4', bake: true})
  assert.equal(run.runId, 'run-1')

  const runs = await client.listRuns()
  assert.equal(runs.length, 1)

  const runData = await client.getRun('run-1')
  assert.equal(runData.stage, 'complete')

  const page = await client.getLandscapePage('run-1')
  assert.match(page, /studio/)
  const template = await client.getLandscapeTemplate()
  assert.match(template, /studio/)

  assert.equal(calls[0]?.url, '/api/modal-backend/health')
  const chunkCall = calls.find((call) => call.url.endsWith('/api/pipeline/chunk'))
  assert.equal(chunkCall?.init?.credentials, 'same-origin')
  assert.equal(
    chunkCall?.init?.headers && new Headers(chunkCall.init.headers).get('content-type'),
    'application/json',
  )

  const failingClient = createModalCoreClient(async () =>
    Response.json({error: 'Bad manifest'}, {status: 400}),
  )
  await assert.rejects(() => failingClient.dispatchRender({source: 'x'}), /Bad manifest/)
}

void main()
