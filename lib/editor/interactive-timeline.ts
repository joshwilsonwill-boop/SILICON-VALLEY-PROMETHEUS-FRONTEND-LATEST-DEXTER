/**
 * Interactive Timeline Engine
 *
 * Implements high-modality clip manipulation for CapCut/InVideo-grade multi-track timelines:
 * - Fluid drag-to-shift clip time with magnetic snapping
 * - Dual-handle edge trimming (left/right duration adjustment)
 * - Playhead scrubbing synchronization
 * - Active text/caption querying at any playback timestamp
 */

export interface InteractiveClip {
  id: string
  trackId: 'video' | 'audio' | 'captions' | 'text' | 'effects'
  startSec: number
  endSec: number
  text?: string
  title?: string
  region?: 'top' | 'center' | 'bottom'
  stylePreset?: string
  isCut?: boolean
  color?: string
}

export interface SnapOptions {
  snapPoints?: number[]
  snapThresholdSec?: number
}

const DEFAULT_MIN_CLIP_DURATION = 0.2
const DEFAULT_SNAP_THRESHOLD = 0.15

/**
 * Finds the closest snap target within threshold.
 */
export function applyMagneticSnap(
  timeSec: number,
  snapPoints: number[] = [],
  threshold: number = DEFAULT_SNAP_THRESHOLD,
): { timeSec: number; snapped: boolean; snappedTo?: number } {
  let closestDist = Infinity
  let closestPoint: number | undefined

  for (const point of snapPoints) {
    const dist = Math.abs(point - timeSec)
    if (dist <= threshold && dist < closestDist) {
      closestDist = dist
      closestPoint = point
    }
  }

  if (closestPoint !== undefined) {
    return { timeSec: closestPoint, snapped: true, snappedTo: closestPoint }
  }

  return { timeSec, snapped: false }
}

/**
 * Shifts clip position in time without changing its duration.
 */
export function shiftClip(
  clip: { startSec: number; endSec: number },
  deltaSec: number,
  totalDuration: number,
  options: SnapOptions = {},
): { startSec: number; endSec: number; snapped: boolean } {
  const duration = Math.max(DEFAULT_MIN_CLIP_DURATION, clip.endSec - clip.startSec)
  const maxStart = Math.max(0, totalDuration - duration)

  let rawStart = clip.startSec + deltaSec
  rawStart = Math.max(0, Math.min(rawStart, maxStart))

  let snapped = false
  if (options.snapPoints && options.snapPoints.length > 0) {
    const snapResult = applyMagneticSnap(rawStart, options.snapPoints, options.snapThresholdSec)
    if (snapResult.snapped) {
      rawStart = Math.max(0, Math.min(snapResult.timeSec, maxStart))
      snapped = true
    } else {
      // Also test if end snaps
      const rawEnd = rawStart + duration
      const endSnap = applyMagneticSnap(rawEnd, options.snapPoints, options.snapThresholdSec)
      if (endSnap.snapped) {
        rawStart = Math.max(0, Math.min(endSnap.timeSec - duration, maxStart))
        snapped = true
      }
    }
  }

  const finalStart = Math.round(rawStart * 1000) / 1000
  const finalEnd = Math.round((finalStart + duration) * 1000) / 1000

  return {
    startSec: finalStart,
    endSec: Math.min(totalDuration, finalEnd),
    snapped,
  }
}

/**
 * Trims or expands the left edge (start time) of a clip.
 */
export function trimClipStart(
  clip: { startSec: number; endSec: number },
  newStartSec: number,
  minDurationSec: number = DEFAULT_MIN_CLIP_DURATION,
  options: SnapOptions = {},
): { startSec: number; endSec: number; snapped: boolean } {
  const maxStart = Math.max(0, clip.endSec - minDurationSec)
  let clampedStart = Math.max(0, Math.min(newStartSec, maxStart))

  let snapped = false
  if (options.snapPoints && options.snapPoints.length > 0) {
    const snapResult = applyMagneticSnap(clampedStart, options.snapPoints, options.snapThresholdSec)
    if (snapResult.snapped && snapResult.timeSec <= maxStart) {
      clampedStart = snapResult.timeSec
      snapped = true
    }
  }

  return {
    startSec: Math.round(clampedStart * 1000) / 1000,
    endSec: clip.endSec,
    snapped,
  }
}

/**
 * Trims or expands the right edge (end time) of a clip.
 */
export function trimClipEnd(
  clip: { startSec: number; endSec: number },
  newEndSec: number,
  totalDuration: number,
  minDurationSec: number = DEFAULT_MIN_CLIP_DURATION,
  options: SnapOptions = {},
): { startSec: number; endSec: number; snapped: boolean } {
  const minEnd = clip.startSec + minDurationSec
  let clampedEnd = Math.max(minEnd, Math.min(newEndSec, totalDuration))

  let snapped = false
  if (options.snapPoints && options.snapPoints.length > 0) {
    const snapResult = applyMagneticSnap(clampedEnd, options.snapPoints, options.snapThresholdSec)
    if (snapResult.snapped && snapResult.timeSec >= minEnd && snapResult.timeSec <= totalDuration) {
      clampedEnd = snapResult.timeSec
      snapped = true
    }
  }

  return {
    startSec: clip.startSec,
    endSec: Math.round(clampedEnd * 1000) / 1000,
    snapped,
  }
}

/**
 * Retrieves all active clips at a given timecode.
 */
export function getActiveClipsAtTime(
  clips: InteractiveClip[],
  currentSec: number,
): InteractiveClip[] {
  return clips.filter(
    (clip) => !clip.isCut && currentSec >= clip.startSec && currentSec < clip.endSec,
  )
}

/**
 * Generates audio waveform visualization bars.
 */
export function generateWaveformBars(durationSec: number, barCount: number = 64): number[] {
  if (barCount <= 0) return []
  const bars: number[] = []
  for (let i = 0; i < barCount; i++) {
    const normalized = i / barCount
    // Mix low & mid frequency sine curves with slight pseudo-random variation
    const energy =
      0.35 +
      0.45 * Math.sin(normalized * Math.PI * 8) * Math.cos(normalized * Math.PI * 3) +
      0.2 * Math.sin(normalized * Math.PI * 22)
    bars.push(Math.max(0.12, Math.min(1.0, Math.abs(energy))))
  }
  return bars
}

/**
 * Formats seconds into standard film timecode MM:SS.ff (frames at 30fps).
 */
export function formatTimelineTimecode(seconds: number, fps: number = 30): string {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  const frames = Math.floor((safe % 1) * fps)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(frames).padStart(2, '0')}`
}
