import type { TranscriptSegment } from '@/lib/types'
import type { MotionTranscriptSegment } from '@/components/editor/motion-edit-workspace'

const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'already', 'also', 'although', 'always',
  'another', 'anyone', 'because', 'before', 'being', 'below', 'between', 'could', 'doing',
  'during', 'either', 'every', 'first', 'found', 'from', 'further', 'going', 'have',
  'here', 'however', 'into', 'just', 'later', 'like', 'little', 'maybe', 'might', 'more',
  'most', 'much', 'must', 'never', 'next', 'nothing', 'often', 'once', 'only', 'other',
  'ought', 'over', 'really', 'right', 'same', 'should', 'since', 'some', 'still', 'such',
  'sure', 'than', 'that', 'their', 'them', 'there', 'these', 'they', 'thing', 'this',
  'those', 'through', 'together', 'under', 'until', 'very', 'when', 'where', 'which',
  'while', 'whole', 'will', 'with', 'within', 'without', 'would', 'youre', 'youve',
])

function extractEmphasis(text: string): string[] {
  const tokens = text
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9'-]+/u)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))

  const ranked = Array.from(new Set(tokens)).sort((first, second) => second.length - first.length)
  return ranked.slice(0, 3)
}

export function buildMotionTranscriptSegments(
  segments: readonly TranscriptSegment[] | null | undefined,
): MotionTranscriptSegment[] {
  const rawSegments = segments ?? []
  const orderedSegments = rawSegments
    .filter((segment) => typeof segment.text === 'string' && segment.text.trim().length > 0)
    .slice()
    .sort((first, second) => first.startMs - second.startMs)

  if (orderedSegments.length === 0) {
    return []
  }

  return orderedSegments.map((segment, index) => {
    const startMs = Math.max(0, segment.startMs)
    const endMs = Math.max(startMs, segment.endMs)
    return {
      id: String(segment.id ?? `motion-transcript-${index + 1}`),
      start: startMs / 1000,
      end: endMs / 1000,
      text: segment.text.trim(),
      emphasis: extractEmphasis(segment.text),
    }
  })
}
