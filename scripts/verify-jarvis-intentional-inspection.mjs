import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const gate = process.argv.includes('--gate') ? process.argv[process.argv.indexOf('--gate') + 1] : 'all'

console.log(`[verify-jarvis-intentional-inspection] Verifying gate: ${gate}`)

if (gate === 'G1' || gate === 'all') {
  console.log('--- Testing G1: Tool declaration schema & system instruction ---')
  const clientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
  assert.match(clientSource, /name:\s*'inspect_video'/, 'inspect_video must be declared')
  assert.match(clientSource, /timestamps:\s*\{/, 'must accept timestamps array')
  assert.match(clientSource, /timeSec:\s*\{/, 'must accept timeSec')
  assert.match(clientSource, /startSec:\s*\{/, 'must accept startSec')
  assert.match(clientSource, /endSec:\s*\{/, 'must accept endSec')
  assert.match(clientSource, /frameCount:\s*\{/, 'must accept frameCount')
  assert.match(clientSource, /intent:\s*\{/, 'must accept intent')
  assert.match(clientSource, /keepPosition:\s*\{/, 'must accept keepPosition')
  assert.match(clientSource, /Always inspect with intention/, 'system instruction must mandate intentional inspection')
  console.log('G1_INTENTIONAL_SCHEMA_PASSED')
}

if (gate === 'G2' || gate === 'all') {
  console.log('--- Testing G2: Single intentional part inspection & keepPosition ---')
  const { inspectVoiceVideo } = await import('../lib/voice-companion/session-controls.ts')
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
      intent: 'Inspecting dialogue beat at 18.5s',
      keepPosition: true,
      frameTimeoutMs: 200,
    }
  )

  assert.equal(result.success, true)
  assert.deepEqual(result.sampledAtSec, [18.5])
  assert.equal(sentFrames.length, 1)
  assert.equal(playheadSec, 18.5, 'Playhead should stay at 18.5s when keepPosition is true')
  assert.ok(!seeks.includes(4.8) && !seeks.includes(30), 'Must not perform default fractional sweep')
  console.log('G2_SINGLE_PART_PASSED')
}

if (gate === 'G3' || gate === 'all') {
  console.log('--- Testing G3: Intentional range inspection (part to part) ---')
  const { inspectVoiceVideo } = await import('../lib/voice-companion/session-controls.ts')
  let playheadSec = 0
  const progressLabels = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 100,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => { playheadSec = time },
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
  console.log('G3_RANGE_INSPECTION_PASSED')
}

if (gate === 'G4' || gate === 'all') {
  console.log('--- Testing G4: Multi-part inspection with live progress labels ---')
  const { inspectVoiceVideo } = await import('../lib/voice-companion/session-controls.ts')
  let playheadSec = 2
  const recordedSteps = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 50,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: async (time) => { playheadSec = time },
    captureVideoFrame: async (time) => `data:image/jpeg;base64,frame_${time}`,
  }

  const result = await inspectVoiceVideo(
    () => bridge,
    () => {},
    {
      timestamps: [7.2, 14.8, 33.1],
      intent: 'Checking scene cuts',
      onProgress: (step) => recordedSteps.push(step),
      frameTimeoutMs: 200,
    }
  )

  assert.equal(result.success, true)
  assert.deepEqual(result.sampledAtSec, [7.2, 14.8, 33.1])
  assert.equal(recordedSteps.length, 3)
  assert.ok(recordedSteps[0].label.includes('Checking scene cuts'))
  assert.ok(recordedSteps[0].label.includes('1/3'))
  console.log('G4_MULTIPART_INSPECTION_PASSED')
}

if (gate === 'G5' || gate === 'all') {
  console.log('--- Testing G5: Backward compatibility verification ---')
  const { inspectVoiceVideo } = await import('../lib/voice-companion/session-controls.ts')
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
  assert.equal(playheadSec, 10, 'Playhead must be restored by default')
  console.log('G5_BACKWARD_COMPAT_PASSED')
}

if (gate === 'G6' || gate === 'all') {
  console.log('--- Testing G6: useVoiceCompanion argument forwarding ---')
  const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
  assert.match(hookSource, /case 'inspect_video':/, 'must handle inspect_video')
  assert.match(hookSource, /timestamps,\s*timeSec,\s*startSec,\s*endSec,\s*frameCount,\s*intent,\s*keepPosition/, 'must unpack intentional parameters')
  assert.match(hookSource, /autonomousCoordinator\.setPillMode\('waiting',\s*`Jarvis:\s*\$\{stepInfo\.label\}`\)/, 'must update live thinking pill mode on each step')
  console.log('G6_HOOK_FORWARDING_PASSED')
}
