import type { TranscriptSegment } from '@/lib/types'

type JsonObject = Record<string, unknown>

const object = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}

const number = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

type TimedWord = {text: string; startMs: number; endMs: number}

/**
 * Reads the timed words array from a stored AssemblyAI transcript payload.
 * Handles both the raw AssemblyAI shape (`words[].start/end` in ms after
 * normalization) and the MAUL canonical shape (`words[].startMs/endMs`).
 */
export function assemblyTranscriptWords(payload: JsonObject): TimedWord[] {
  const words = Array.isArray(payload.words) ? payload.words : []
  const wordObjects = words.flatMap((entry) => {
    const word = object(entry)
    const value = text(word.text)
    if (!value) return []
    const startRaw = word.startMs ?? word.start_ms ?? word.start
    const endRaw = word.endMs ?? word.end_ms ?? word.end
    const startMs = number(startRaw)
    return [{text: value, startMs, endMs: Math.max(startMs, number(endRaw, startMs))}]
  })
  if (wordObjects.length) return wordObjects

  const utterances = Array.isArray(payload.utterances) ? payload.utterances : []
  return utterances.flatMap((entry) => {
    const utterance = object(entry)
    const value = text(utterance.text)
    if (!value) return []
    const startMs = number(utterance.startMs ?? utterance.start_ms ?? utterance.start)
    const endMs = number(utterance.endMs ?? utterance.end_ms ?? utterance.end, startMs)
    return [{text: value, startMs, endMs: Math.max(startMs, endMs)}]
  })
}

/**
 * Groups timed words into readable transcript segments. Mirrors the canonical
 * grouping used by the MAUL source-analysis snapshot so the motion section sees
 * the same segment shape regardless of which backend produced the transcript.
 */
export function assemblyTranscriptToSegments(payload: JsonObject): TranscriptSegment[] {
  const words = assemblyTranscriptWords(payload)
  const segments: TranscriptSegment[] = []
  let group: TimedWord[] = []
  const flush = () => {
    if (!group.length) return
    const index = segments.length
    segments.push({
      id: `transcript-${index}`,
      startMs: group[0]!.startMs,
      endMs: group.at(-1)!.endMs,
      text: group.map((word) => word.text).join(' '),
    })
    group = []
  }
  for (const word of words) {
    const previous = group.at(-1)
    if (previous && (word.startMs - previous.endMs > 800 || group.length >= 12)) flush()
    group.push(word)
    if (/[.!?]$/.test(word.text)) flush()
  }
  flush()
  return segments
}
