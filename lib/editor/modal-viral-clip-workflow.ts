import type {
  TranscriptSegment,
  ViralClipJobRequest,
  ViralClipJobResultResponse,
  ViralClipSelectedClip,
  ViralClipTargetPlatform,
  ViralClipTranscriptWord,
} from '@/lib/types'

type BackendTargetPlatform = 'tiktok' | 'reels' | 'shorts' | 'youtube' | 'generic'

type ModalTextChunkRequest = {
  transcript: {
    language: string
    text: string
    words: Array<{
      text: string
      startMs: number
      endMs: number
      confidence: number | null
    }>
  }
  videoDurationMs: number
  pacing: 'slow' | 'measured' | 'fast' | 'very_fast'
  style: 'restrained' | 'editorial' | 'cinematic' | 'direct_response'
  editorialContext: {
    platform: string
    objective: string | null
    audience: string | null
    notes: string
  }
  constraints: {
    minWordsPerChunk: 1
    maxWordsPerChunk: 8
    preserveEveryWord: true
  }
}

type PlanModalTypographyArgs = {
  result: ViralClipJobResultResponse
  request: ViralClipJobRequest
  previewTextChunks: (payload: ModalTextChunkRequest) => Promise<unknown>
}

type LocalHighlight = {
  id: string
  atMs: number
  label: string
}

const MAX_MODAL_SHORT_DURATION_MS = 180_000
const MAX_MODAL_TRANSCRIPT_WORDS = 1_000
const MODAL_PLANNING_CONCURRENCY = 2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function joinTimedTokens(tokens: readonly string[]) {
  return tokens.reduce((text, rawToken) => {
    const token = rawToken.trim()
    if (!token) return text
    if (!text || /^[,.;:!?%)}\]\u00bb\u201d\u2019]/u.test(token) || /[(\[{\u00ab\u201c\u2018]$/u.test(text)) {
      return `${text}${token}`
    }
    return `${text} ${token}`
  }, '')
}

export function buildTimedTranscriptWords(segments: readonly TranscriptSegment[]): ViralClipTranscriptWord[] {
  const orderedSegments = [...segments].sort((left, right) => left.startMs - right.startMs)
  const words: ViralClipTranscriptWord[] = []
  let previousEndMs = 0

  for (const segment of orderedSegments) {
    const tokens = segment.text.trim().split(/\s+/u).filter(Boolean)
    if (tokens.length === 0) continue

    const sourceStartMs = Math.max(0, Math.round(segment.startMs))
    const startMs = Math.max(sourceStartMs, previousEndMs)
    const sourceEndMs = Math.max(startMs + tokens.length, Math.round(segment.endMs))
    const durationMs = sourceEndMs - startMs

    tokens.forEach((text, index) => {
      const wordStartMs = startMs + Math.floor((durationMs * index) / tokens.length)
      const wordEndMs = Math.max(
        wordStartMs + 1,
        startMs + Math.floor((durationMs * (index + 1)) / tokens.length),
      )
      words.push({
        text,
        start_ms: wordStartMs,
        end_ms: wordEndMs,
        confidence: 1,
      })
      previousEndMs = wordEndMs
    })
  }

  return words
}

export function normalizeViralClipTargetPlatform(platform: ViralClipTargetPlatform): BackendTargetPlatform {
  if (platform === 'instagram') return 'reels'
  if (platform === 'x' || platform === 'linkedin') return 'generic'
  return platform
}

