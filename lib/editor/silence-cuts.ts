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

export type OptimizedSilenceResult = {
  achievable: boolean
  targetDurationSec: number
  currentDurationSec: number
  totalSilenceSec: number
  totalRemovedSec: number
  projectedDurationSec: number
  thresholdSec: number
  cuts: TimelineCutRange[]
  summary: string
}

/**
 * Calculates optimal silence cuts to achieve a target video duration (e.g. 33s down to 30s).
 * If the available pauses cannot reach the target (e.g. 99s down to 30s), reports what pause cuts
 * can achieve and recommends highlight/hook extraction.
 */
export function optimizeSilenceCutsForTargetDuration(
  segments: TranscriptSegment[] | null | undefined,
  targetDurationSec: number,
  currentDurationSec?: number,
): OptimizedSilenceResult {
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

  const measuredDuration = spoken.length ? spoken[spoken.length - 1]!.endMs / 1000 : 0
  const currentSec = typeof currentDurationSec === 'number' && Number.isFinite(currentDurationSec) && currentDurationSec > 0
    ? currentDurationSec
    : measuredDuration

  const neededReduction = Math.max(0, currentSec - targetDurationSec)

  if (neededReduction <= 0) {
    return {
      achievable: true,
      targetDurationSec,
      currentDurationSec: currentSec,
      totalSilenceSec: 0,
      totalRemovedSec: 0,
      projectedDurationSec: currentSec,
      thresholdSec: 0.4,
      cuts: [],
      summary: `The video is already at or below ${targetDurationSec.toFixed(1)}s (currently ${currentSec.toFixed(1)}s). No pause cuts are needed.`,
    }
  }

  // Calculate all available pauses >= 0.15s
  const minThresholdSec = 0.15
  const maxPossibleCuts = findTranscriptSilenceCuts(segments, minThresholdSec, currentSec)
  const totalAvailableSilence = maxPossibleCuts.reduce((acc, c) => acc + (c.end - c.start), 0)

  if (totalAvailableSilence < neededReduction) {
    // Insufficient pause time to reach the target duration purely through silence cuts
    const removedSec = roundSeconds(totalAvailableSilence)
    const projectedSec = roundSeconds(Math.max(0, currentSec - removedSec))
    return {
      achievable: false,
      targetDurationSec,
      currentDurationSec: currentSec,
      totalSilenceSec: removedSec,
      totalRemovedSec: removedSec,
      projectedDurationSec: projectedSec,
      thresholdSec: minThresholdSec,
      cuts: maxPossibleCuts,
      summary: `Cutting all pauses removes up to ${removedSec.toFixed(1)}s (bringing the video from ${currentSec.toFixed(1)}s to ${projectedSec.toFixed(1)}s). To reach ${targetDurationSec.toFixed(1)}s, highlight extraction or trimming is recommended.`,
    }
  }

  // Find the largest threshold that still removes >= neededReduction (or closest fit)
  let bestThreshold = minThresholdSec
  let bestCuts = maxPossibleCuts
  let bestRemoved = totalAvailableSilence

  // Step threshold from 0.15 to 2.0 in 0.05 increments
  for (let threshold = minThresholdSec; threshold <= 2.0; threshold += 0.05) {
    const candidateCuts = findTranscriptSilenceCuts(segments, threshold, currentSec)
    const candidateRemoved = candidateCuts.reduce((acc, c) => acc + (c.end - c.start), 0)
    if (candidateRemoved >= neededReduction) {
      bestThreshold = threshold
      bestCuts = candidateCuts
      bestRemoved = candidateRemoved
    } else {
      break
    }
  }

  const finalRemoved = roundSeconds(bestRemoved)
  const projectedDuration = roundSeconds(Math.max(0, currentSec - finalRemoved))

  return {
    achievable: true,
    targetDurationSec,
    currentDurationSec: currentSec,
    totalSilenceSec: roundSeconds(totalAvailableSilence),
    totalRemovedSec: finalRemoved,
    projectedDurationSec: projectedDuration,
    thresholdSec: roundSeconds(bestThreshold),
    cuts: bestCuts,
    summary: `Found ${finalRemoved.toFixed(1)}s of pauses. Cutting silences over ${bestThreshold.toFixed(2)}s brings the video to ${projectedDuration.toFixed(1)}s.`,
  }
}
