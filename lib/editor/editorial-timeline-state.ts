import { z } from 'zod'
import type { MusicRecommendation } from '@/lib/types'

const time = z.number().finite().min(0).max(86400)
const gain = z.number().finite().min(0).max(1)
const audioUrl = z.string().max(4096).refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try { return new URL(value).protocol === 'https:' } catch { return false }
}, 'Use an HTTPS or relative audio URL.')

export const editorialMusicSchema = z.object({
  id: z.string().min(1).max(512), title: z.string().min(1).max(512),
  artist: z.string().max(512), previewUrl: audioUrl,
  coverArtUrl: z.string().max(4096), bpm: z.number().finite().min(0).max(400),
  vibeTags: z.array(z.string().max(100)).max(100),
  producer: z.string().max(512).default('Prometheus'),
  genre: z.string().max(100).default('Soundtrack'), reason: z.string().max(5000).default('Selected soundtrack'),
  mood: z.enum(['cinematic', 'uplifting', 'dark', 'minimal', 'playful']).default('cinematic'),
  energy: z.enum(['low', 'medium', 'high']).default('medium'),
  sourcePlatform: z.enum(['online', 'local']).default('local'), durationSec: time.default(0),
}).passthrough()

export const editorialSoundEffectSchema = z.object({
  id: z.string().min(1).max(200), title: z.string().min(1).max(512),
  url: audioUrl.nullable().default(null), start: time, end: time, offset: time.default(0),
  volume: gain.default(0.7), muted: z.boolean().default(false),
  origin: z.enum(['backend', 'editor']).default('editor'),
}).refine((cue) => cue.end > cue.start, 'An effect must end after it starts.')
export type EditorialSoundEffect = z.infer<typeof editorialSoundEffectSchema>

const wordSchema = z.object({ text: z.string().max(500), start: time, end: time, isCut: z.boolean().optional() })
export const editorialTranscriptSchema = z.object({
  id: z.string().min(1).max(200), start: time, end: time,
  text: z.string().max(20000), isCut: z.boolean().optional(),
  emphasis: z.array(z.string().max(500)).optional(), words: z.array(wordSchema).max(5000).optional(),
}).refine((segment) => segment.end > segment.start)
export type EditorialTranscript = z.infer<typeof editorialTranscriptSchema>

/** Shared timed placement contract for backend generated and editor-adjusted visual cues. */
export const editorialCueSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(['text', 'transition', 'movement', 'b-roll', 'sound-effect', 'explainer', 'counter', 'background']),
  start: time,
  end: time,
  title: z.string().max(512),
  text: z.string().max(20000).optional(),
  region: z.string().max(100).optional(),
  sourceId: z.string().max(512).optional(),
  sourceUrl: z.string().max(4096).optional(),
  origin: z.enum(['backend', 'editor']).default('backend'),
  context: z.record(z.string(), z.unknown()).optional(),
}).refine((cue) => cue.end > cue.start, 'A cue must end after it starts.')
export type EditorialCue = z.infer<typeof editorialCueSchema>

export interface EditorialTimelineState {
  version: 1
  revision: number
  sourceAssetId: string | null
  music: { track: MusicRecommendation; volume: number; muted: boolean } | null
  effects: EditorialSoundEffect[]
  cues: EditorialCue[]
  transcript?: EditorialTranscript[]
}

export const editorialTimelinePatchSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('music'), track: editorialMusicSchema.nullable() }),
  z.object({ type: z.literal('mix'), volume: gain.optional(), muted: z.boolean().optional() }),
  z.object({ type: z.literal('effects'), effects: z.array(editorialSoundEffectSchema).max(200) }),
  z.object({ type: z.literal('effect'), id: z.string().min(1), volume: gain.optional(), muted: z.boolean().optional() }),
  z.object({ type: z.literal('cues'), cues: z.array(editorialCueSchema).max(2000) }),
  z.object({ type: z.literal('transcript'), segments: z.array(editorialTranscriptSchema).max(5000) }),
])
export type EditorialTimelinePatch = z.infer<typeof editorialTimelinePatchSchema>

export function emptyEditorialTimeline(sourceAssetId: string | null): EditorialTimelineState {
  return { version: 1, revision: 0, sourceAssetId, music: null, effects: [], cues: [] }
}

/** Saved cues and transcript edits belong to one source, never its replacement. */
export function readEditorialTimeline(editorState: unknown, sourceAssetId: string | null): EditorialTimelineState {
  const empty = emptyEditorialTimeline(sourceAssetId)
  const raw = (editorState as { editorialTimeline?: Partial<EditorialTimelineState> } | null)?.editorialTimeline
  if (!raw || raw.sourceAssetId !== sourceAssetId) return empty
  const music = raw.music && editorialMusicSchema.safeParse(raw.music.track)
  const effects = z.array(editorialSoundEffectSchema).max(200).safeParse(raw.effects)
  const cues = z.array(editorialCueSchema).max(2000).safeParse(raw.cues)
  const transcript = z.array(editorialTranscriptSchema).max(5000).safeParse(raw.transcript)
  return {
    ...empty,
    revision: Number.isSafeInteger(raw.revision) && (raw.revision ?? 0) >= 0 ? raw.revision! : 0,
    music: music?.success ? {
      track: music.data as unknown as MusicRecommendation,
      volume: gain.safeParse(raw.music?.volume).success ? raw.music!.volume : 0.5,
      muted: raw.music?.muted === true,
    } : null,
    effects: effects.success ? effects.data : [],
    cues: cues.success ? cues.data : [],
    ...(transcript.success ? { transcript: transcript.data } : {}),
  }
}

