'use client'

import * as React from 'react'
import { sourceClips, splitSource, type TimelineRange } from '@/lib/editor/timeline-tools'
import type { EditorialCue } from '@/lib/editor/editorial-timeline-state'

type Edit = { splits: number[]; cuts: TimelineRange[]; cues: EditorialCue[] }

export function useTimelineTools({ source, duration, title, time, cuts, cues, onCuts, onCues }: {
  source: string; duration: number; title: string; time: number; cuts: TimelineRange[]; cues: EditorialCue[]
  onCuts?: (cuts: TimelineRange[]) => void; onCues?: (cues: EditorialCue[]) => void
}) {
  const [splits, setSplits] = React.useState<number[]>([])
  const [selected, setSelected] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<{ past: Edit[]; future: Edit[] }>({ past: [], future: [] })
  React.useEffect(() => { setSplits([]); setSelected(null); setHistory({ past: [], future: [] }) }, [source])
  const clips = sourceClips(duration, title, splits, cuts)
  const selectedClip = clips.find(clip => clip.id === selected) ?? (selected === null ? clips.find(clip => time >= clip.start && time < clip.end) : undefined)
  const selectedCue = cues.find(cue => cue.id === selected)
  const current: Edit = { splits, cuts, cues }
  const restore = (edit: Edit) => {
    setSplits(edit.splits)
    if (JSON.stringify(edit.cuts) !== JSON.stringify(cuts)) onCuts?.(edit.cuts)
    if (JSON.stringify(edit.cues) !== JSON.stringify(cues)) onCues?.(edit.cues)
    setSelected(null)
  }
  const commit = (edit: Edit) => {
    if (JSON.stringify(edit) === JSON.stringify(current)) return
    setHistory(value => ({ past: [...value.past, current], future: [] }))
    restore(edit)
  }
  return {
    clips, selected: selected ?? selectedClip?.id ?? null, select: setSelected,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    canDelete: Boolean((selectedClip && onCuts) || (selectedCue && onCues)),
    canDuplicate: Boolean(selectedCue && onCues),
    split: () => {
      if (selectedCue && onCues && time > selectedCue.start && time < selectedCue.end) {
        const id = crypto.randomUUID()
        commit({ ...current, cues: cues.flatMap(cue => cue.id === selectedCue.id ? [{ ...cue, end: time }, { ...cue, id, start: time, origin: 'editor' as const }] : [cue]) })
      } else commit({ ...current, splits: splitSource(splits, clips, time) })
    },
    remove: () => {
      if (selectedCue && onCues) commit({ ...current, cues: cues.filter(cue => cue.id !== selectedCue.id) })
      else if (selectedClip && onCuts) commit({ ...current, cuts: [...cuts, { start: selectedClip.start, end: selectedClip.end }] })
    },
    duplicate: () => {
      if (!selectedCue || !onCues) return
      const length = selectedCue.end - selectedCue.start
      const start = Math.min(duration - length, selectedCue.end)
      commit({ ...current, cues: [...cues, { ...selectedCue, id: crypto.randomUUID(), start, end: start + length, origin: 'editor' }] })
    },
    marker: () => {
      if (!onCues || time >= duration) return
      commit({ ...current, cues: [...cues, { id: crypto.randomUUID(), type: 'transition', title: 'Timeline marker', start: time, end: Math.min(duration, time + 0.1), origin: 'editor', context: { marker: true } }] })
    },
    undo: () => {
      const previous = history.past.at(-1)
      if (!previous) return
      setHistory({ past: history.past.slice(0, -1), future: [current, ...history.future] })
      restore(previous)
    },
    redo: () => {
      const next = history.future[0]
      if (!next) return
      setHistory({ past: [...history.past, current], future: history.future.slice(1) })
      restore(next)
    },
  }
}
