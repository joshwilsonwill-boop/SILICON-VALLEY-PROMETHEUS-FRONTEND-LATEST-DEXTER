import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import audioModule from '../lib/voice-companion/audio-streamer.ts'
import clientModule from '../lib/voice-companion/gemini-live-client.ts'
import recoveryModule from '../lib/voice-companion/response-recovery.ts'
import transcriptionModule from '../lib/voice-companion/transcription.ts'
const { AudioRecorder, AudioPlayer, pcmToWav } = audioModule
const { GeminiLiveClient } = clientModule
const { ResponseRecovery } = recoveryModule
const tick = () => new Promise((resolve) => setImmediate(resolve))
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

let processor
const node = () => ({ connect() {}, disconnect() {} })
const contexts = []
const sources = []
class MockAudioContext {
  state = 'running'; sampleRate = 48000; currentTime = 0; destination = {}
  constructor() { contexts.push(this) }
  createMediaStreamSource() { return node() }
  createAnalyser() { return { ...node(), frequencyBinCount: 32, getByteTimeDomainData(v) { v.fill(128) } } }
  createGain() { return { ...node(), gain: { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} } } }
  createScriptProcessor() { processor = node(); return processor }
  createBuffer(channels, length, rate) { const data = new Float32Array(length); return { duration: length / rate, getChannelData: () => data } }
  createBufferSource() { const source = { ...node(), stop() { this.stopped = true }, start(time) { this.startTime = time } }; sources.push(source); return source }
  resume() { return Promise.resolve() }
}
globalThis.window = { AudioContext: MockAudioContext, atob, btoa }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } } })
let onsets = 0
const emitted = []
const recorder = new AudioRecorder({ getIsSpeaking: () => true, onSpeechOnset: () => onsets++ })
await recorder.start((chunk) => emitted.push(chunk))
const frame = (value) => processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(4096).fill(value) } })
frame(0.05)
assert.equal(onsets, 0, 'One loud frame must not duck or interrupt the assistant')
assert.ok(Buffer.from(emitted[0], 'base64').every(byte => byte === 0), 'Unconfirmed speech is replaced with silence')
frame(0.05); assert.equal(onsets, 0)
frame(0.05); assert.equal(onsets, 1, 'Sustained user speech triggers one deliberate interruption')
assert.equal(emitted.filter(chunk => Buffer.from(chunk, 'base64').some(byte => byte !== 0)).length, 3, 'Confirmed speech retains the two gated initial frames')
frame(0.05); assert.equal(onsets, 1, 'Continued speech does not emit repeated interruption callbacks')
frame(0); frame(0.05); assert.equal(onsets, 1, 'A new isolated spike is not genuine sustained speech')
recorder.stop()

// Cancelling a pending microphone permission request must dispose late tracks.
const media = deferred(); let stoppedTracks = 0
navigator.mediaDevices.getUserMedia = () => media.promise
const pendingRecorder = new AudioRecorder()
const starting = pendingRecorder.start(() => assert.fail('Stale microphone emitted audio'))
pendingRecorder.stop()
media.resolve({ getTracks: () => [{ stop() { stoppedTracks++ } }] })
await starting
assert.equal(stoppedTracks, 1)
assert.equal(pendingRecorder.getVolume(), 0)
navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] })

// Jitter is buffered and flush generations cannot affect newly queued sources.
const pcm = Buffer.alloc(4800).toString('base64') // 100ms of real received PCM
const player = new AudioPlayer()
await player.playChunk(pcm)
const first = sources.at(-1)
assert.equal(first.startTime, contexts[0].currentTime + 0.18)
contexts[0].currentTime += 0.08
await player.playChunk(pcm)
const second = sources.at(-1)
assert.ok(Math.abs(second.startTime - (first.startTime + 0.1)) < 0.00001, '80ms packet jitter preserves continuous audio scheduling')
const staleEnded = second.onended
player.flush()
await player.playChunk(pcm)
staleEnded()
assert.equal(player.getIsPlaying(), true, 'A stale ended event cannot clear a new playback generation')
assert.ok(first.stopped && second.stopped)
player.stop()