export function normalizeViralClipSelectedClip(raw: unknown, index: number): ViralClipSelectedClip {
  if (typeof raw === 'string') {
    return {id: `selected-clip-${index}`, title: raw, label: raw}
  }
  if (!isRecord(raw)) {
    const title = `Selected clip ${index + 1}`
    return {id: `selected-clip-${index}`, title, label: title}
  }

  const title = pickString(raw, ['suggested_title', 'title', 'label', 'name', 'headline', 'clipTitle'])
    ?? `Selected clip ${index + 1}`
  const startMs = pickNumber(raw, ['export_start_ms', 'startMs', 'start_ms', 'startTimeMs', 'clipStartMs', 'clip_start_ms'])
  const endMs = pickNumber(raw, ['export_end_ms', 'endMs', 'end_ms', 'endTimeMs', 'clipEndMs', 'clip_end_ms'])
  const durationMs = pickNumber(raw, ['export_duration_ms', 'durationMs', 'duration_ms'])
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
    : []

  return {
    ...raw,
    id: pickString(raw, ['clip_id', 'id', 'clipId', 'jobClipId']) ?? `selected-clip-${index}`,
    title,
    label: title,
    reason: pickString(raw, ['reason_selected', 'reason', 'description', 'summary', 'why', 'explanation']) ?? undefined,
    startMs: startMs ?? undefined,
    endMs: endMs ?? undefined,
    durationSec: pickNumber(raw, ['durationSec', 'duration_sec']) ?? (durationMs === null ? undefined : durationMs / 1_000),
    durationMs: durationMs ?? undefined,
    score: pickNumber(raw, ['virality_score', 'score', 'matchScore', 'fitScore', 'rankingScore']) ?? undefined,
    confidence: pickNumber(raw, ['confidence', 'fitConfidence', 'profileConfidence']) ?? undefined,
    previewUrl: pickString(raw, ['previewUrl', 'preview_url', 'url', 'sourceUrl']) ?? undefined,
    thumbnailUrl: pickString(raw, ['thumbnailUrl', 'thumbnail_url', 'posterUrl', 'coverArtUrl']) ?? undefined,
    tags,
  }
}

function readFallbackHighlights(request: ViralClipJobRequest): LocalHighlight[] {
  const rawHighlights = request.metadataOverrides?.highlights
  if (!Array.isArray(rawHighlights)) return []

  return rawHighlights.flatMap((value, index) => {
    if (!isRecord(value)) return []
    const atMs = pickNumber(value, ['atMs', 'at_ms'])
    if (atMs === null || atMs < 0) return []
    return [{
      id: pickString(value, ['id']) ?? `highlight-${index + 1}`,
      atMs: Math.round(atMs),
      label: pickString(value, ['label', 'title']) ?? `Local highlight ${index + 1}`,
    }]
  }).sort((left, right) => left.atMs - right.atMs)
}

export function buildFallbackViralClipResult(request: ViralClipJobRequest): ViralClipJobResultResponse {
  const transcriptDurationMs = request.providedTranscript?.reduce(
    (maximum, word) => Math.max(maximum, Math.round(word.end_ms)),
    0,
  ) ?? 0
  const configuredDurationMs = request.metadataOverrides?.sourceDurationMs
  const sourceDurationMs = Math.max(
    transcriptDurationMs,
    typeof configuredDurationMs === 'number' && Number.isFinite(configuredDurationMs)
      ? Math.round(configuredDurationMs)
      : 0,
  )
  if (sourceDurationMs <= 0) {
    return {fallback: true, selected_clips: []}
  }

  const requestedCount = Math.max(1, Math.min(request.clipCountMax, 8))
  const highlights = readFallbackHighlights(request)
  const candidates = highlights.length > 0
    ? highlights.slice(0, requestedCount)
    : Array.from({length: requestedCount}, (_, index) => ({
        id: `window-${index + 1}`,
        atMs: Math.round(((index + 0.5) * sourceDurationMs) / requestedCount),
        label: `Candidate window ${index + 1}`,
      }))
  const windowDurationMs = Math.min(sourceDurationMs, 45_000)

  return {
    fallback: true,
    fallback_reason: 'primary_clip_selection_unavailable',
    selected_clips: candidates.map((candidate, index) => {
      const startMs = Math.max(0, Math.min(sourceDurationMs - windowDurationMs, candidate.atMs - 2_000))
      const endMs = Math.min(sourceDurationMs, startMs + windowDurationMs)
      return {
        clip_id: `resilience-${candidate.id}`,
        rank: index + 1,
        export_start_ms: startMs,
        export_end_ms: endMs,
        export_duration_ms: endMs - startMs,
        suggested_title: candidate.label,
        reason_selected: 'Resilience candidate from a locally detected highlight; primary clip selection was unavailable.',
        fallback: true,
      }
    }),
  }
}

