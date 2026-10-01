import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { autonomousCoordinator } = require('../lib/autonomous-ui/coordinator.ts')
const { useAutonomousStore } = require('../lib/autonomous-ui/autonomous-store.ts')
const { GeminiLiveClient } = require('../lib/voice-companion/gemini-live-client.ts')
const { switchVoiceWorkspace, inspectVoiceVideo } = require('../lib/voice-companion/session-controls.ts')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('cancelled cursor motion settles so the command cannot hang', async (t) => {
  const raf = globalThis.requestAnimationFrame
  const caf = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 5)
  globalThis.cancelAnimationFrame = clearTimeout
  t.after(() => {
    globalThis.requestAnimationFrame = raf
    globalThis.cancelAnimationFrame = caf
    autonomousCoordinator.endTakeover()
  })

  const moving = autonomousCoordinator.glideTo(50, 50, 'Opening Motion', null, 1000)
  await wait(10)
  autonomousCoordinator.endTakeover()
  assert.equal(await Promise.race([moving, wait(80).then(() => 'still waiting')]), false)
})

test('a missing workspace control is not reported as a successful switch', async () => {
  useAutonomousStore.getState().clearCallbacks()
  assert.equal(await autonomousCoordinator.executeTabSwitch('Motion'), false)
})

test('enabling editing access does not start a ghost cursor or imply work is happening', (t) => {
  let state
  const unsubscribe = autonomousCoordinator.subscribe((next) => { state = next })
  t.after(() => { unsubscribe(); autonomousCoordinator.endTakeover() })
  autonomousCoordinator.beginTakeover('Editing access enabled')
  assert.equal(state.isTakeover, true)
  assert.equal(state.visible, false)
  assert.equal(state.phase, 'idle')
})

test('takeover navigation with no tab or handler fails and clears its activity state', async (t) => {
  let state
  const unsubscribe = autonomousCoordinator.subscribe((next) => { state = next })
  t.after(() => { unsubscribe(); autonomousCoordinator.endTakeover() })
  useAutonomousStore.getState().clearCallbacks()
  assert.equal(await autonomousCoordinator.executeAutonomousTakeover('Motion'), false)
  assert.equal(state.visible, false)
  assert.equal(state.isTakeover, false)
})

test('voice navigation confirms committed state and rejects no-op and invalid switches', async () => {
  let activeTab = 'Music'
  let calls = 0
  const bridge = {
    contextProvider: () => ({ workspaceTab: activeTab }),
    onTabChange: (tab) => { calls++; setTimeout(() => { activeTab = tab }, 15) },
  }
  assert.deepEqual(await switchVoiceWorkspace('Motion', () => bridge, 100), { success: true, activeTab: 'Motion' })
  assert.equal(calls, 1)
  assert.equal((await switchVoiceWorkspace('invalid', () => bridge, 50)).success, false)
  assert.equal(calls, 1)
  bridge.onTabChange = () => {}
  const unchanged = await switchVoiceWorkspace('Editor', () => bridge, 40)
  assert.equal(unchanged.success, false)
  assert.equal(unchanged.activeTab, 'Motion')
})

test('inspection waits for seeks and decoded frames, then restores the Music view and playhead', async () => {
  let workspaceTab = 'Music'
  let playheadSec = 12
  let decoded = false
  const sent = []
  const bridge = {
    hasVideo: true,
    videoDurationSec: 40,
    contextProvider: () => ({ workspaceTab, playheadSec }),
    onTabChange: (tab) => { workspaceTab = tab },
    onSeek: async (timeSec) => {
      await wait(5)
      playheadSec = timeSec
      decoded = false
      setTimeout(() => { decoded = true }, 15)
    },
    captureVideoFrame: async (timeSec) => workspaceTab === 'Editor' && decoded && playheadSec === timeSec
      ? 'data:image/jpeg;base64,frame' : null,
  }
  const result = await inspectVoiceVideo(() => bridge, (frame) => sent.push(frame), { frameTimeoutMs: 200 })
  assert.equal(result.success, true)
  assert.deepEqual(result.sampledAtSec, [3.2, 11.2, 20, 28.8, 36.8])
  assert.equal(sent.length, 5)
  assert.equal(workspaceTab, 'Music')
  assert.equal(playheadSec, 12)
})

test('a stalled frame reader times out and restores the playhead without claiming visual access', async () => {
  let playheadSec = 9
  const bridge = {
    hasVideo: true, videoDurationSec: 40,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec }),
    onSeek: (timeSec) => { playheadSec = timeSec },
    captureVideoFrame: () => new Promise(() => {}),
  }
  const result = await inspectVoiceVideo(() => bridge, () => assert.fail('No frame exists to send'), { frameTimeoutMs: 40 })
  assert.equal(result.success, false)
  assert.equal(playheadSec, 9)
})