const wav = await pcmToWav([new Uint8Array([1, 2, 3, 4]).buffer], 16000).arrayBuffer()
assert.equal(Buffer.from(wav).subarray(0, 4).toString(), 'RIFF')
assert.equal(new DataView(wav).getUint32(24, true), 16000)
assert.deepEqual([...new Uint8Array(wav).slice(44)], [1, 2, 3, 4], 'WAV preserves captured PCM exactly')

// Keep transcript fragments verbatim, including repetition and whitespace.
const recovery = new ResponseRecovery()
recovery.append('¿Qué? Ve', true, true)
recovery.append('Sorry about', false)
recovery.append(' the delay. specific', false)
recovery.append(' specific', false)
recovery.addAudio(pcm)
recovery.finish('partial')
assert.equal(recovery.lastResponseText, 'Sorry about the delay. specific specific')
assert.equal(recovery.snapshot()[0].text, '¿Qué? Ve')
assert.equal(recovery.snapshot()[1].status, 'partial')
assert.deepEqual(recovery.replayAudio, [pcm])
assert.equal(recovery.replayIsPartial, true)
recovery.append('A separate assistant turn.', false)
recovery.finish()
assert.equal(recovery.snapshot().length, 3, 'Adjacent same-role turns remain separate after completion/connection loss')
assert.notEqual(recovery.snapshot()[1].id, recovery.snapshot()[2].id)
assert.equal(transcriptionModule.appendTranscriptText('wait ', 'wait '), 'wait wait ')
assert.equal(transcriptionModule.getLiveTranscripts({ inputTranscription: { text: ' ' } })[0].text, ' ')

class MockWebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSED = 3; static sockets = []
  readyState = 0; sent = []
  constructor(url) { this.url = url; MockWebSocket.sockets.push(this) }
  send(data) { this.sent.push(JSON.parse(data)) }
  close() { this.readyState = 3 }
  open() { this.readyState = 1; this.onopen?.() }
  message(data) { this.onmessage?.({ data: typeof data === 'object' && !(data instanceof Blob) ? JSON.stringify(data) : data }) }
  end(code = 1006) { this.readyState = 3; this.onclose?.({ code, reason: 'network disturbance' }) }
}
globalThis.WebSocket = MockWebSocket
const newSocket = () => MockWebSocket.sockets.at(-1)
async function connectedClient(events = {}) {
  const client = new GeminiLiveClient({ wsUrl: 'wss://test.invalid' }, events)
  const connection = client.connect(); const socket = newSocket(); socket.open()
  assert.equal(client.isConnected(), false, 'An open socket is not a confirmed voice session')
  socket.message({ setupComplete: {} }); await connection
  return { client, socket }
}
const heard = []; let executed = []; const slowTool = deferred()
const { client, socket } = await connectedClient({
  onAudio: chunk => heard.push(chunk),
  onToolCall: async (name) => { executed.push(name); if (name === 'slow') await slowTool.promise; return { success: true } },
})
const setup = socket.sent[0].setup
const instruction = setup.systemInstruction.parts[0].text
assert.match(instruction, /Do not invent handoffs to a design team/)
assert.match(instruction, /Microphone transcription may be inaccurate/)
assert.match(instruction, /Call it before making claims or edit decisions that depend on what is visible/)
assert.match(instruction, /A request to choose, add or use a named song requires action: 'select'/)
assert.match(instruction, /Await the result before saying an action is complete/)
const musicSchema = setup.tools[0].functionDeclarations.find(tool => tool.name === 'autonomous_music_action')
assert.ok(musicSchema.parameters.properties.trackName)
assert.ok(setup.tools[0].functionDeclarations.some(tool => tool.name === 'reference_video_style'))
socket.message({ toolCall: { functionCalls: [{ id: 'slow', name: 'slow' }, { id: 'skip', name: 'cancelled' }] } })
await tick()
socket.message({ toolCallCancellation: { ids: ['slow', 'skip'] } })
socket.message({ serverContent: { modelTurn: { parts: [{ inlineData: { data: pcm } }] } } })
await tick()
assert.deepEqual(heard, [pcm], 'Incoming audio is processed while an editing tool is unresolved')
slowTool.resolve(); await tick(); await tick()
assert.deepEqual(executed, ['slow'], 'Queued cancelled calls never execute')
assert.ok(!socket.sent.some(payload => payload.toolResponse), 'Cancelled pending calls cannot emit stale replies')
client.disconnect()