export function buildModalTextChunkRequest({
  words,
  clip,
  targetPlatform,
  prompt,
  audience,
}: {
  words: readonly ViralClipTranscriptWord[]
  clip: unknown
  targetPlatform: ViralClipTargetPlatform
  prompt?: string
  audience?: string
}): ModalTextChunkRequest | null {
  if (!isRecord(clip)) return null

  const clipStartMs = Math.max(0, Math.round(pickNumber(clip, ['export_start_ms', 'startMs', 'start_ms']) ?? 0))
  const requestedEndMs = Math.round(
    pickNumber(clip, ['export_end_ms', 'endMs', 'end_ms'])
      ?? clipStartMs + (pickNumber(clip, ['export_duration_ms', 'durationMs', 'duration_ms']) ?? 0),
  )
  const clipEndMs = Math.min(requestedEndMs, clipStartMs + MAX_MODAL_SHORT_DURATION_MS)
  const videoDurationMs = clipEndMs - clipStartMs
  if (videoDurationMs <= 0) return null

  const relativeWords = words
    .filter((word) => word.end_ms > clipStartMs && word.start_ms < clipEndMs)
    .slice(0, MAX_MODAL_TRANSCRIPT_WORDS)
    .map((word) => ({
      text: word.text.trim(),
      startMs: Math.max(0, Math.round(word.start_ms - clipStartMs)),
      endMs: Math.min(videoDurationMs, Math.round(word.end_ms - clipStartMs)),
      confidence: word.confidence ?? null,
    }))
    .filter((word) => word.text.length > 0 && word.endMs > word.startMs)

  if (relativeWords.length === 0) return null

  const platform = normalizeViralClipTargetPlatform(targetPlatform)
  const highVelocity = platform === 'tiktok' || platform === 'reels' || platform === 'generic'

  return {
    transcript: {
      language: 'en',
      text: joinTimedTokens(relativeWords.map((word) => word.text)),
      words: relativeWords,
    },
    videoDurationMs,
    pacing: highVelocity ? 'fast' : 'measured',
    style: highVelocity ? 'direct_response' : 'editorial',
    editorialContext: {
      platform,
      objective: prompt?.trim() || null,
      audience: audience?.trim() || null,
      notes: 'Typography plan for a selected viral short. Preserve every spoken word exactly once.',
    },
    constraints: {
      minWordsPerChunk: 1,
      maxWordsPerChunk: 8,
      preserveEveryWord: true,
    },
  }
}

async function mapWithConcurrency<T, TResult>(
  values: readonly T[],
  limit: number,
  task: (value: T, index: number) => Promise<TResult>,
) {
  const results = new Array<PromiseSettledResult<TResult>>(values.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      try {
        results[index] = {status: 'fulfilled', value: await task(values[index]!, index)}
      } catch (reason) {
        results[index] = {status: 'rejected', reason}
      }
    }
  }

  await Promise.all(Array.from({length: Math.min(limit, values.length)}, () => worker()))
  return results
}

export async function planModalTypographyForViralClips({
  result,
  request,
  previewTextChunks,
}: PlanModalTypographyArgs): Promise<ViralClipJobResultResponse> {
  const clips = Array.isArray(result.selected_clips) ? result.selected_clips : []
  const words = request.providedTranscript ?? []
  if (clips.length === 0 || words.length === 0) {
    return {
      ...result,
      modalTypography: {
        status: clips.length === 0 ? 'skipped_no_clips' : 'skipped_no_transcript',
        plannedClipCount: 0,
        failedClipCount: 0,
      },
    }
  }

  const planningResults = await mapWithConcurrency(clips, MODAL_PLANNING_CONCURRENCY, async (clip) => {
    const chunkRequest = buildModalTextChunkRequest({
      words,
      clip,
      targetPlatform: request.targetPlatform,
      prompt: request.prompt,
      audience: request.creatorNiche,
    })
    if (!chunkRequest) throw new Error('Selected clip has no timed transcript inside its export window.')
    return previewTextChunks(chunkRequest)
  })

  let plannedClipCount = 0
  let failedClipCount = 0
  const selectedClips = clips.map((clip, index) => {
    const planningResult = planningResults[index]
    if (!isRecord(clip)) return clip
    if (planningResult?.status === 'fulfilled') {
      plannedClipCount += 1
      return {...clip, modal_text_chunk_plan: planningResult.value}
    }
    failedClipCount += 1
    return {
      ...clip,
      modal_text_chunk_error:
        planningResult?.status === 'rejected' && planningResult.reason instanceof Error
          ? planningResult.reason.message
          : 'Modal typography planning failed.',
    }
  })

  return {
    ...result,
    selected_clips: selectedClips,
    modalTypography: {
      status: failedClipCount === 0 ? 'completed' : plannedClipCount > 0 ? 'partial' : 'failed',
      plannedClipCount,
      failedClipCount,
    },
  }
}
