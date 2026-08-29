import { findNearestSnap, type SnapPoint } from './snap-engine'

export const MOTION_TIMELINE_MIN_DURATION = 0.1

export type MotionTimelineTrack = 'video' | 'audio' | 'captions' | 'text'
export type MotionTimelineKind = 'media' | 'caption' | 'text'
export type MotionTimelineRegion = 'top' | 'center' | 'bottom'
export type MotionTimelineColor = 'lime' | 'white' | 'cyan'
export type MotionTimelineAnimation = 'fade' | 'pop' | 'slide'

export interface MotionTimelineItem {
  id: string
  track: MotionTimelineTrack
  kind: MotionTimelineKind
  label: string
  start: number
  end: number
  text?: string
  region?: MotionTimelineRegion
  color?: MotionTimelineColor
  animation?: MotionTimelineAnimation
}

export interface MotionTimelineTranscriptSegment {
  id: string
  start: number
  end: number
  text: string
  emphasis?: string[]
}

export interface MotionTimelineTextPlacement {
  id: string
  start: number
  end: number
  text: string
  region?: MotionTimelineRegion
}

export interface MotionTimelineBuildInput {
  duration: number
  sourceLabel: string
  transcriptSegments: MotionTimelineTranscriptSegment[]
  textPlacements?: MotionTimelineTextPlacement[]
}

