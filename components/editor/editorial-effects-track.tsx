'use client'

import * as React from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'
import { cn } from '@/lib/utils'

export function EditorialEffectsTrack({ duration, currentTime, onSeek }: { duration: number; currentTime: number; onSeek?: (time: number) => void }) {
  const { timeline, patch } = useEditorialTimeline()
  const effects = timeline?.effects ?? []
  // Overlapping effects occupy independent lanes rather than hiding each other.
  const lanes: Array<Array<(typeof effects)[number]>> = []
  for (const cue of [...effects].sort((a, b) => a.start - b.start)) {
    if (cue.start >= duration || cue.end <= 0) continue
    const lane = lanes.find((items) => items[items.length - 1]!.end <= cue.start)
    if (lane) lane.push(cue); else lanes.push([cue])
  }
  return (
    <div data-timeline-track="effects" className="relative mt-1.5 rounded bg-[#15151c]" style={{ height: Math.max(1, lanes.length) * 30 }}>
      {!effects.length ? <span className="flex h-full items-center px-2 text-[10px] text-white/35">Sound effects will appear here when added to the edit</span> : null}
      {lanes.map((lane, index) => lane.map((cue) => {
        const start = Math.max(0, cue.start)
        const end = Math.min(duration, cue.end)
        const active = currentTime >= cue.start && currentTime < cue.end
        return (
          <div key={cue.id} className={cn('absolute flex min-w-0 items-center overflow-hidden rounded border border-amber-300/25 bg-amber-300/10 text-amber-100', active && 'border-amber-200/70 bg-amber-200/20', cue.muted && 'opacity-40')} style={{ top: index * 30 + 3, height: 24, left: `${start / duration * 100}%`, width: `${(end - start) / duration * 100}%` }}>
            <button type="button" onClick={() => onSeek?.(cue.start)} title={`${cue.title} · ${cue.start.toFixed(2)}–${cue.end.toFixed(2)}s${cue.url ? '' : ' · Audio asset pending'}`} className="h-full min-w-0 flex-1 truncate px-1.5 text-left text-[10px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200">{cue.title}</button>
            <button type="button" aria-label={`${cue.muted ? 'Unmute' : 'Mute'} ${cue.title}`} onClick={() => patch({ type: 'effect', id: cue.id, muted: !cue.muted })} className="grid h-full w-6 shrink-0 place-items-center border-l border-amber-300/15 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-200">{cue.muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}</button>
          </div>
        )
      }))}
    </div>
  )
}