export function applyEditorialTimelinePatch(state: EditorialTimelineState, patch: EditorialTimelinePatch): EditorialTimelineState {
  const next = { ...state, revision: state.revision + 1 }
  switch (patch.type) {
    case 'music': return { ...next, music: patch.track ? { track: patch.track as unknown as MusicRecommendation, volume: state.music?.volume ?? 0.5, muted: state.music?.muted ?? false } : null }
    case 'mix': return { ...next, music: state.music ? { ...state.music, ...(patch.volume !== undefined ? { volume: patch.volume } : {}), ...(patch.muted !== undefined ? { muted: patch.muted } : {}) } : null }
    case 'effects': return { ...next, effects: patch.effects }
    case 'effect': return { ...next, effects: state.effects.map((cue) => cue.id === patch.id ? { ...cue, ...(patch.volume !== undefined ? { volume: patch.volume } : {}), ...(patch.muted !== undefined ? { muted: patch.muted } : {}) } : cue) }
    case 'cues': return { ...next, cues: patch.cues }
    case 'transcript': return { ...next, transcript: patch.segments }
  }
}

export function editorialAudioTime(cue: { start: number; end: number; offset: number }, timeSec: number) {
  return timeSec >= cue.start && timeSec < cue.end ? (timeSec - cue.start) + cue.offset : null
}

/** Surface orchestration cues even while their audio assets are still pending. */
export function readBackendEditorialTimeline(editorState: unknown, sourceAssetId: string | null, animationPlan: unknown): EditorialTimelineState {
  const state = readEditorialTimeline(editorState, sourceAssetId)
  const plan = animationPlan && typeof animationPlan === 'object' ? animationPlan as Record<string, unknown> : {}
  const rawCues = Array.isArray(plan.sfxCues) ? plan.sfxCues : []
  const backendEffects = rawCues.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const cue = value as Record<string, unknown>
    const existing = state.effects.find((item) => item.id === cue.id)
    const result = editorialSoundEffectSchema.safeParse({
      id: cue.id, title: cue.title ?? String(cue.cue ?? 'Sound effect').replaceAll('-', ' '),
      start: typeof cue.startMs === 'number' ? cue.startMs / 1000 : cue.start,
      end: typeof cue.endMs === 'number' ? cue.endMs / 1000 : cue.end,
      url: cue.url ?? cue.audioUrl ?? existing?.url ?? null,
      volume: existing?.volume ?? (cue.intensity === 'bold' ? 0.9 : cue.intensity === 'subtle' ? 0.35 : 0.6),
      muted: existing?.muted ?? false, origin: 'backend',
    })
    return result.success ? [result.data] : []
  })
  const backendCues: EditorialCue[] = []
  const families: Array<[string, EditorialCue['type'], (cue: Record<string, unknown>) => string]> = [
    ['speechCues', 'text', (cue) => String(cue.text ?? cue.title ?? 'Text')],
    ['transitionCues', 'transition', (cue) => String(cue.label ?? cue.type ?? 'Transition')],
    ['movementCues', 'movement', (cue) => String(cue.label ?? cue.type ?? 'Movement')],
    ['brollCues', 'b-roll', (cue) => String(cue.title ?? cue.sourceId ?? 'B-roll')],
    ['sfxCues', 'sound-effect', (cue) => String(cue.title ?? cue.cue ?? 'Sound effect').replaceAll('-', ' ')],
    ['explainerCues', 'explainer', (cue) => String(cue.title ?? cue.concept ?? 'Explainer')],
    ['counterCues', 'counter', (cue) => String(cue.label ?? 'Counter')],
    ['backgroundCues', 'background', (cue) => String(cue.title ?? cue.kind ?? 'Background')],
  ]
  for (const [key, type, titleOf] of families) {
    const values = Array.isArray(plan[key]) ? plan[key] as unknown[] : []
    for (const value of values) {
      if (!value || typeof value !== 'object') continue
      const cue = value as Record<string, unknown>
      const candidate = {
        id: cue.id,
        type,
        title: titleOf(cue),
        text: type === 'text' && typeof cue.text === 'string' ? cue.text : undefined,
        start: typeof cue.startMs === 'number' ? cue.startMs / 1000 : cue.start,
        end: typeof cue.endMs === 'number' ? cue.endMs / 1000 : cue.end,
        region: cue.region,
        sourceId: cue.sourceId,
        sourceUrl: cue.sourceUrl,
        origin: 'backend',
        context: cue,
      }
      const parsed = editorialCueSchema.safeParse(candidate)
      if (parsed.success) {
        const edit = state.cues.find((saved) => saved.id === parsed.data.id)
        backendCues.push(edit ? { ...parsed.data, start: edit.start, end: edit.end, origin: 'editor' } : parsed.data)
      }
    }
  }
  const activeBackendIds = new Set(backendCues.map((cue) => cue.id))
  return {
    ...state,
    effects: [...state.effects.filter((cue) => cue.origin !== 'backend' && !backendEffects.some((item) => item.id === cue.id)), ...backendEffects],
    cues: [...state.cues.filter((cue) => cue.origin !== 'backend' && !activeBackendIds.has(cue.id)), ...backendCues],
  }
}
