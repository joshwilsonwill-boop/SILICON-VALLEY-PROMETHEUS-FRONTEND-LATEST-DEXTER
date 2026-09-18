import type { TranscriptSegment } from '@/lib/types'

export type TimelineCutRange = { start: number; end: number }

/**
 * Finds gaps between spoken transcript units. This changes editor timeline
 * state only; media is neither rendered nor re-encoded here.
 */
export function findTranscriptSilenceCuts(
  segments: TranscriptSegment[] | null | undefined,
  minDurationSec = 0.4,
  durationSec?: number,
): TimelineCutRange[] {
  const thresholdMs = clamp(minDurationSec, 0.1, 5) * 1000
  const spoken = (segments ?? [])
    .filter((segment) => !segment.isCut)
    .flatMap((segment) => {
      const words = segment.words?.filter((word) => !word.isCut) ?? []
      return words.length
        ? words.map((word) => ({ startMs: word.startMs, endMs: word.endMs }))
        : [{ startMs: segment.startMs, endMs: segment.endMs }]
    })
    .filter((unit) => Number.isFinite(unit.startMs) && Number.isFinite(unit.endMs) && unit.endMs > unit.startMs)
    .sort((a, b) => a.startMs - b.startMs)

  if (spoken.length < 2) return []

  const cuts: TimelineCutRange[] = []
  let previousEndMs = spoken[0]!.endMs
  const maximumMs = typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0
    ? durationSec * 1000
    : Number.POSITIVE_INFINITY

  for (let index = 1; index < spoken.length; index += 1) {
    const next = spoken[index]!
    const startMs = Math.min(maximumMs, next.startMs)
    const endMs = Math.min(maximumMs, previousEndMs)
    if (startMs - endMs >= thresholdMs) {
      cuts.push({ start: roundSeconds(endMs / 1000), end: roundSeconds(startMs / 1000) })
    }
    previousEndMs = Math.max(previousEndMs, next.endMs)
  }

  return cuts
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000
}
