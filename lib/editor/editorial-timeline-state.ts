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

export interface EditorialTimelineState {
  version: 1
  revision: number
  sourceAssetId: string | null
  music: { track: MusicRecommendation; volume: number; muted: boolean } | null
  effects: EditorialSoundEffect[]
  transcript?: EditorialTranscript[]
}

export const editorialTimelinePatchSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('music'), track: editorialMusicSchema.nullable() }),
  z.object({ type: z.literal('mix'), volume: gain.optional(), muted: z.boolean().optional() }),
  z.object({ type: z.literal('effects'), effects: z.array(editorialSoundEffectSchema).max(200) }),
  z.object({ type: z.literal('effect'), id: z.string().min(1), volume: gain.optional(), muted: z.boolean().optional() }),
  z.object({ type: z.literal('transcript'), segments: z.array(editorialTranscriptSchema).max(5000) }),
])
export type EditorialTimelinePatch = z.infer<typeof editorialTimelinePatchSchema>

export function emptyEditorialTimeline(sourceAssetId: string | null): EditorialTimelineState {
  return { version: 1, revision: 0, sourceAssetId, music: null, effects: [] }
}

/** Saved cues and transcript edits belong to one source, never its replacement. */
export function readEditorialTimeline(editorState: unknown, sourceAssetId: string | null): EditorialTimelineState {
  const empty = emptyEditorialTimeline(sourceAssetId)
  const raw = (editorState as { editorialTimeline?: Partial<EditorialTimelineState> } | null)?.editorialTimeline
  if (!raw || raw.sourceAssetId !== sourceAssetId) return empty
  const music = raw.music && editorialMusicSchema.safeParse(raw.music.track)
  const effects = z.array(editorialSoundEffectSchema).max(200).safeParse(raw.effects)
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
    case 'transcript': return { ...next, transcript: patch.segments }
  }
}

export function editorialAudioTime(cue: { start: number; end: number; offset: number }, timeSec: number) {
  return timeSec >= cue.start && timeSec < cue.end ? (timeSec - cue.start) + cue.offset : null
}

/** Surface orchestration cues even while their audio assets are still pending. */
export function readBackendEditorialTimeline(editorState: unknown, sourceAssetId: string | null, animationPlan: unknown): EditorialTimelineState {
  const state = readEditorialTimeline(editorState, sourceAssetId)
  const rawCues = (animationPlan as { sfxCues?: unknown[] } | null)?.sfxCues
  const cues = Array.isArray(rawCues) ? rawCues : []
  const backendEffects = cues.flatMap((value) => {
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
  return { ...state, effects: [...state.effects.filter((cue) => cue.origin !== 'backend' && !backendEffects.some((item) => item.id === cue.id)), ...backendEffects] }
}
