import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import * as state from '../lib/editor/editorial-timeline-state'

const track = {
  id: 'catalog/outside-recommendation-shelf', title: 'Library selection', artist: 'Artist',
  producer: 'Prometheus', genre: 'Ambient', bpm: 92, vibeTags: ['ambient'],
  coverArtUrl: '/cover.jpg', previewUrl: '/api/music/preview?trackId=outside', reason: 'Selected',
  mood: 'minimal' as const, energy: 'low' as const, sourcePlatform: 'local' as const, durationSec: 30,
}
const cue = { id: 'whoosh', title: 'Whoosh', url: '/audio/whoosh.wav', start: 2, end: 3, offset: 0.2, volume: 0.7, muted: false, origin: 'editor' as const }

test('a catalog selection keeps its complete identity and playable source', () => {
  const selected = state.applyEditorialTimelinePatch(state.emptyEditorialTimeline('source-a'), { type: 'music', track })
  assert.equal(selected.music?.track.id, track.id)
  assert.equal(selected.music?.track.previewUrl, track.previewUrl)
  assert.deepEqual(state.readEditorialTimeline({ editorialTimeline: selected }, 'source-a'), selected)
})

test('song and mix edits preserve backend effects and transcript data', () => {
  const initial = { ...state.emptyEditorialTimeline('source-a'), effects: [cue], transcript: [{ id: 't1', start: 0, end: 1, text: 'Hello' }] }
  const selected = state.applyEditorialTimelinePatch(initial, { type: 'music', track })
  const mixed = state.applyEditorialTimelinePatch(selected, { type: 'mix', volume: 0.2, muted: true })
  assert.deepEqual(mixed.effects, [cue])
  assert.deepEqual(mixed.transcript, initial.transcript)
  assert.equal(mixed.music?.volume, 0.2)
  assert.equal(mixed.music?.muted, true)
})

test('replacing the source discards timings from the previous video', () => {
  const previous = { ...state.emptyEditorialTimeline('source-a'), effects: [cue] }
  assert.deepEqual(state.readEditorialTimeline({ editorialTimeline: previous }, 'source-b'), state.emptyEditorialTimeline('source-b'))
})

test('backend sound cues convert milliseconds, retain mute edits, and expose pending assets', () => {
  const plan = { sfxCues: [{ id: 'backend-whoosh', startMs: 1250, endMs: 1800, cue: 'line-sweep', intensity: 'subtle' }] }
  const backend = state.readBackendEditorialTimeline({}, 'source-a', plan)
  assert.equal(backend.effects[0]?.start, 1.25)
  assert.equal(backend.effects[0]?.end, 1.8)
  assert.equal(backend.effects[0]?.url, null)
  const muted = state.applyEditorialTimelinePatch(backend, { type: 'effect', id: 'backend-whoosh', muted: true })
  const refreshed = state.readBackendEditorialTimeline({ editorialTimeline: muted }, 'source-a', plan)
  assert.equal(refreshed.effects[0]?.muted, true)
  assert.equal(state.readBackendEditorialTimeline({ editorialTimeline: muted }, 'source-a', { sfxCues: [] }).effects.length, 0)
})

test('audio seeks apply source offsets and stop at the cue end', () => {
  assert.equal(state.editorialAudioTime(cue, 1.99), null)
  assert.equal(state.editorialAudioTime(cue, 2), 0.2)
  assert.ok(Math.abs(state.editorialAudioTime(cue, 2.7)! - 0.9) < 0.00001)
  assert.equal(state.editorialAudioTime(cue, 3), null)
})

test('invalid effect timings, unsafe URLs, and invalid mix levels are rejected', () => {
  assert.equal(state.editorialTimelinePatchSchema.safeParse({ type: 'effects', effects: [{ ...cue, end: 1 }] }).success, false)
  assert.equal(state.editorialTimelinePatchSchema.safeParse({ type: 'effects', effects: [{ ...cue, url: 'javascript:alert(1)' }] }).success, false)
  assert.equal(state.editorialTimelinePatchSchema.safeParse({ type: 'mix', volume: 2 }).success, false)
  assert.equal(state.editorialTimelinePatchSchema.safeParse({ type: 'effects', effects: [{ ...cue, url: '//other.test/audio' }] }).success, false)
})

