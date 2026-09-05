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
}

void run()
