import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { GeminiLiveClient } = require('../lib/voice-companion/gemini-live-client.ts')
const { inspectVoiceVideo } = require('../lib/voice-companion/session-controls.ts')

test('G1: Gemini Live Client declares intentional inspect_video tool schema', () => {
  const client = new GeminiLiveClient({ apiKey: 'test-key', projectId: 'test-proj' })
  let sentPayload = null
  client.ws = {
    readyState: 1,
    send: (msg) => {
      sentPayload = JSON.parse(msg)
    },
  }
  client.sendSetupMessage()

  assert.ok(sentPayload, 'Setup message must be sent')
  const tools = sentPayload.setup?.tools?.[0]?.functionDeclarations ?? []
  const inspectTool = tools.find((t) => t.name === 'inspect_video')
  assert.ok(inspectTool, 'inspect_video tool must be declared')

  const props = inspectTool.parameters?.properties ?? {}
  assert.ok(props.timestamps, 'inspect_video must accept timestamps array')
  assert.ok(props.timeSec, 'inspect_video must accept timeSec')
  assert.ok(props.startSec, 'inspect_video must accept startSec')
  assert.ok(props.endSec, 'inspect_video must accept endSec')
  assert.ok(props.frameCount, 'inspect_video must accept frameCount')
  assert.ok(props.intent, 'inspect_video must accept intent rationale')
  assert.ok(props.keepPosition, 'inspect_video must accept keepPosition boolean')
})
test('G2: inspectVoiceVideo inspects a single intentional part (timeSec) without full sweep', async () => {
  let playheadSec = 5
  const seeks = []
  const sentFrames = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 60,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => {
      seeks.push(time)
      playheadSec = time
    },
    captureVideoFrame: async (time) => `data:image/jpeg;base64,frame_${time}`,
  }

  const result = await inspectVoiceVideo(
    () => bridge,
    (frame) => sentFrames.push(frame),
    {
      timeSec: 18.5,
      intent: 'Inspecting key dialogue beat at 18.5s',
      keepPosition: true,
      frameTimeoutMs: 200,
    }
  )

  assert.equal(result.success, true)
  assert.deepEqual(result.sampledAtSec, [18.5])
  assert.equal(sentFrames.length, 1)
  assert.equal(playheadSec, 18.5, 'Playhead should stay at 18.5s when keepPosition is true')
  assert.ok(!seeks.includes(4.8) && !seeks.includes(30), 'Must not perform default fractional sweep')
})

test('G3: inspectVoiceVideo inspects an intentional range (part to part: startSec to endSec)', async () => {
  let playheadSec = 0
  const seeks = []
  const progressLabels = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 100,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => {
      seeks.push(time)
      playheadSec = time
    },
    captureVideoFrame: async (time) => `data:image/jpeg;base64,frame_${time}`,
  }

  const result = await inspectVoiceVideo(
    () => bridge,
    () => {},
    {
      startSec: 20,
      endSec: 40,
      frameCount: 3,
      intent: 'Analyzing chorus pacing',
      onProgress: (step) => progressLabels.push(step.label),
      frameTimeoutMs: 200,
    }
  )

  assert.equal(result.success, true)
  assert.equal(result.frameCount, 3)
  assert.deepEqual(result.sampledAtSec, [20, 30, 40])
  assert.equal(progressLabels.length, 3)
  assert.ok(progressLabels[0].includes('Analyzing chorus pacing'))
})

test('G4: inspectVoiceVideo inspects multiple discrete parts (timestamps array)', async () => {
  let playheadSec = 2
  const seeks = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 50,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => {
      seeks.push(time)
      playheadSec = time
    },
    captureVideoFrame: async (time) => `data:image/jpeg;base64,frame_${time}`,
  }

  const result = await inspectVoiceVideo(
    () => bridge,
    () => {},
    {
      timestamps: [7.2, 14.8, 33.1],
      intent: 'Checking scene cuts',
      frameTimeoutMs: 200,
    }
  )

  assert.equal(result.success, true)
  assert.deepEqual(result.sampledAtSec, [7.2, 14.8, 33.1])
})

test('G5: inspectVoiceVideo preserves backward compatibility when no options provided', async () => {
  let playheadSec = 10
  const bridge = {
    hasVideo: true,
    videoDurationSec: 40,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => { playheadSec = time },
    captureVideoFrame: async () => 'data:image/jpeg;base64,frame',
  }

  const result = await inspectVoiceVideo(
    () => bridge,
    () => {},
    { frameTimeoutMs: 200 }
  )

  assert.equal(result.success, true)
  assert.deepEqual(result.sampledAtSec, [3.2, 11.2, 20, 28.8, 36.8])
  assert.equal(playheadSec, 10, 'Playhead should be restored by default')
})

test('G6: onProgress updates live intentional thinking labels during inspection', async () => {
  let playheadSec = 0
  const recordedSteps = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 60,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => { playheadSec = time },
    captureVideoFrame: async () => 'data:image/jpeg;base64,frame',
  }

  const result = await inspectVoiceVideo(
    () => bridge,
    () => {},
    {
      timestamps: [12.0, 24.0],
      intent: 'Comparing visual momentum',
      onProgress: (step) => recordedSteps.push(step),
      frameTimeoutMs: 200,
    }
  )

  assert.equal(result.success, true)
  assert.equal(recordedSteps.length, 2)
  assert.equal(recordedSteps[0].timeSec, 12.0)
  assert.ok(recordedSteps[0].label.includes('Comparing visual momentum'))
  assert.ok(recordedSteps[0].label.includes('1/2'))
  assert.equal(recordedSteps[1].timeSec, 24.0)
  assert.ok(recordedSteps[1].label.includes('2/2'))
})
