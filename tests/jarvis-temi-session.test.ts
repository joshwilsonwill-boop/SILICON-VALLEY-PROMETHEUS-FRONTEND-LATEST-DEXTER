import assert from 'node:assert/strict'
import test from 'node:test'
import { performVoiceMusicAction } from '../lib/voice-companion/music-controls'
import { performVoiceMusicMix, saveVoiceMusicMix } from '../lib/voice-companion/music-mix'
import { playMusicElement, stopMusicElement, registerMusicPlayer, stopRegisteredMusicPlayers } from '../lib/voice-companion/music-playback'
import { performVoiceVideoEdit, ensureVoiceTranscript, applyVoiceCaptions } from '../lib/voice-companion/video-edit'
import type { VoiceCompanionBridgeHandlers } from '../lib/voice-companion/bridge'
import type { MusicRecommendation } from '../lib/types'
import { emptyEditorialTimeline, applyEditorialTimelinePatch } from '../lib/editor/editorial-timeline-state'

const tracks = [
  { id: 'pop', title: 'Pop Up', artist: 'Catalog artist', genre: 'Pop', vibeTags: ['upbeat'], previewUrl: '/pop.mp3' },
  { id: 'quiet', title: 'Quiet Night', artist: 'Catalog artist', genre: 'Ambient', vibeTags: ['cinematic'], previewUrl: '/quiet.mp3' },
]
function musicHandlers(overrides: Partial<VoiceCompanionBridgeHandlers> = {}) {
  let tab: 'Editor' | 'Music' | 'Motion' = 'Editor'
  return { getMusicCatalog: () => tracks, getActiveWorkspaceTab: () => tab,
    onTabChange: (next: typeof tab) => { tab = next }, ...overrides }
}

test('catalog: browse needs no query, opens Music and returns real titles', async () => {
  const handlers = musicHandlers()
  const result = await performVoiceMusicAction({ action: 'browse' }, () => handlers)
  assert.equal(result.success, true)
  assert.deepEqual(result.results?.map(track => track.title), ['Pop Up', 'Quiet Night'])
  assert.equal(handlers.getActiveWorkspaceTab(), 'Music')
})
test('catalog: blank search also lists tracks and pagination reports total', async () => {
  const handlers = musicHandlers()
  const result = await performVoiceMusicAction({ action: 'search', limit: 1, offset: 1 }, () => handlers)
  assert.equal(result.success, true)
  assert.equal(result.total, 2)
  assert.deepEqual(result.results?.map(track => track.id), ['quiet'])
})
test('catalog: failed recommendation service still provides matching cached music', async () => {
  const handlers = musicHandlers({ searchMusicTracks: async () => { throw new Error('Recommendation service timeout') } })
  const result = await performVoiceMusicAction({ action: 'search', query: 'cinematic' }, () => handlers)
  assert.equal(result.success, true)
  assert.equal(result.results?.[0].id, 'quiet')
  assert.match(result.warning!, /timeout/)
})
test('catalog: absent artist is distinct from an outage and offers available alternatives', async () => {
  const result = await performVoiceMusicAction({ action: 'search', query: 'Big Nuz' }, () => musicHandlers())
  assert.equal(result.success, true)
  assert.equal(result.matched, false)
  assert.match(result.summary, /No catalog tracks matched/)
  assert.ok(result.alternatives?.length)
})
test('catalog: replacement excludes the current soundtrack instead of selecting it again', async () => {
  let selected = ''
  const handlers = musicHandlers({ searchMusicTracks: async () => tracks,
    onSelectMusicTrack: (id) => { selected = id; return { success: true, summary: 'saved' } } })
  const result = await performVoiceMusicAction({ action: 'select', query: 'any music', recommendation: true, excludeTrackId: 'pop' }, () => handlers)
  assert.equal(result.success, true)
  assert.equal(selected, 'quiet')
})
test('mix: volume is percent, zero and one percent stay distinct, invalid inputs never mutate', async () => {
  const volumes: number[] = []
  const handlers = { onSetMusicVolume: (volume: number) => { volumes.push(volume); return { success: true, summary: 'saved' } } }
  for (const percent of [0, 1, 15, 100]) assert.equal((await performVoiceMusicMix({ command: 'set_volume', volume: percent }, () => handlers)).success, true)
  assert.deepEqual(volumes, [0, .01, .15, 1])
  for (const percent of [-1, 101, NaN, Infinity]) assert.equal((await performVoiceMusicMix({ command: 'set_volume', volume: percent }, () => handlers)).success, false)
  assert.equal(volumes.length, 4)
})
test('mix: ducking and failed editor confirmations propagate truthfully', async () => {
  assert.equal((await performVoiceMusicMix({ command: 'set_ducking', enabled: true }, () => ({ onSetMusicDucking: () => ({ success: true, summary: 'saved' }) }))).success, true)
  const result = await performVoiceMusicMix({ command: 'set_volume', volume: 15 }, () => ({ onSetMusicVolume: () => ({ success: false, summary: 'Save failed' }) }))
  assert.equal(result.success, false)
  assert.match(result.summary, /Save failed/)
})
test('mix: saved controller state confirms music mix and source changes fail closed', async () => {
  let timeline = { ...emptyEditorialTimeline('source'), music: { track: tracks[0] as unknown as MusicRecommendation, volume: .5, muted: false, ducking: false } }
  const controller = { getSnapshot: () => ({ timeline, status: 'saved' as const, error: null }),
    patch: (patch: Parameters<typeof applyEditorialTimelinePatch>[1]) => { timeline = applyEditorialTimelinePatch(timeline, patch) as typeof timeline } }
  assert.equal((await saveVoiceMusicMix(controller, 'source', { volume: .15, ducking: true })).success, true)
  assert.equal(timeline.music.volume, .15)
  assert.equal(timeline.music.ducking, true)
  assert.equal((await saveVoiceMusicMix(controller, 'other-source', { volume: .9 })).success, false)
  assert.equal(timeline.music.volume, .15)
})

