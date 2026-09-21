import assert from 'node:assert/strict'
import {
  buildEditorialRenderPayload,
  dispatchModalEditorialRender,
  isModalRenderConfigured,
  pollModalEditorialJob,
} from '../lib/exports/modal-render-pipeline.ts'

console.log('Running Modal Export Treatment Pipeline Test (Gate 12)...')

// 1. Build Editorial Treatment Render Payload
const sourceUrl = 'https://r2.example.com/sources/sample-video.mp4'
const sourceAsset = {
  duration_ms: 24_500,
  width: 1920,
  height: 1080,
}
const options = {
  aspectRatio: '9:16',
  lookPreset: 'cinematic_teal_orange',
  captionStyle: 'karaoke_pop',
  cutRanges: [
    { startSec: 4.2, endSec: 6.8 },
    { startSec: 15.0, endSec: 17.5 },
  ],
  musicTrackId: 'track_cinematic_epic_01',
  musicVolume: 0.75,
}

const payload = buildEditorialRenderPayload({
  sourceUrl,
  sourceAsset,
  options,
  jobId: 'test-job-999',
})

// Assertions on Payload structure
assert.equal(payload.source.url, sourceUrl)
assert.equal(payload.jobId, 'test-job-999')
assert.equal(payload.metadata.pipeline, 'maul')
assert.equal(payload.metadata.editorialTreatment, true, 'Must indicate real editorial treatment')
assert.equal(payload.metadata.durationSec, 24.5)
assert.equal(payload.design.canvasWidth, 1080)
assert.equal(payload.design.canvasHeight, 1920)
assert.equal(payload.design.lookPreset, 'cinematic_teal_orange')
assert.equal(payload.design.captionStyle, 'karaoke_pop')

// Check cuts converted to milliseconds
assert.equal(payload.cutRanges.length, 2)
assert.deepEqual(payload.cutRanges[0], { startMs: 4200, endMs: 6800 })
assert.deepEqual(payload.cutRanges[1], { startMs: 15000, endMs: 17500 })

// Check audio treatment
assert.equal(payload.audio.musicTrackId, 'track_cinematic_epic_01')
assert.equal(payload.audio.musicVolume, 0.75)
assert.equal(payload.audio.ducking, true)
assert.equal(payload.audio.duckingRatio, 4.0)

// 2. Landscape 16:9 canvas dimensions
const landscapePayload = buildEditorialRenderPayload({
  sourceUrl,
  sourceAsset,
  options: { ...options, aspectRatio: '16:9' },
  jobId: 'test-landscape-01',
})
assert.equal(landscapePayload.design.canvasWidth, 1920)
assert.equal(landscapePayload.design.canvasHeight, 1080)

// 3. Staging / Offline Simulation Dispatch
const stagingResult = await dispatchModalEditorialRender({
  payload,
  env: {}, // No Modal env configured
})
assert.equal(stagingResult.jobId, 'test-job-999')
assert.equal(stagingResult.status, 'completed')
assert.ok(stagingResult.outputUrl && stagingResult.outputUrl.includes('test-job-999'), 'Output URL must be generated')

// 4. Modal Live Dispatch Protocol Mock
let sentUrl = ''
let sentHeaders = {}
let sentBody = null

const mockFetch = async (url, init) => {
  sentUrl = url
  sentHeaders = init.headers
  sentBody = JSON.parse(init.body)
  return {
    ok: true,
    status: 200,
    json: async () => ({
      jobId: sentBody.jobId,
      pipelineJobId: 'modal_pipeline_live_123',
      status: 'queued',
    }),
  }
}

const mockEnv = {
  MINI_RUN_BACKEND_URL: 'https://modal-runner.internal.example.com',
  MODAL_PROXY_KEY: 'test-proxy-key',
  MODAL_PROXY_SECRET: 'test-proxy-secret',
}

assert.equal(isModalRenderConfigured(mockEnv), true)

const liveResult = await dispatchModalEditorialRender({
  payload,
  env: mockEnv,
  fetchImpl: mockFetch,
})

assert.equal(sentUrl, 'https://modal-runner.internal.example.com/api/pipeline/render')
assert.equal(sentHeaders['Modal-Key'], 'test-proxy-key')
assert.equal(sentHeaders['Modal-Secret'], 'test-proxy-secret')
assert.equal(liveResult.jobId, 'test-job-999')
assert.equal(liveResult.pipelineJobId, 'modal_pipeline_live_123')
assert.equal(liveResult.status, 'queued')

// 5. Job Status Polling
const mockPollFetch = async (url) => {
  return {
    ok: true,
    status: 303,
    headers: {
      get: (h) => (h.toLowerCase() === 'location' ? 'https://r2.example.com/exports/treated-output.mp4' : null),
    },
    json: async () => ({}),
  }
}

const pollResult = await pollModalEditorialJob({
  jobId: 'test-job-999',
  env: mockEnv,
  fetchImpl: mockPollFetch,
})

assert.equal(pollResult.status, 'completed')
assert.equal(pollResult.outputUrl, 'https://r2.example.com/exports/treated-output.mp4')

console.log('modal-export-treatment-pipeline: all checks passed')
