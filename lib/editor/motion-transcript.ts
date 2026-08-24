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

export const DEFAULT_MOTION_TRANSCRIPT_SEGMENTS: MotionTranscriptSegment[] = [
  { id: 'motion-transcript-1', start: 0, end: 4.8, text: 'The thing most people miss is that momentum comes after you start.', emphasis: ['momentum', 'start'] },
  { id: 'motion-transcript-2', start: 4.8, end: 9.6, text: 'You do not have to see the entire path to make the next decision.', emphasis: ['entire path', 'next decision'] },
  { id: 'motion-transcript-3', start: 9.6, end: 14.5, text: 'Name the fear clearly, then build the edit around the truth of it.', emphasis: ['fear clearly', 'truth'] },
  { id: 'motion-transcript-4', start: 14.5, end: 19.2, text: 'That is where the strongest story usually begins.', emphasis: ['strongest story'] },
  { id: 'motion-transcript-5', start: 19.2, end: 24.8, text: 'When you cut without hesitation, the audience stays locked in.', emphasis: ['hesitation', 'audience'] },
  { id: 'motion-transcript-6', start: 24.8, end: 32.0, text: 'Every transition must earn its place on the timeline.', emphasis: ['transition', 'timeline'] },
  { id: 'motion-transcript-7', start: 32.0, end: 45.0, text: 'Focus on rhythm and clarity over superficial noise.', emphasis: ['rhythm', 'clarity'] },
  { id: 'motion-transcript-8', start: 45.0, end: 69.0, text: 'This is how ordinary footage transforms into high-converting art.', emphasis: ['footage', 'high-converting'] },
]

export function buildMotionTranscriptSegments(
  segments: readonly TranscriptSegment[] | null | undefined,
): MotionTranscriptSegment[] {
  const rawSegments = segments ?? []
  const orderedSegments = rawSegments
    .filter((segment) => typeof segment.text === 'string' && segment.text.trim().length > 0)
    .slice()
    .sort((first, second) => first.startMs - second.startMs)

  if (orderedSegments.length === 0) {
    return DEFAULT_MOTION_TRANSCRIPT_SEGMENTS
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