// Late socket callbacks and slow Blob decoding cannot resurrect an old stream.
let opens = 0; let confirmations = 0
const abandoned = new GeminiLiveClient({ wsUrl: 'wss://cancel.invalid' }, { onOpen: () => opens++, onSetupConfirmed: () => confirmations++ })
const cancelledConnect = abandoned.connect().catch(error => error)
const oldSocket = newSocket(); const oldOpen = oldSocket.onopen; const oldMessage = oldSocket.onmessage
abandoned.disconnect(); oldSocket.readyState = 1; oldOpen(); oldMessage({ data: JSON.stringify({ setupComplete: {} }) })
const cancelledError = await cancelledConnect; await tick()
assert.match(cancelledError.message, /cancelled/)
assert.equal(opens, 0); assert.equal(confirmations, 0); assert.equal(abandoned.isConnected(), false)
const decoded = deferred(); let staleAudio = 0
const active = await connectedClient({ onAudio: () => staleAudio++ })
const blob = new Blob(['ignored']); blob.text = () => decoded.promise
active.socket.message(blob); await tick(); active.client.disconnect()
decoded.resolve(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { data: pcm } }] } } }))
await tick(); assert.equal(staleAudio, 0, 'Post-disconnect Blob decoding cannot deliver audio')

// Runtime hook harness exercises asynchronous lifecycle without browser rendering.
function hookHarness() {
  const slots = []; let index = 0; let bridge = { hasVideo: true, isTakeoverEnabled: true, transcriptSegments: [{ text: 'um', startMs: 0, endMs: 500 }] }
  const receipts = []; let cleanups = []; let toolCalls = []
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i] },
    useCallback(fn) { return fn }, useEffect(fn) { const cleanup = fn(); if (cleanup) cleanups.push(cleanup) },
    useSyncExternalStore(subscribe, snapshot) { return snapshot() },
  }
  const dependencies = {
    react,
    '@/lib/voice-companion/gemini-live-client': clientModule,
    '@/lib/voice-companion/audio-streamer': audioModule,
    '@/lib/voice-companion/response-recovery': recoveryModule,
    '@/lib/voice-companion/bridge': { getVoiceCompanionBridge: () => bridge, subscribeVoiceCompanionBridge: () => () => {} },
    '@/lib/autonomous-ui/coordinator': { autonomousCoordinator: { endTakeover() {}, setPillMode() {}, abortAction() {} } },
    '@/lib/autonomous-ui/autonomous-store': { useAutonomousStore: { getState: () => ({ beginAction(action) { receipts.push(action); return String(receipts.length) }, finishAction(id, outcome) { receipts[Number(id) - 1].outcome = outcome } }) } },
    '@/lib/voice-companion/memory': { getJarvisMemory: () => ({}), saveJarvisMemory() {} },
    '@/lib/voice-companion/filler-words': { detectFillerWords: () => ({ count: 1, items: [{}] }) },
    '@/lib/editor/timeline-document': { buildEditorialPlan: () => ({ zooms: [], captionStyle: 'clean_bold', summary: 'caption plan' }) },
    '@/lib/voice-companion/transcript-search': { searchTranscriptText: () => [] },
    '@/lib/voice-companion/session-controls': { inspectVoiceVideo: async () => ({ success: true }), switchVoiceWorkspace: async () => ({ success: true }) },
    '@/lib/voice-companion/music-controls': { performVoiceMusicAction: async args => { toolCalls.push(args); return { success: true, staged: args.action === 'select', previewStarted: false, summary: 'Track staged.' } } },
    '@/lib/voice-companion/reference-controls': { performVoiceReferenceStyleAction: async args => ({ success: true, summary: 'Reference analyzed.', args }) },
  }
  const source = readFileSync(new URL('../hooks/use-voice-companion.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const hookModule = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in dependencies, `Unexpected hook dependency ${name}`); return dependencies[name]
  }, hookModule, hookModule.exports)
  return {
    render() { index = 0; return hookModule.exports.useVoiceCompanion() },
    setBridge(value) { bridge = { ...bridge, ...value } }, receipts, toolCalls,
    unmount() { cleanups.at(-1)?.() },
  }
}
const originalFetch = globalThis.fetch
const lateCredentials = deferred()
globalThis.fetch = () => lateCredentials.promise
const lifecycle = hookHarness(); let voice = lifecycle.render()
const socketCount = MockWebSocket.sockets.length
const pendingVoice = voice.connect(); voice.disconnect()
lateCredentials.resolve({ ok: true, json: async () => ({ wsUrl: 'wss://late.invalid' }) })
await pendingVoice
assert.equal(MockWebSocket.sockets.length, socketCount, 'A late credential fetch cannot resurrect a disconnected session')
assert.equal(lifecycle.render().status, 'disconnected')
lifecycle.unmount()

