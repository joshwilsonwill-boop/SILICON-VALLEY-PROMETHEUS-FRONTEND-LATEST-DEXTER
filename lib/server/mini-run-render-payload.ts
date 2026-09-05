import type { MiniRunShotSpec } from '@/lib/api/mini-run-console'

export const MINI_RUN_DEFAULT_DURATION_MS = 30_000
export const MINI_RUN_MIN_DURATION_MS = 5_000
export const MINI_RUN_MAX_DURATION_MS = 180_000

type SourceMetadata = {
  durationMs?: number
  width?: number
  height?: number
}

type BuildMiniRunRenderPayloadInput = {
  sourceUrl: string
  source: SourceMetadata
  shot: Partial<MiniRunShotSpec>
  jobId: string
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * Creates the only payload accepted by the Mini-Runs dispatch route. The
 * source can be arbitrarily long, but a Mini-Run is always a Maul 9:16
 * deliverable with a user-selected short-form source window.
 */
export function buildMiniRunRenderPayload({
  sourceUrl,
  source,
  shot,
  jobId,
}: BuildMiniRunRenderPayloadInput): Record<string, unknown> {
  const sourceDurationMs = isFiniteNumber(source.durationMs) && source.durationMs > 0
    ? Math.round(source.durationMs)
    : null
  const requestedStartMs = isFiniteNumber(shot.sourceStartMs) ? Math.round(shot.sourceStartMs) : 0
  const maximumStartMs = sourceDurationMs ? Math.max(0, sourceDurationMs - 1_000) : Number.MAX_SAFE_INTEGER
  const sourceStartMs = clamp(requestedStartMs, 0, maximumStartMs)
  const preferredDurationMs = isFiniteNumber(shot.preferredDurationSec) && shot.preferredDurationSec > 0
    ? Math.round(shot.preferredDurationSec * 1_000)
    : null
  const explicitDurationMs = isFiniteNumber(shot.sourceEndMs)
    ? Math.max(1_000, Math.round(shot.sourceEndMs) - sourceStartMs)
    : null
  const requestedDurationMs = clamp(
    preferredDurationMs ?? explicitDurationMs ?? MINI_RUN_DEFAULT_DURATION_MS,
    MINI_RUN_MIN_DURATION_MS,
    MINI_RUN_MAX_DURATION_MS,
  )
  const sourceEndMs = Math.min(
    sourceStartMs + requestedDurationMs,
    sourceDurationMs ?? Number.MAX_SAFE_INTEGER,
  )
  const durationMs = Math.max(1_000, sourceEndMs - sourceStartMs)

  const targetChunkWords = isFiniteNumber(shot.targetChunkWords)
    ? clamp(Math.round(shot.targetChunkWords), 1, 15)
    : 3
  const maxChunkWords = isFiniteNumber(shot.maxChunkWords)
    ? clamp(Math.round(shot.maxChunkWords), targetChunkWords, 30)
    : Math.max(targetChunkWords, 5)

  return {
    source: { url: sourceUrl },
    metadata: {
      pipeline: 'maul',
      durationSec: durationMs / 1_000,
      durationMs,
      width: source.width,
      height: source.height,
    },
    design: {
      canvasWidth: 1080,
      canvasHeight: 1920,
    },
    selectedWindow: {
      sourceStartMs,
      sourceEndMs,
    },
    targetChunkWords,
    maxChunkWords,
    ...(shot.songPolicy === 'disabled' ? { audio: { songPolicy: 'disabled' } } : {}),
    jobId,
  }
}
