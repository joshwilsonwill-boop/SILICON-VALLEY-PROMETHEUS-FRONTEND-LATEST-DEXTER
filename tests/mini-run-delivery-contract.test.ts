import assert from 'node:assert/strict'

import { createMiniRunClient } from '../lib/api/mini-run'
import {
  buildMiniRunRenderPayload,
  MINI_RUN_MAX_DURATION_MS,
  MINI_RUN_MIN_DURATION_MS,
} from '../lib/server/mini-run-render-payload'

async function run() {
  const payload = buildMiniRunRenderPayload({
    sourceUrl: 'https://example.test/source.mp4',
    source: { durationMs: 3_600_000, width: 1920, height: 1080 },
    shot: {
      pipeline: 'joseph',
      sourceStartMs: 15_000,
      preferredDurationSec: 180,
      targetChunkWords: 3,
      maxChunkWords: 5,
      canvasWidth: 3840,
      canvasHeight: 2160,
    },
    jobId: 'render-123',
  })

  assert.equal((payload.metadata as { pipeline: string }).pipeline, 'maul')
  assert.equal((payload.metadata as { durationMs: number }).durationMs, MINI_RUN_MAX_DURATION_MS)
  assert.deepEqual(payload.design, { canvasWidth: 1080, canvasHeight: 1920 })
  assert.deepEqual(payload.selectedWindow, { sourceStartMs: 15_000, sourceEndMs: 195_000 })

  const preferredPayload = buildMiniRunRenderPayload({
    sourceUrl: 'https://example.test/long-source.mp4',
    source: { durationMs: 3_600_000 },
    shot: {
      preferredDurationSec: 45,
      sourceStartMs: 0,
      targetChunkWords: 3,
      maxChunkWords: 5,
      canvasWidth: 1080,
      canvasHeight: 1920,
    },
    jobId: 'preferred-length',
  })
  assert.equal((preferredPayload.metadata as { durationMs: number }).durationMs, 45_000)

  const minimumPayload = buildMiniRunRenderPayload({
    sourceUrl: 'https://example.test/short-source.mp4',
    source: { durationMs: 120_000 },
    shot: {
      preferredDurationSec: 1,
      targetChunkWords: 3,
      maxChunkWords: 5,
      canvasWidth: 1080,
      canvasHeight: 1920,
    },
    jobId: 'minimum-length',
  })
  assert.equal((minimumPayload.metadata as { durationMs: number }).durationMs, MINI_RUN_MIN_DURATION_MS)

  const endOfSourcePayload = buildMiniRunRenderPayload({
    sourceUrl: 'https://example.test/short-source.mp4',
    source: { durationMs: 18_000 },
    shot: { sourceStartMs: 10_000, sourceEndMs: 90_000 },
    jobId: 'render-456',
  })
  assert.equal((endOfSourcePayload.metadata as { durationMs: number }).durationMs, 8_000)
  assert.deepEqual(endOfSourcePayload.selectedWindow, { sourceStartMs: 10_000, sourceEndMs: 18_000 })

  const client = createMiniRunClient(async () =>
    new Response(JSON.stringify({
      jobId: 'render-789',
      state: 'completed',
      outputUrl: 'https://cdn.example.test/short.mp4',
      chunkCount: 12,
    }), { headers: { 'Content-Type': 'application/json' } }),
  )
  const status = await client.getRenderStatus('render-789')
  assert.equal(status.outputUrl, 'https://cdn.example.test/short.mp4')
  assert.equal(status.chunkCount, 12)

  // Longform batch client dispatch and status contracts
  let longformDispatchedUrl = ''
  let longformDispatchedBody: Record<string, unknown> = {}
  const longformClient = createMiniRunClient(async (input, init) => {
    longformDispatchedUrl = String(input)
    if (init?.body) {
      longformDispatchedBody = JSON.parse(String(init.body))
    }
    if (longformDispatchedUrl.endsWith('/api/pipeline/longform')) {
      return new Response(JSON.stringify({
        batchJobId: 'batch_xyz_789',
        status: 'queued',
        nClips: 3,
        pollUrl: '/api/pipeline/longform/batch_xyz_789',
      }), { headers: { 'Content-Type': 'application/json' } })
    }
    if (longformDispatchedUrl.includes('/api/pipeline/longform/batch_xyz_789')) {
      return new Response(JSON.stringify({
        ok: true,
        batchJobId: 'batch_xyz_789',
        state: 'completed',
        status: 'completed',
        returnvalue: {
          batchId: 'batch_xyz_789_batch',
          clipCount: 3,
          succeeded: 3,
          clips: [
            {
              clipIndex: 0,
              rank: 1,
              jobId: 'batch_xyz_789_clip1',
              window: { sourceStartMs: 10000, sourceEndMs: 45000, durationMs: 35000 },
              viralMetadata: { viralityScore: 95, hook: 'Never do this in trading', reason: 'High shock value' },
              success: true,
              outputUrl: 'https://cdn.example.test/clip1.mp4',
            },
          ],
        },
      }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(null, { status: 404 })
  })

  const batchSubmission = await longformClient.dispatchLongform({
    source: 'https://cdn.example.test/hour-long.mp4',
    nClips: 3,
    prompt: 'Focus on trading tips',
  })
  assert.equal(batchSubmission.batchJobId, 'batch_xyz_789')
  assert.equal(batchSubmission.status, 'queued')
  assert.equal(batchSubmission.nClips, 3)
  assert.equal(longformDispatchedBody.nClips, 3)
  assert.equal(longformDispatchedBody.prompt, 'Focus on trading tips')

  const batchStatus = await longformClient.getLongformStatus('batch_xyz_789')
  assert.equal(batchStatus.batchJobId, 'batch_xyz_789')
  assert.equal(batchStatus.state, 'completed')
  assert.equal(batchStatus.clipCount, 3)
  assert.equal(batchStatus.succeeded, 3)
  assert.equal(batchStatus.clips?.length, 1)
  assert.equal(batchStatus.clips?.[0].viralMetadata?.viralityScore, 95)
  assert.equal(batchStatus.clips?.[0].outputUrl, 'https://cdn.example.test/clip1.mp4')
}

void run()