globalThis.fetch = async () => ({ ok: true, json: async () => ({ wsUrl: 'wss://hook.invalid' }) })
const liveHook = hookHarness(); voice = liveHook.render()
const hookConnect = voice.connect(); await tick()
let hookSocket = newSocket(); hookSocket.open(); hookSocket.message({ setupComplete: {} }); await hookConnect
hookSocket.message({ serverContent: { outputTranscription: { text: 'Sorry about' }, modelTurn: { parts: [{ inlineData: { data: pcm } }] } } }); await tick()
const beforeInterruptionSources = sources.length
hookSocket.message({ serverContent: { interrupted: true } }); await tick()
voice = liveHook.render()
assert.equal(voice.transcripts[0].text, 'Sorry about')
assert.equal(voice.transcripts[0].status, 'partial')
assert.equal(voice.canReplayResponse, true)
assert.match(voice.connectionNotice, /reply stopped/)
assert.equal(sources[beforeInterruptionSources - 1].stopped, undefined, 'Spurious server interruption does not discard queued audio')
hookSocket.end(); await tick(); voice = liveHook.render()
assert.equal(voice.status, 'error'); assert.match(voice.connectionNotice, /stream ended/)
const replayStart = sources.length
await voice.replayLastResponse()
assert.equal(sources.length, replayStart + 1, 'Replay schedules the actual retained received chunk')
assert.equal(liveHook.render().transcripts[0].text, 'Sorry about', 'Replay does not invent or alter missing words')
const reconnected = voice.reconnect(); await tick(); hookSocket = newSocket()
hookSocket.open(); hookSocket.message({ setupComplete: {} }); await reconnected
hookSocket.message({ serverContent: { outputTranscription: { text: 'A new reply.' }, turnComplete: true } }); await tick()
voice = liveHook.render()
assert.equal(voice.transcripts.length, 2, 'Reconnect preserves prior transcripts without merging assistant turns')
assert.equal(voice.transcripts[1].status, 'complete')
voice.sendTextMessage('  exact typed words  ')
assert.equal(liveHook.render().transcripts.at(-1).text, '  exact typed words  ')

// Editing responses are based on awaited actual results, including zero changes.
const edited = deferred()
liveHook.setBridge({ onCutSilence: () => edited.promise })
liveHook.render()
hookSocket.message({ toolCall: { functionCalls: [{ id: 'cut', name: 'cut_silence', args: { minDurationSec: 0.6 } }] } }); await tick()
assert.equal(liveHook.receipts.at(-1).outcome, undefined, 'No completion receipt before the handler resolves')
edited.resolve({ success: true, count: 0, totalRemovedSec: 0, summary: 'No new pauses were removed.' }); await tick(); await tick()
const cutReply = hookSocket.sent.find(payload => payload.toolResponse?.functionResponses.some(result => result.id === 'cut'))
assert.equal(cutReply.toolResponse.functionResponses[0].response.output.count, 0)
assert.equal(liveHook.receipts.at(-1).outcome.affectedCount, 0)
assert.equal(liveHook.receipts.at(-1).outcome.durationRemovedSec, 0)
hookSocket.message({ toolCall: { functionCalls: [{ id: 'music', name: 'autonomous_music_action', args: { action: 'select', trackName: 'Exact Song Title' } }] } }); await tick(); await tick()
assert.equal(liveHook.toolCalls.at(-1).trackName, 'Exact Song Title')
assert.equal(liveHook.toolCalls.at(-1).action, 'select')
liveHook.unmount()
globalThis.fetch = originalFetch
console.log('jarvis-network-recovery passed')