function routeHarness({ signedIn = true, conflict = false } = {}) {
  let row: Record<string, any> = {
    id: 'project-a', user_id: 'owner', source_asset_id: 'source-a', updated_at: '2026-09-29T00:00:00Z',
    editor_state: { timeline: { cutRanges: [{ start: 4, end: 5 }] }, otherSetting: 'preserve' },
    animation_plan: { sfxCues: [] },
  }
  let race = conflict
  const supabase = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'owner' } : null }, error: null }) },
    from() {
      const filters = new Map<string, unknown>()
      let update: Record<string, any> | undefined
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.set(key, value); return query },
        update: (value: Record<string, any>) => { update = value; return query },
        maybeSingle: async () => {
          if (update && race) {
            race = false
            row = { ...row, updated_at: '2026-09-29T00:00:01Z', editor_state: { ...row.editor_state, concurrentlySaved: true, editorialTimeline: { ...state.emptyEditorialTimeline('source-a'), effects: [cue] } } }
          }
          const matches = [...filters].every(([key, value]) => row[key] === value)
          if (!matches) return { data: null, error: null }
          if (update) row = { ...row, ...update }
          return { data: structuredClone(row), error: null }
        },
      }
      return query
    },
  }
  const require = createRequire(import.meta.url)
  const exports: Record<string, any> = {}
  const code = ts.transpileModule(readFileSync(new URL('../app/api/projects/[id]/editorial-timeline/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, {
    exports, URL, Request, Response,
    require: (name: string) => name === 'next/server' ? { NextResponse: { json: (body: unknown, options?: ResponseInit) => Response.json(body, options) } } : name === '@/lib/supabase/server' ? { createClient: async () => supabase } : name === '@/lib/editor/editorial-timeline-state' ? state : require(name),
  })
  return { exports, row: () => row, context: (id = 'project-a') => ({ params: Promise.resolve({ id }) }) }
}

test('timeline endpoint requires authentication and filters project ownership', async () => {
  const anonymous = routeHarness({ signedIn: false })
  assert.equal((await anonymous.exports.GET(new Request('https://app.test'), anonymous.context())).status, 401)
  const owner = routeHarness()
  assert.equal((await owner.exports.GET(new Request('https://app.test'), owner.context('someone-elses-project'))).status, 404)
})

test('saving retries a concurrent update and preserves its effects and unrelated settings', async () => {
  const harness = routeHarness({ conflict: true })
  const response = await harness.exports.PATCH(new Request('https://app.test', { method: 'PATCH', body: JSON.stringify({ sourceAssetId: 'source-a', patch: { type: 'music', track } }) }), harness.context())
  assert.equal(response.status, 200)
  assert.equal(harness.row().editor_state.concurrentlySaved, true)
  assert.equal(harness.row().editor_state.otherSetting, 'preserve')
  assert.deepEqual(harness.row().editor_state.timeline.cutRanges, [{ start: 4, end: 5 }])
  assert.equal(harness.row().editor_state.editorialTimeline.effects[0]?.id, cue.id)
  assert.equal(harness.row().editor_state.editorialTimeline.music.track.id, track.id)
})

test('stale source edits are rejected before saving', async () => {
  const harness = routeHarness()
  const response = await harness.exports.PATCH(new Request('https://app.test', { method: 'PATCH', body: JSON.stringify({ sourceAssetId: 'old-source', patch: { type: 'music', track } }) }), harness.context())
  assert.equal(response.status, 409)
  assert.equal(harness.row().editor_state.editorialTimeline, undefined)
})

test('editorial_plan patch atomically updates captions and cues in one revision increment', () => {
  const initial = state.emptyEditorialTimeline('source-a')
  const movementCue = {
    id: 'cue-1',
    type: 'movement' as const,
    title: 'Punch Zoom',
    start: 2,
    end: 4,
    origin: 'editor' as const,
    context: { source: 'jarvis_editorial_plan', scale: 1.15, motionKind: 'punch' },
  }
  const updated = state.applyEditorialTimelinePatch(initial, {
    type: 'editorial_plan',
    captionStyle: 'karaoke_pop',
    cues: [movementCue],
  })
  assert.equal(updated.revision, 1)
  assert.equal(updated.captionStyle, 'karaoke_pop')
  assert.deepEqual(updated.cues, [movementCue])
})

test('saving an atomic editorial_plan updates both caption style and movement cues', async () => {
  const harness = routeHarness()
  const planCue = {
    id: 'cue-move',
    type: 'movement',
    title: 'Zoom In',
    start: 1,
    end: 3,
    origin: 'editor',
  }
  const response = await harness.exports.PATCH(new Request('https://app.test', {
    method: 'PATCH',
    body: JSON.stringify({
      sourceAssetId: 'source-a',
      patch: { type: 'editorial_plan', captionStyle: 'clean_bold', cues: [planCue] },
    }),
  }), harness.context())
  assert.equal(response.status, 200)
  assert.equal(harness.row().editor_state.editorialTimeline.captionStyle, 'clean_bold')
  assert.equal(harness.row().editor_state.editorialTimeline.cues[0]?.id, 'cue-move')
})

