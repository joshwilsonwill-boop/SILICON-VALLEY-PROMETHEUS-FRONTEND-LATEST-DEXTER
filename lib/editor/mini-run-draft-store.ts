import { create } from 'zustand'

/**
 * Live Interactive Mini-Run Draft Store.
 *
 * Implements the state container for Phase 2 zero-lag interactive editing:
 * 1. Receives the `DraftManifest` synthesized in 3-5s by `/api/pipeline/plan`.
 * 2. Allows instant non-destructive modifications:
 *    - Inline word corrections (text editing)
 *    - Jarvis voice-driven transcript mutations
 *    - Word cutting / phrase toggles (jump-cut skipping)
 *    - Typography adjustments (font, color, placement)
 * 3. Exports the mutated draft manifest directly to `/api/pipeline/render`
 *    for deterministic final cloud rendering.
 */

export type DraftWord = {
  text: string
  startMs: number
  endMs: number
  startSec?: number
  endSec?: number
  cut?: boolean
  confidence?: number
}

export type DraftTypography = {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number | string
  textColor?: string
  strokeColor?: string
  strokeWidth?: number
  positionY?: number
  alignment?: 'center' | 'left' | 'right'
  colorFill?: string
  shadow?: string
  glow?: string
  depth?: number
}

export type DraftChunk = {
  chunkIndex: number
  startMs: number
  endMs: number
  startSec: number
  endSec: number
  wordCount: number
  text: string
  words: DraftWord[]
  typography?: DraftTypography
  placement?: Record<string, unknown>
  behindSubject?: boolean
}

export type MiniRunDraftState = {
  jobId: string | null
  status: 'idle' | 'planning' | 'planned' | 'rendering' | 'rendered' | 'error'
  error: string | null
  sourceUrl: string | null
  sourceMeta: { width?: number; height?: number; durationMs?: number } | null
  selectedWindow: { startMs: number; endMs: number; durationMs?: number } | null
  chunks: DraftChunk[]
  look: Record<string, unknown> | null
  fontManifest: Record<string, unknown> | null
  orchestrationPlan: Record<string, unknown> | null
  songPlan: Record<string, unknown> | null
  silenceTimeline: Array<{ startMs: number; endMs: number }> | null
  subjectSafePlacements: Array<Record<string, unknown>> | null
  currentTimeMs: number
  activeChunkIndex: number | null
  isDirty: boolean

  // Actions
  setPlan: (manifest: Record<string, unknown>, sourceUrl?: string) => void
  setError: (error: string | null) => void
  setStatus: (status: MiniRunDraftState['status']) => void
  setCurrentTimeMs: (timeMs: number) => void
  updateWordText: (chunkIndex: number, wordIndex: number, newText: string) => void
  toggleWordCut: (chunkIndex: number, wordIndex: number, forceCut?: boolean) => void
  updateChunkTiming: (chunkIndex: number, startMs: number, endMs: number) => void
  updateChunkTypography: (chunkIndex: number, styling: Partial<DraftTypography>) => void
  cutPhrase: (phrase: string) => boolean
  replacePhrase: (targetPhrase: string, replacementPhrase: string) => boolean
  getDraftManifest: () => Record<string, unknown>
  reset: () => void
}

const initialState = {
  jobId: null,
  status: 'idle' as const,
  error: null,
  sourceUrl: null,
  sourceMeta: null,
  selectedWindow: null,
  chunks: [],
  look: null,
  fontManifest: null,
  orchestrationPlan: null,
  songPlan: null,
  silenceTimeline: null,
  subjectSafePlacements: null,
  currentTimeMs: 0,
  activeChunkIndex: null,
  isDirty: false,
}

