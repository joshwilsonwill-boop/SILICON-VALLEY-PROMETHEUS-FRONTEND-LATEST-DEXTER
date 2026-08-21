import { buildHeuristicSoundtrackProfile, normalizeSoundtrackProfile, type MusicRecommendationPipelineInput } from '@/lib/music-recommendation-core'
import type { MusicSoundtrackProfile } from '@/lib/types'

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b'

export type MusicProfileGenerationResult = {
  profile: MusicSoundtrackProfile
  source: 'groq' | 'heuristic'
  model?: string
}

export async function generateIdealSoundtrackProfile(
  input: MusicRecommendationPipelineInput,
): Promise<MusicProfileGenerationResult> {
  const heuristicProfile = buildHeuristicSoundtrackProfile(input)
  const apiKey = process.env.GROQ_API_KEY?.trim()
  const model = process.env.GROQ_MUSIC_MODEL?.trim() || process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL

  if (!apiKey) {
    return {
      profile: heuristicProfile,
      source: 'heuristic',
    }
  }

  try {
    const archiveGenres = uniqueStrings(input.catalog.flatMap((track) => [track.genre, track.subgenre ?? '', ...(track.cinematicTags ?? [])]))
      .slice(0, 12)
      .join(', ')
    const archiveCapsule = input.catalog
      .slice(0, 10)
      .map((track) => `${track.title} | ${track.genre} | ${track.mood} | ${track.bpm} BPM`)
      .join('\n')

    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_completion_tokens: 420,
        messages: [
          {
            role: 'system',
            content: buildProfileSystemPrompt(),
          },
          {
            role: 'user',
            content: buildProfileUserPrompt({
              input,
              archiveGenres,
              archiveCapsule,
            }),
          },
        ],
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`Groq profile request failed with ${response.status} ${response.statusText}.`)
    }

    const payload = parseProfilePayload(raw)
    if (!payload) {
      throw new Error('Groq did not return a parsable soundtrack profile.')
    }

    return {
      profile: normalizeSoundtrackProfile({
        ...heuristicProfile,
        ...payload,
        contentCategory: cleanInline(payload.contentCategory) || heuristicProfile.contentCategory,
        primaryMood: cleanInline(payload.primaryMood) || heuristicProfile.primaryMood,
        secondaryMood: cleanInline(payload.secondaryMood) || heuristicProfile.secondaryMood,
        tempoRange: normalizeTempoRange(payload.tempoRange, heuristicProfile.tempoRange),
        genreCandidates: normalizeStringList(payload.genreCandidates).slice(0, 6),
        instrumentationHints: normalizeStringList(payload.instrumentationHints).slice(0, 6),
        avoid: normalizeStringList(payload.avoid).slice(0, 6),
        confidence: clamp01(typeof payload.confidence === 'number' ? payload.confidence : heuristicProfile.confidence),
        reasoningSummary: cleanInline(payload.reasoningSummary) || heuristicProfile.reasoningSummary,
        audienceFeel: cleanInline(payload.audienceFeel) || heuristicProfile.audienceFeel,
      }),
      source: 'groq',
      model,
    }
  } catch {
    return {
      profile: heuristicProfile,
      source: 'heuristic',
      model,
    }
  }
}

function buildProfileSystemPrompt() {
  return [
    'You are a soundtrack strategist for a premium AI video editor.',
    'Return only one valid JSON object and nothing else.',
    'Use concise, concrete language that describes the ideal soundtrack profile for the clip.',
    'The object must include: contentCategory, primaryMood, secondaryMood, energyLevel, tempoRange, genreCandidates, instrumentationHints, editSyncStyle, emotionalArc, avoid, confidence, reasoningSummary, audienceFeel.',
    'Keep tempoRange as a two-element array of integers.',
    'Keep confidence between 0 and 1.',
    'Prefer genres and instrumentation that are actually present in the archive when possible.',
    'Make the profile feel specific to the video context, not generic.',
  ].join(' ')
}

function buildProfileUserPrompt({
  input,
  archiveGenres,
  archiveCapsule,
}: {
  input: MusicRecommendationPipelineInput
  archiveGenres: string
  archiveCapsule: string
}) {
  const contextBits = [
    input.query ? `Query: ${input.query}.` : '',
    input.projectTitle ? `Project title: ${input.projectTitle}.` : '',
    input.initialPrompt ? `Initial prompt: ${input.initialPrompt}.` : '',
    input.preference ? `Current preference: ${JSON.stringify(input.preference)}.` : '',
    input.videoContext ? `Video context: ${JSON.stringify(input.videoContext)}.` : '',
    input.variantHint ? `Refinement hint: ${input.variantHint}.` : '',
    archiveGenres ? `Archive genres: ${archiveGenres}.` : '',
    archiveCapsule ? `Archive sample:\n${archiveCapsule}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'Infer the soundtrack profile for the following editor context.',
    'Do not output commentary or markdown.',
    'Primary goal: make the music feel tied to pacing, emotion, and edit rhythm.',
    contextBits,
  ].join('\n\n')
}

function parseProfilePayload(raw: string) {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) return null

  try {
    return JSON.parse(jsonText) as Partial<MusicSoundtrackProfile> & {
      tempoRange?: unknown
      genreCandidates?: unknown
      instrumentationHints?: unknown
      avoid?: unknown
      confidence?: unknown
    }
  } catch {
    return null
  }
}

function normalizeTempoRange(value: unknown, fallback: [number, number]): [number, number] {
  if (!Array.isArray(value) || value.length < 2) return fallback
  const first = Number(value[0])
  const second = Number(value[1])
  if (!Number.isFinite(first) || !Number.isFinite(second)) return fallback
  const lower = Math.max(60, Math.round(Math.min(first, second)))
  const upper = Math.max(lower + 2, Math.round(Math.max(first, second)))
  return [lower, upper]
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanInline(typeof item === 'string' ? item : '')).filter(Boolean)
    : []
}

function uniqueStrings(values: string[]) {
  return values
    .map((value) => cleanInline(value))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
}

function cleanInline(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}