function fakeAudio() {
  let resume: () => void = () => {}
  const audio = { paused: true, muted: false, volume: .5, pause() { this.paused = true },
    play() { return new Promise<void>(resolve => { resume = () => { audio.paused = false; resolve() } }) } }
  return { audio: audio as unknown as HTMLAudioElement, resume: () => resume() }
}
test('playback: pending play cannot restart after stop', async () => {
  const fake = fakeAudio()
  const playing = playMusicElement(fake.audio, 1000)
  stopMusicElement(fake.audio)
  fake.resume()
  assert.equal((await playing).success, false)
  assert.equal(fake.audio.paused, true)
})
test('playback: stop reaches every registered Music player and synchronizes its UI', () => {
  const a = fakeAudio(), b = fakeAudio()
  let callbacks = 0
  const releases = [registerMusicPlayer(a.audio, () => callbacks++), registerMusicPlayer(b.audio, () => callbacks++)]
  ;(a.audio as unknown as { paused: boolean }).paused = false
  ;(b.audio as unknown as { paused: boolean }).paused = false
  stopRegisteredMusicPlayers()
  assert.equal(a.audio.paused, true); assert.equal(b.audio.paused, true)
  assert.equal(callbacks, 2)
  releases.forEach(release => release())
})
test('playback: timeout cleans up and pauses a late browser play resolution', async () => {
  const fake = fakeAudio()
  assert.equal((await playMusicElement(fake.audio, 5)).success, false)
  fake.resume()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(fake.audio.paused, true)
})

test('edit: transcription distinguishes pending provider work from an available transcript', async () => {
  const handlers = { hasVideo: true, onRequestTranscription: async () => ({ success: true, pending: true, summary: 'Started transcription.' }) }
  const result = await ensureVoiceTranscript(() => handlers)
  assert.equal(result.success, false)
  assert.equal(result.pending, true)
})
test('edit: captions reject absent timing and invalid style without claiming application', async () => {
  let calls = 0
  const handlers = { hasVideo: true, transcriptSegments: [], onApplyCaptionStyle: async () => { calls++; return { success: true, summary: 'saved' } } }
  assert.equal((await applyVoiceCaptions('clean_bold', () => handlers)).success, false)
  assert.equal((await applyVoiceCaptions('invented-style', () => handlers)).success, false)
  assert.equal(calls, 0)
})
test('edit: combined request preserves cuts, captions, music and quiet mix while explicitly reporting B-roll', async () => {
  const calls: string[] = []
  const handlers = musicHandlers({ hasVideo: true, transcriptSegments: [{ id: 's', text: 'hello', startMs: 0, endMs: 1000 }],
    onCutSilence: () => ({ success: true, summary: 'Cut 2 pauses.', count: 2, totalRemovedSec: 1, ranges: [] }),
    onApplyCaptionStyle: async () => { calls.push('captions'); return { success: true, summary: 'Captions saved.' } },
    searchMusicTracks: async () => tracks,
    onSelectMusicTrack: async () => { calls.push('music'); return { success: true, summary: 'Song saved.' } },
    onSetMusicVolume: async level => { calls.push(`volume:${level}`); return { success: true, summary: 'Quiet music saved.' } },
    onSetMusicDucking: async () => { calls.push('ducking'); return { success: true, summary: 'Ducking saved.' } },
  })
  const result = await performVoiceVideoEdit({ removePauses: true, captions: true, transcription: true, broll: true, music: true }, () => handlers)
  assert.equal(result.success, false)
  assert.equal(result.partial, true)
  assert.equal(result.outcomes.pauses?.success, true)
  assert.equal(result.outcomes.captions?.success, true)
  assert.equal(result.outcomes.music?.staged, true)
  assert.equal(result.outcomes.broll?.success, false)
  assert.match(result.outcomes.broll!.summary, /B-roll/)
  assert.deepEqual(calls, ['captions', 'music', 'volume:0.2', 'ducking'])
})
test('edit: one failed step does not drop later requested work; source changes cancel further mutations', async () => {
  let captions = 0
  const handlers = musicHandlers({ hasVideo: true, sourceAssetId: 'a', transcriptSegments: [{ startMs: 0, endMs: 1000, text: 'Hi' }],
    onCutSilence: () => { throw new Error('Cut save failed') },
    onApplyCaptionStyle: async () => { captions++; return { success: true, summary: 'saved' } } })
  const result = await performVoiceVideoEdit({ removePauses: true, captions: true }, () => handlers)
  assert.equal(result.success, false); assert.equal(captions, 1)
  handlers.onCutSilence = () => { handlers.sourceAssetId = 'b'; return { success: true, count: 0, totalRemovedSec: 0, ranges: [], summary: 'none' } }
  const cancelled = await performVoiceVideoEdit({ removePauses: true, captions: true }, () => handlers)
  assert.equal(cancelled.success, false); assert.equal(captions, 1)
})