export interface MotionTimelineEditOptions {
  duration: number
  snapPoints?: SnapPoint[]
  zoomScale?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizedDuration(duration: number): number {
  return Math.max(0, Number.isFinite(duration) ? duration : 0)
}

function normalizedRange(start: number, end: number, duration: number): { start: number; end: number } {
  const boundedDuration = normalizedDuration(duration)
  const boundedStart = clamp(Number.isFinite(start) ? start : 0, 0, boundedDuration)
  const boundedEnd = clamp(Number.isFinite(end) ? end : boundedStart, boundedStart, boundedDuration)
  if (boundedEnd - boundedStart >= MOTION_TIMELINE_MIN_DURATION || boundedDuration < MOTION_TIMELINE_MIN_DURATION) {
    return { start: boundedStart, end: boundedEnd }
  }
  const endWithMinimum = Math.min(boundedDuration, boundedStart + MOTION_TIMELINE_MIN_DURATION)
  return { start: Math.max(0, endWithMinimum - MOTION_TIMELINE_MIN_DURATION), end: endWithMinimum }
}

function itemRange(item: MotionTimelineItem, duration: number): { start: number; end: number } {
  return normalizedRange(item.start, item.end, duration)
}

function nearestSnapTime(time: number, options: MotionTimelineEditOptions): number | null {
  const points = options.snapPoints ?? []
  if (points.length === 0) return null
  const nearest = findNearestSnap(time * 1000, points, Math.max(0.01, options.zoomScale ?? 1))
  return nearest ? nearest.timeMs / 1000 : null
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function buildMotionTimelineItems(input: MotionTimelineBuildInput): MotionTimelineItem[] {
  const duration = normalizedDuration(input.duration)
  const sourceLabel = input.sourceLabel || 'Source media'
  const items: MotionTimelineItem[] = [
    { id: 'video-source', track: 'video', kind: 'media', label: sourceLabel, start: 0, end: duration },
    { id: 'audio-source', track: 'audio', kind: 'media', label: `${sourceLabel} audio`, start: 0, end: duration },
  ]

  for (const segment of input.transcriptSegments) {
    const range = normalizedRange(segment.start, segment.end, duration)
    if (range.end <= range.start) continue
    items.push({
      id: `caption-${segment.id}`,
      track: 'captions',
      kind: 'caption',
      label: segment.text,
      text: segment.text,
      start: range.start,
      end: range.end,
      region: 'bottom',
      color: 'white',
      animation: 'fade',
    })
  }

  const placements = input.textPlacements ?? []
  for (const placement of placements) {
    const range = normalizedRange(placement.start, placement.end, duration)
    if (range.end <= range.start) continue
    items.push({
      id: `text-${placement.id}`,
      track: 'text',
      kind: 'text',
      label: placement.text,
      text: placement.text,
      start: range.start,
      end: range.end,
      region: placement.region ?? 'center',
      color: 'lime',
      animation: 'pop',
    })
  }
  return items
}

export function buildMotionSnapPoints(
  items: MotionTimelineItem[],
  currentTime: number,
  duration: number,
  excludeId?: string,
): SnapPoint[] {
  const boundedDuration = normalizedDuration(duration)
  const points: SnapPoint[] = [
    { timeMs: 0, type: 'timeline-start', strength: 1 },
    { timeMs: boundedDuration * 1000, type: 'timeline-end', strength: 1 },
  ]
  if (Number.isFinite(currentTime)) {
    points.push({ timeMs: clamp(currentTime, 0, boundedDuration) * 1000, type: 'playhead', strength: 1.2 })
  }
  for (const item of items) {
    if (item.id === excludeId) continue
    points.push({ timeMs: item.start * 1000, type: `${item.track}-start`, strength: 0.9 })
    points.push({ timeMs: item.end * 1000, type: `${item.track}-end`, strength: 0.9 })
  }
  return points
}

export function moveMotionTimelineItem(
  item: MotionTimelineItem,
  deltaSeconds: number,
  options: MotionTimelineEditOptions,
): MotionTimelineItem {
  const duration = normalizedDuration(options.duration)
  const range = itemRange(item, duration)
  const itemDuration = Math.max(MOTION_TIMELINE_MIN_DURATION, range.end - range.start)
  const rawStart = clamp(range.start + (Number.isFinite(deltaSeconds) ? deltaSeconds : 0), 0, Math.max(0, duration - itemDuration))
  const rawEnd = rawStart + itemDuration
  const startSnap = nearestSnapTime(rawStart, options)
  const endSnap = nearestSnapTime(rawEnd, options)
  const startAdjustment = startSnap === null ? Number.POSITIVE_INFINITY : Math.abs(startSnap - rawStart)
  const endAdjustment = endSnap === null ? Number.POSITIVE_INFINITY : Math.abs(endSnap - rawEnd)
  const snappedStart = startAdjustment <= endAdjustment && startSnap !== null
    ? startSnap
    : endSnap !== null
      ? endSnap - itemDuration
      : rawStart
  const nextStart = clamp(snappedStart, 0, Math.max(0, duration - itemDuration))
  return { ...item, start: roundTime(nextStart), end: roundTime(nextStart + itemDuration) }
}

export function trimMotionTimelineItem(
  item: MotionTimelineItem,
  edge: 'start' | 'end',
  deltaSeconds: number,
  options: MotionTimelineEditOptions,
): MotionTimelineItem {
  const duration = normalizedDuration(options.duration)
  const range = itemRange(item, duration)
  const delta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0
  if (edge === 'start') {
    const rawStart = clamp(range.start + delta, 0, Math.max(0, range.end - MOTION_TIMELINE_MIN_DURATION))
    const startSnap = nearestSnapTime(rawStart, options)
    const snappedStart = clamp(startSnap ?? rawStart, 0, Math.max(0, range.end - MOTION_TIMELINE_MIN_DURATION))
    return { ...item, start: roundTime(snappedStart), end: roundTime(range.end) }
  }
  const rawEnd = clamp(range.end + delta, Math.min(duration, range.start + MOTION_TIMELINE_MIN_DURATION), duration)
  const endSnap = nearestSnapTime(rawEnd, options)
  const snappedEnd = clamp(endSnap ?? rawEnd, Math.min(duration, range.start + MOTION_TIMELINE_MIN_DURATION), duration)
  return { ...item, start: roundTime(range.start), end: roundTime(snappedEnd) }
}

export function splitMotionTimelineItem(item: MotionTimelineItem, splitTime: number): MotionTimelineItem[] {
  const split = Number.isFinite(splitTime) ? splitTime : item.start
  if (split <= item.start || split >= item.end || item.end - item.start < MOTION_TIMELINE_MIN_DURATION * 2) {
    return [item]
  }
  return [
    { ...item, end: split },
    { ...item, id: `${item.id}-split`, start: split },
  ]
}
