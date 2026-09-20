/**
 * Filler-word detection and truthfulness engine for Prometheus Jarvis.
 * Prevents phantom filler-word strikes and accurately identifies verbal disfluencies.
 */

export const COMMON_FILLER_PATTERNS = [
  'um',
  'uh',
  'ah',
  'er',
  'erm',
  'like',
  'basically',
  'you know',
  'sort of',
  'kind of',
  'i mean',
]

export interface DetectedFillerWord {
  segmentId: string
  wordIndex: number
  word: string
  start: number
  end: number
}

export interface FillerWordDetectionResult {
  count: number
  items: DetectedFillerWord[]
  summary: string
}

export interface TranscriptWord {
  text: string
  start?: number
  end?: number
  startMs?: number
  endMs?: number
  isCut?: boolean
}

export interface TranscriptSegment {
  id?: string
  start?: number
  end?: number
  startMs?: number
  endMs?: number
  text: string
  words?: TranscriptWord[]
  isCut?: boolean
}

/**
 * Detects verbal disfluencies and filler words across transcript segments.
 * Truthful: returns count 0 and an explicit clean status if no filler words exist.
 */
export function detectFillerWords(
  segments: unknown[],
  customPatterns?: string[],
): FillerWordDetectionResult {
  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      count: 0,
      items: [],
      summary: '0 filler words detected (transcript is clean or empty).',
    }
  }

  const fillerSet = new Set(
    (customPatterns && customPatterns.length > 0 ? customPatterns : COMMON_FILLER_PATTERNS).map((p) =>
      p.toLowerCase().trim()
    )
  )

  const items: DetectedFillerWord[] = []

  segments.forEach((rawSeg, segIdx) => {
    const seg = rawSeg as TranscriptSegment
    const segId = seg.id || `seg-${segIdx}`

    if (Array.isArray(seg.words) && seg.words.length > 0) {
      seg.words.forEach((w, wIdx) => {
        if (w.isCut) return
        const clean = (w.text || '')
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
          .trim()

        if (clean && fillerSet.has(clean)) {
          const start = typeof w.start === 'number' ? w.start : (w.startMs ? w.startMs / 1000 : 0)
          const end = typeof w.end === 'number' ? w.end : (w.endMs ? w.endMs / 1000 : start + 0.3)
          items.push({
            segmentId: segId,
            wordIndex: wIdx,
            word: w.text,
            start,
            end,
          })
        }
      })
    } else if (typeof seg.text === 'string' && seg.text.trim()) {
      const words = seg.text.trim().split(/\s+/)
      const segStart = typeof seg.start === 'number' ? seg.start : (seg.startMs ? seg.startMs / 1000 : 0)
      const segEnd = typeof seg.end === 'number' ? seg.end : (seg.endMs ? seg.endMs / 1000 : segStart + 2)
      const wordDur = Math.max(0.1, (segEnd - segStart) / words.length)

      words.forEach((wText, wIdx) => {
        const clean = wText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '').trim()
        if (clean && fillerSet.has(clean)) {
          items.push({
            segmentId: segId,
            wordIndex: wIdx,
            word: wText,
            start: segStart + wIdx * wordDur,
            end: segStart + (wIdx + 1) * wordDur,
          })
        }
      })
    }
  })

  if (items.length === 0) {
    return {
      count: 0,
      items: [],
      summary: '0 filler words detected (transcript is clean). No verbal disfluencies present.',
    }
  }

  const sampleWords = items.map((i) => `"${i.word}"`).slice(0, 5).join(', ')
  return {
    count: items.length,
    items,
    summary: `Found ${items.length} filler word${items.length === 1 ? '' : 's'} (${sampleWords}${
      items.length > 5 ? '...' : ''
    }) ready to cut.`,
  }
}