test('inspection stops if its session disappears and does not restore over a new session', async () => {
  let active = true
  let seeks = 0
  const bridge = {
    hasVideo: true, videoDurationSec: 40,
    contextProvider: () => ({ workspaceTab: 'Editor', playheadSec: 9 }),
    onSeek: () => { seeks++; active = false },
    captureVideoFrame: async () => 'data:image/jpeg;base64,frame',
  }
  const result = await inspectVoiceVideo(() => bridge, () => assert.fail('Session is gone'), { isSessionActive: () => active })
  assert.equal(result.success, false)
  assert.equal(seeks, 1)
})

test('completed actions hide the ghost cursor while editing access stays available', async (t) => {
  let state
  const unsubscribe = autonomousCoordinator.subscribe((next) => { state = next })
  t.after(() => { unsubscribe(); autonomousCoordinator.endTakeover() })
  autonomousCoordinator.beginTakeover()
  await autonomousCoordinator.executeSeekTimeline(36.7, 40, () => {})
  assert.equal(state.visible, false)
  assert.equal(state.phase, 'idle')
  assert.equal(state.pillMode, 'idle')
  assert.equal(state.isTakeover, true)
})

class FakeSocket {
  static OPEN = 1
  static CONNECTING = 0
  static instances = []
  readyState = FakeSocket.OPEN
  sent = []

  constructor() {
    FakeSocket.instances.push(this)
    queueMicrotask(() => this.onopen?.())
  }

  send(text) {
    this.sent.push(JSON.parse(text))
    if (JSON.parse(text).setup) this.receive({ setupComplete: {} })
  }

  receive(data) { this.onmessage?.({ data: JSON.stringify(data) }) }
  close(code = 1000, reason = '') {
    this.readyState = 3
    this.onclose?.({ code, reason })
  }
}

test('speech and interruptions arrive while a slow editor tool is still running', async (t) => {
  const originalSocket = globalThis.WebSocket
  globalThis.WebSocket = FakeSocket
  let finishTool
  const slowTool = new Promise((resolve) => { finishTool = resolve })
  const events = []
  const client = new GeminiLiveClient({ wsUrl: 'ws://test' }, {
    onToolCall: () => slowTool,
    onAudio: () => events.push('audio'),
    onInterrupted: () => events.push('interrupted'),
  })
  t.after(() => {
    finishTool({ success: true })
    client.disconnect()
    globalThis.WebSocket = originalSocket
  })

  await client.connect()
  const socket = FakeSocket.instances.at(-1)
  socket.receive({ toolCall: { functionCalls: [{ id: 'inspect', name: 'inspect_video', args: {} }] } })
  await wait(10)
  socket.receive({ serverContent: { interrupted: true, modelTurn: { parts: [{ inlineData: { data: 'pcm' } }] } } })
  await wait(20)
  assert.deepEqual(events, ['interrupted', 'audio'])
  finishTool({ success: true })
  await wait(10)
  assert.equal(socket.sent.filter((message) => message.toolResponse).length, 1)
})

test('disconnect prevents late tool responses and queued commands reaching a later session', async (t) => {
  const originalSocket = globalThis.WebSocket
  globalThis.WebSocket = FakeSocket
  let finishTool
  let calls = 0
  const slowTool = new Promise((resolve) => { finishTool = resolve })
  const client = new GeminiLiveClient({ wsUrl: 'ws://test' }, {
    onToolCall: () => { calls++; return slowTool },
  })
  t.after(() => { client.disconnect(); globalThis.WebSocket = originalSocket })
  await client.connect()
  const oldSocket = FakeSocket.instances.at(-1)
  oldSocket.receive({ toolCall: { functionCalls: [{ id: 'slow', name: 'inspect_video' }, { id: 'queued', name: 'switch_workspace_tab' }] } })
  await wait(10)
  client.disconnect()
  await client.connect()
  finishTool({ success: true })
  await wait(20)
  assert.equal(calls, 1)
  assert.equal(oldSocket.sent.filter((message) => message.toolResponse).length, 0)
  assert.equal(FakeSocket.instances.at(-1).sent.filter((message) => message.toolResponse).length, 0)
})

test('a dropped network connection stops queued editor commands', async (t) => {
  const originalSocket = globalThis.WebSocket
  globalThis.WebSocket = FakeSocket
  let finishTool
  let calls = 0
  const slowTool = new Promise((resolve) => { finishTool = resolve })
  const client = new GeminiLiveClient({ wsUrl: 'ws://test' }, {
    onToolCall: () => { calls++; return slowTool },
  })
  t.after(() => { client.disconnect(); globalThis.WebSocket = originalSocket })
  await client.connect()
  const socket = FakeSocket.instances.at(-1)
  socket.receive({ toolCall: { functionCalls: [{ id: 'slow', name: 'inspect_video' }, { id: 'queued', name: 'switch_workspace_tab' }] } })
  await wait(10)
  socket.close(1006, 'Network dropped')
  finishTool({ success: true })
  await wait(20)
  assert.equal(calls, 1)
  assert.equal(socket.sent.filter((message) => message.toolResponse).length, 0)
})