export const useMiniRunDraftStore = create<MiniRunDraftState>((set, get) => ({
  ...initialState,

  setPlan: (manifest: Record<string, unknown>, sourceUrl?: string) => {
    const rawChunks = Array.isArray(manifest.chunks) ? manifest.chunks : []
    const chunks: DraftChunk[] = rawChunks.map((c: any, idx: number) => {
      const words: DraftWord[] = Array.isArray(c.words)
        ? c.words.map((w: any) => ({
            text: String(w.text || ''),
            startMs: Number(w.startMs || w.start_ms || 0),
            endMs: Number(w.endMs || w.end_ms || 0),
            startSec: Number(w.startSec || w.start_sec || 0),
            endSec: Number(w.endSec || w.end_sec || 0),
            cut: Boolean(w.cut),
            confidence: typeof w.confidence === 'number' ? w.confidence : undefined,
          }))
        : []

      return {
        chunkIndex: typeof c.chunkIndex === 'number' ? c.chunkIndex : idx,
        startMs: Number(c.startMs || c.start_ms || 0),
        endMs: Number(c.endMs || c.end_ms || 0),
        startSec: Number(c.startSec || c.start_sec || (c.startMs || 0) / 1000),
        endSec: Number(c.endSec || c.end_sec || (c.endMs || 0) / 1000),
        wordCount: typeof c.wordCount === 'number' ? c.wordCount : words.length,
        text: String(c.text || words.map((w) => w.text).join(' ')),
        words,
        typography: c.typography || undefined,
        placement: c.placement || undefined,
        behindSubject: Boolean(c.behindSubject || c.behind_subject),
      }
    })

    const sourceObj = (manifest.source as any) || {}
    const selWindow = (manifest.selected_window as any) || {}

    set({
      jobId: (manifest.job_id as string) || (manifest.jobId as string) || null,
      status: 'planned',
      error: null,
      sourceUrl: sourceUrl || sourceObj.url || null,
      sourceMeta: {
        width: sourceObj.width,
        height: sourceObj.height,
        durationMs: sourceObj.duration_ms,
      },
      selectedWindow: {
        startMs: Number(selWindow.start_ms || selWindow.startMs || 0),
        endMs: Number(selWindow.end_ms || selWindow.endMs || 0),
        durationMs: Number(selWindow.duration_ms || selWindow.durationMs || 0),
      },
      chunks,
      look: (manifest.look as Record<string, unknown>) || null,
      fontManifest: (manifest.font_manifest as Record<string, unknown>) || null,
      orchestrationPlan: (manifest.orchestration_plan as Record<string, unknown>) || null,
      songPlan: (manifest.song_plan as Record<string, unknown>) || null,
      silenceTimeline: Array.isArray(manifest.silence_timeline) ? manifest.silence_timeline : null,
      subjectSafePlacements: Array.isArray(manifest.subject_safe_placements) ? manifest.subject_safe_placements : null,
      isDirty: false,
      currentTimeMs: 0,
      activeChunkIndex: chunks.length > 0 ? 0 : null,
    })
  },

  setError: (error: string | null) => set({ error, status: error ? 'error' : get().status }),

  setStatus: (status: MiniRunDraftState['status']) => set({ status }),

  setCurrentTimeMs: (currentTimeMs: number) => {
    const { chunks } = get()
    let activeChunkIndex: number | null = null
    for (let i = 0; i < chunks.length; i++) {
      if (currentTimeMs >= chunks[i].startMs && currentTimeMs <= chunks[i].endMs) {
        activeChunkIndex = i
        break
      }
    }
    set({ currentTimeMs, activeChunkIndex })
  },

  updateWordText: (chunkIndex: number, wordIndex: number, newText: string) => {
    const chunks = [...get().chunks]
    const chunk = chunks[chunkIndex]
    if (!chunk || !chunk.words[wordIndex]) return

    const newWords = [...chunk.words]
    newWords[wordIndex] = { ...newWords[wordIndex], text: newText }
    const updatedChunkText = newWords
      .filter((w) => !w.cut)
      .map((w) => w.text)
      .join(' ')

    chunks[chunkIndex] = {
      ...chunk,
      words: newWords,
      text: updatedChunkText,
    }

    set({ chunks, isDirty: true })
  },

  toggleWordCut: (chunkIndex: number, wordIndex: number, forceCut?: boolean) => {
    const chunks = [...get().chunks]
    const chunk = chunks[chunkIndex]
    if (!chunk || !chunk.words[wordIndex]) return

    const targetWord = chunk.words[wordIndex]
    const nextCutState = forceCut !== undefined ? forceCut : !targetWord.cut

    const newWords = [...chunk.words]
    newWords[wordIndex] = { ...targetWord, cut: nextCutState }
    const updatedChunkText = newWords
      .filter((w) => !w.cut)
      .map((w) => w.text)
      .join(' ')

    chunks[chunkIndex] = {
      ...chunk,
      words: newWords,
      text: updatedChunkText,
    }

    set({ chunks, isDirty: true })
  },

  updateChunkTiming: (chunkIndex: number, startMs: number, endMs: number) => {
    const chunks = [...get().chunks]
    const chunk = chunks[chunkIndex]
    if (!chunk) return

    chunks[chunkIndex] = {
      ...chunk,
      startMs,
      endMs,
      startSec: Math.round((startMs / 1000) * 1000) / 1000,
      endSec: Math.round((endMs / 1000) * 1000) / 1000,
    }

    set({ chunks, isDirty: true })
  },

  updateChunkTypography: (chunkIndex: number, styling: Partial<DraftTypography>) => {
    const chunks = [...get().chunks]
    const chunk = chunks[chunkIndex]
    if (!chunk) return

    chunks[chunkIndex] = {
      ...chunk,
      typography: {
        ...(chunk.typography || {}),
        ...styling,
      },
    }

    set({ chunks, isDirty: true })
  },

  cutPhrase: (phrase: string): boolean => {
    const target = phrase.trim().toLowerCase()
    if (!target) return false

    const { chunks } = get()
    let found = false

    const updatedChunks = chunks.map((chunk) => {
      const lowerChunk = chunk.text.toLowerCase()
      if (lowerChunk.includes(target)) {
        found = true
        // Mark matching words as cut
        const newWords = chunk.words.map((w) => {
          if (target.includes(w.text.toLowerCase())) {
            return { ...w, cut: true }
          }
          return w
        })
        return {
          ...chunk,
          words: newWords,
          text: newWords.filter((w) => !w.cut).map((w) => w.text).join(' '),
        }
      }
      return chunk
    })

    if (found) {
      set({ chunks: updatedChunks, isDirty: true })
    }
    return found
  },

  replacePhrase: (targetPhrase: string, replacementPhrase: string): boolean => {
    const target = targetPhrase.trim().toLowerCase()
    if (!target) return false

    const { chunks } = get()
    let found = false

    const updatedChunks = chunks.map((chunk) => {
      const lowerChunk = chunk.text.toLowerCase()
      if (lowerChunk.includes(target)) {
        found = true
        const repWords = replacementPhrase.trim().split(/\s+/)
        // Replace matching words
        const newWords = [...chunk.words]
        let wIdx = 0
        for (let i = 0; i < newWords.length; i++) {
          if (newWords[i].text.toLowerCase() === target || target.includes(newWords[i].text.toLowerCase())) {
            if (wIdx < repWords.length) {
              newWords[i] = { ...newWords[i], text: repWords[wIdx++] }
            }
          }
        }
        return {
          ...chunk,
          words: newWords,
          text: newWords.filter((w) => !w.cut).map((w) => w.text).join(' '),
        }
      }
      return chunk
    })

    if (found) {
      set({ chunks: updatedChunks, isDirty: true })
    }
    return found
  },

  getDraftManifest: (): Record<string, unknown> => {
    const state = get()
    return {
      job_id: state.jobId,
      source: {
        url: state.sourceUrl,
        ...(state.sourceMeta || {}),
      },
      selected_window: state.selectedWindow,
      chunks: state.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        startMs: c.startMs,
        endMs: c.endMs,
        startSec: c.startSec,
        endSec: c.endSec,
        wordCount: c.wordCount,
        text: c.text,
        words: c.words.map((w) => ({
          text: w.text,
          startMs: w.startMs,
          endMs: w.endMs,
          startSec: w.startSec,
          endSec: w.endSec,
          cut: w.cut,
        })),
        typography: c.typography,
        placement: c.placement,
        behindSubject: c.behindSubject,
      })),
      look: state.look,
      font_manifest: state.fontManifest,
      orchestration_plan: state.orchestrationPlan,
      song_plan: state.songPlan,
      subject_safe_placements: state.subjectSafePlacements,
      silence_timeline: state.silenceTimeline,
      stats: {
        total_chunks: state.chunks.length,
        total_words: state.chunks.reduce((acc, c) => acc + c.words.filter((w) => !w.cut).length, 0),
        is_user_edited: state.isDirty,
      },
    }
  },

  reset: () => set(initialState),
}))
