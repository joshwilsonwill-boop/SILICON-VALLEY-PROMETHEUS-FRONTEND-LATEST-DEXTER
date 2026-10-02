export type TimelineRange = { start: number; end: number }
export type SourceClip = TimelineRange & { id: string; title: string; type: 'video' }

export function sourceClips(duration: number, title: string, splits: number[], cuts: TimelineRange[]): SourceClip[] {
  const boundaries = [...new Set([0, duration, ...splits, ...cuts.flatMap(cut => [cut.start, cut.end])])]
    .filter(time => Number.isFinite(time) && time >= 0 && time <= duration).sort((a, b) => a - b)
  return boundaries.slice(0, -1).flatMap((start, index) => {
    const end = boundaries[index + 1]
    if (end <= start || cuts.some(cut => start >= cut.start && end <= cut.end)) return []
    return [{ id: `source-video:${start}:${end}`, start, end, title, type: 'video' as const }]
  })
}

export function splitSource(splits: number[], clips: SourceClip[], time: number): number[] {
  if (!clips.some(clip => time > clip.start + 0.01 && time < clip.end - 0.01)) return splits
  return [...new Set([...splits, time])].sort((a, b) => a - b)
}
