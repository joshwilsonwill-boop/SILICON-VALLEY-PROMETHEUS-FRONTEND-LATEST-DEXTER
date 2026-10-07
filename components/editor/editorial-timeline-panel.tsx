'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PanelBottomOpen, PanelBottomClose, Pause, Play, Search, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EditorialTranscriptSegment = {
  id: string
  start: number
  end: number
  text: string
}

type EditorialTimelinePanelProps = {
  segments?: EditorialTranscriptSegment[]
  currentTimeSec: number
  durationSec: number
  currentTimeLabel: string
  durationLabel: string
  previewPlaying: boolean
  previewMuted: boolean
  previewKind: 'video' | 'image'
  previewUrl: string
  onTogglePlayback: () => void
  onToggleMute: () => void
  onSeek: (timeSec: number) => void
}

type EditorialTranscriptProps = {
  segments?: EditorialTranscriptSegment[]
  currentTimeSec: number
  onSeek: (timeSec: number) => void
}

const DEFAULT_SEGMENTS: EditorialTranscriptSegment[] = [
  { id: 'opening', start: 0, end: 4.8, text: 'The thing most people miss is that momentum comes after you start.' },
  { id: 'idea', start: 4.8, end: 9.6, text: 'You do not have to see the entire path to make the next decision.' },
  { id: 'turn', start: 9.6, end: 14.5, text: 'Name the fear clearly, then build the edit around the truth of it.' },
  { id: 'close', start: 14.5, end: 19.2, text: 'That is where the strongest story usually begins.' },
]

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${Math.floor(safe % 60).toString().padStart(2, '0')}`
}

export function EditorialTimelinePanel({
  segments = DEFAULT_SEGMENTS,
  currentTimeSec,
  durationSec,
  currentTimeLabel,
  durationLabel,
  previewPlaying,
  previewMuted,
  previewKind,
  previewUrl,
  onTogglePlayback,
  onToggleMute,
  onSeek,
}: EditorialTimelinePanelProps) {
  const [timelineOpen, setTimelineOpen] = React.useState(true)
  const duration = durationSec > 0 ? durationSec : Math.max(60, ...segments.map((segment) => segment.end))
  const playhead = Math.min(100, Math.max(0, (currentTimeSec / duration) * 100))

  return (
    <section className="w-full max-w-[min(100%,72rem)] self-center overflow-hidden border border-white/10 bg-[#08090a]" aria-label="Editorial timeline">
      <AnimatePresence initial={false} mode="wait">
        {timelineOpen ? (
          <motion.div key="editorial-timeline" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }} className="min-w-0">
            <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={onTogglePlayback} disabled={previewKind !== 'video' || !previewUrl} className="grid size-8 place-items-center rounded-full border border-white/10 text-white/74 disabled:opacity-30" aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}>{previewPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}</button>
                <button type="button" onClick={onToggleMute} disabled={previewKind !== 'video' || !previewUrl} className="grid size-8 place-items-center text-white/48 disabled:opacity-30" aria-label={previewMuted ? 'Unmute preview' : 'Mute preview'}>{previewMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}</button>
                <span className="font-mono text-[11px] tabular-nums text-white/60">{currentTimeLabel} / {durationLabel}</span>
              </div>
              <button type="button" onClick={() => setTimelineOpen(false)} className="inline-flex min-h-8 items-center gap-2 text-xs text-white/58 transition-colors hover:text-white" aria-expanded="true"><PanelBottomClose className="size-3.5" /> Hide timeline</button>
            </div>
            <div className="border-t border-white/8 p-4">
              <div className="relative h-16 overflow-hidden rounded border border-white/10 bg-white/[0.035]" role="slider" aria-label="Editorial timeline" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTimeSec} tabIndex={0} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); onSeek(((event.clientX - bounds.left) / bounds.width) * duration) }}>
                <div className="absolute inset-x-0 top-0 h-5 border-b border-white/10" />
                {segments.map((segment) => <span key={segment.id} className="absolute inset-y-6 rounded bg-[#98f237]/20" style={{ left: `${(segment.start / duration) * 100}%`, width: `${Math.max(2, ((segment.end - segment.start) / duration) * 100)}%` }} />)}
                <span className="pointer-events-none absolute inset-y-0 border-l border-white shadow-[0_0_12px_rgba(255,255,255,.7)]" style={{ left: `${playhead}%` }} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button key="show-editorial-timeline" type="button" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} onClick={() => setTimelineOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 text-xs text-white/58 transition-colors hover:bg-white/[0.025] hover:text-white" aria-expanded="false"><PanelBottomOpen className="size-3.5" /> Show timeline</motion.button>
        )}
      </AnimatePresence>
    </section>
  )
}

export function EditorialTranscript({ segments = DEFAULT_SEGMENTS, currentTimeSec, onSeek }: EditorialTranscriptProps) {
  const [query, setQuery] = React.useState('')
  const visibleSegments = segments.filter((segment) => segment.text.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <aside className="min-h-0 border border-white/10 bg-[#08090a]" aria-label="Editorial transcript">
          <div className="flex h-11 items-center gap-2 border-b border-white/8 px-4">
            <span className="text-xs font-medium text-white/86">Transcript</span>
            <span className="text-[10px] text-white/38">Editorial</span>
          </div>
          <label className="mx-3 mt-3 flex h-8 items-center gap-2 border border-white/10 bg-black/25 px-2 text-white/44">
              <Search className="size-3.5" />
              <input aria-label="Search transcript" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transcript" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30" />
          </label>
          <div className="max-h-52 space-y-2 overflow-y-auto p-3 lg:max-h-60">
            {visibleSegments.map((segment) => {
              const active = currentTimeSec >= segment.start && currentTimeSec < segment.end
              return <button key={segment.id} type="button" onClick={() => onSeek(segment.start)} className={cn('block w-full rounded-md px-2 py-1.5 text-left text-sm leading-6 transition-colors', active ? 'bg-[#98f237]/10 text-[#c9ff7d]' : 'text-white/52 hover:bg-white/[0.03] hover:text-white/80')}><span>{segment.text}</span><span className={cn('ml-2 text-[10px]', active ? 'text-[#b4fb60]/72' : 'text-white/34')}>{formatTime(segment.start)}</span></button>
            })}
            {!visibleSegments.length ? <p className="px-2 py-3 text-xs text-white/38">No matching transcript lines.</p> : null}
          </div>
    </aside>
  )
}
