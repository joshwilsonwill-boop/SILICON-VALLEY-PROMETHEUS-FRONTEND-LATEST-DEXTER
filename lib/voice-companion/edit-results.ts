import type { TranscriptSegment } from '@/lib/types'
import type { VoiceActionResult } from './music-controls'

export type CutRange = { start: number; end: number }
export type VoiceEditResult = VoiceActionResult & { count: number; totalRemovedSec: number; ranges: CutRange[] }
const rounded = (seconds: number) => Math.round(seconds * 1000000) / 1000000

/** Union overlaps only. Even short gaps may contain speech and must be retained. */
export function mergeCutRanges(ranges: CutRange[]): CutRange[] {
  const sorted = ranges.filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.start >= 0 && range.end > range.start)
    .map((range) => ({ ...range })).sort((a, b) => a.start - b.start)
  const merged: CutRange[] = []
  for (const range of sorted) {
    const previous = merged[merged.length - 1]
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else merged.push(range)
  }
  return merged
}

export function planAdditionalCuts(existing: CutRange[], requested: CutRange[]): VoiceEditResult {
  const ranges: CutRange[] = []
  const prior = mergeCutRanges(existing)
  for (const wanted of mergeCutRanges(requested)) {
    let start = wanted.start
    for (const cut of prior) {
      if (cut.end <= start) continue
      if (cut.start >= wanted.end) break
      if (cut.start > start) ranges.push({ start, end: Math.min(cut.start, wanted.end) })
      start = Math.max(start, cut.end)
      if (start >= wanted.end) break
    }
    if (start < wanted.end) ranges.push({ start, end: wanted.end })
  }
  const totalRemovedSec = rounded(ranges.reduce((sum, range) => sum + range.end - range.start, 0))
  return { success: true, count: ranges.length, totalRemovedSec, ranges, summary: ranges.length ? `Cut ${ranges.length} timed range${ranges.length === 1 ? '' : 's'}, removing ${totalRemovedSec.toFixed(3)}s.` : 'No new ranges were removed; matching cuts are already applied or no pauses met the threshold.' }
}

function segmentMatches(segment: TranscriptSegment, index: number, id: string) {
  return segment.id === id || String(index) === id || `transcript-${index}` === id || `motion-transcript-${index + 1}` === id
}
function validTiming(startMs: number, endMs: number) {
  return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs >= 0 && endMs > startMs
}
function failure(segments: TranscriptSegment[], summary: string) {
  return { segments, result: { success: false, count: 0, totalRemovedSec: 0, ranges: [], summary } as VoiceEditResult }
}
function timedResult(ranges: CutRange[], count: number, label: string): VoiceEditResult {
  const merged = mergeCutRanges(ranges)
  const totalRemovedSec = rounded(merged.reduce((sum, range) => sum + range.end - range.start, 0))
  return { success: true, count, totalRemovedSec, ranges: merged, summary: count ? `${label}: ${count} change${count === 1 ? '' : 's'}, ${totalRemovedSec.toFixed(3)}s removed using transcript timestamps.` : 'No new transcript cuts were needed.' }
}

export function cutTranscriptWord(segments: TranscriptSegment[], segmentId: string, wordIndex: number) {
  const index = segments.findIndex((segment, i) => segmentMatches(segment, i, segmentId))
  const segment = segments[index]
  const word = segment?.words?.[wordIndex]
  if (!segment || !Number.isInteger(wordIndex) || wordIndex < 0 || !word || !validTiming(word.startMs, word.endMs)) return failure(segments, 'The word has no verified transcript timing. It was not cut.')
  if (segment.isCut || word.isCut) return { segments, result: timedResult([], 0, 'Word cut') }
  const words = segment.words!.map((current, i) => i === wordIndex ? { ...current, isCut: true } : current)
  return { segments: segments.map((current, i) => i === index ? { ...current, words, isCut: words.every((current) => current.isCut) } : current), result: timedResult([{ start: word.startMs / 1000, end: word.endMs / 1000 }], 1, 'Word cut') }
}

export function cutTranscriptSegment(segments: TranscriptSegment[], segmentId: string) {
  const index = segments.findIndex((segment, i) => segmentMatches(segment, i, segmentId))
  const segment = segments[index]
  if (!segment || !validTiming(segment.startMs, segment.endMs)) return failure(segments, 'The segment has no verified transcript timing. It was not cut.')
  if (segment.isCut) return { segments, result: timedResult([], 0, 'Segment cut') }
  const alreadyCutWords = segment.words?.filter((word) => word.isCut && validTiming(word.startMs, word.endMs)).map((word) => ({start:word.startMs/1000,end:word.endMs/1000})) ?? []
  const additional = planAdditionalCuts(alreadyCutWords, [{start:segment.startMs/1000,end:segment.endMs/1000}])
  return { segments: segments.map((current, i) => i === index ? { ...current, isCut: true, words: current.words?.map((word) => ({ ...word, isCut: true })) } : current), result: { ...additional, count: 1, summary: `Segment cut: ${additional.totalRemovedSec.toFixed(3)}s newly removed using transcript timestamps.` } }
}

export function cutTranscriptPhrase(segments: TranscriptSegment[], phrase: string) {
  const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[.,!?;:]/g, '').trim()
  const requested = phrase.split(/\s+/).map(normalize).filter(Boolean)
  if (!requested.length) return failure(segments, 'Provide the exact phrase to cut.')
  const words = segments.flatMap((segment) => (segment.words ?? []).map((word, wordIndex) => ({ segmentId: segment.id, wordIndex, text: normalize(word.text) })))
  const matches: number[] = []
  for (let index = 0; index <= words.length - requested.length; index += 1) {
    if (requested.every((word, offset) => word === words[index + offset].text)) matches.push(index)
  }
  if (matches.length !== 1) return failure(segments, matches.length ? 'This phrase occurs more than once. Specify its segment before cutting.' : 'No exact phrase with word timestamps matched. No words were cut.')
  let updated = segments
  const ranges: CutRange[] = []
  let count = 0
  for (const target of words.slice(matches[0], matches[0] + requested.length)) {
    const change = cutTranscriptWord(updated, target.segmentId, target.wordIndex)
    if (!change.result.success) return failure(segments, change.result.summary)
    updated = change.segments
    ranges.push(...change.result.ranges)
    count += change.result.count
  }
  return { segments: updated, result: timedResult(ranges, count, 'Phrase cut') }
}

/** Conservative hesitation tokens; discourse words such as 'like' need human context. */
export function removeTimedFillerWords(segments: TranscriptSegment[]) {
  if (!segments.some((segment) => segment.words?.some((word) => validTiming(word.startMs, word.endMs)))) return failure(segments, 'Word timestamps are unavailable. Filler words were not cut; approximate text timings are not precise enough.')
  let count = 0
  const ranges: CutRange[] = []
  const updated = segments.map((segment) => {
    if (segment.isCut || !segment.words?.length) return segment
    const words = segment.words.map((word) => {
      if (word.isCut || !validTiming(word.startMs, word.endMs) || !/^(?:u+h+|u+m+|erm+)$/i.test(word.text.trim().replace(/[.,!?;:]/g, ''))) return word
      count += 1
      ranges.push({start:word.startMs/1000,end:word.endMs/1000})
      return { ...word, isCut: true }
    })
    return { ...segment, words, isCut: words.every((word) => word.isCut) }
  })
  const result = timedResult(ranges, count, 'Hesitation cleanup')
  result.summary = count ? `${result.summary} Context dependent words such as "like" were retained.` : 'No uncut timed hesitation words were found. Context dependent words require review.'
  return { segments: updated, result }
}
