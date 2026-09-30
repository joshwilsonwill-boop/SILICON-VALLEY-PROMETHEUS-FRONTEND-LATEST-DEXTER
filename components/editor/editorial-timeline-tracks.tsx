'use client'

import * as React from 'react'
import {
  Music,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { useEditorialTimelineThumbnails } from '@/components/editor/editorial-timeline-thumbnails'
import type { MotionTextPlacement, MotionTranscriptSegment } from '@/components/editor/motion-edit-workspace'
import type { MusicRecommendation } from '@/lib/types'
import type { EditorialCue } from '@/lib/editor/editorial-timeline-state'
import { cn } from '@/lib/utils'

export interface EditorialVideoClip {
  id: string
  start: number
  end: number
  title: string
  type: 'video'
}

export interface EditorialTimelineTracksProps {
  previewUrl: string
  zoom: number
  effectiveDuration: number
  sourceLabel: string
  transcriptSegments: MotionTranscriptSegment[]
  captionsVisible: boolean
  currentTime: number
  textPlacements?: MotionTextPlacement[]
  cutRanges?: { start: number; end: number }[]
  selectedMusicTrack?: MusicRecommendation | null
  editorialCues?: EditorialCue[]
  onEditorialCuesChange?: (cues: EditorialCue[]) => void
  soundtrackVolume?: number
  soundtrackMuted?: boolean
  onSoundtrackVolumeChange?: (volume: number) => void
  onSoundtrackMutedChange?: (muted: boolean) => void
  onOpenMusicCatalog?: () => void
  onSeek?: (timeSec: number) => void
  // Interactive clip manipulation
  selectedClipId?: string | null
  onSelectClip?: (clipId: string | null) => void
  onSplitClip?: () => void
  onDeleteClip?: () => void
  onDuplicateClip?: () => void
  isVideoHidden?: boolean
  isMusicHidden?: boolean
}

function shortTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

function percent(time: number, duration: number): string {
  const safeDuration = Math.max(duration, 0.01)
  return `${Math.max(0, Math.min(100, (time / safeDuration) * 100))}%`
}

// Generate realistic organic audio waveform bars
function generateWaveBars(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i + seed * 17) * 0.28
    const envelope = Math.sin((i / count) * Math.PI)
    const noise = Math.abs(Math.sin(angle) * Math.cos(angle * 1.7) + Math.sin(angle * 3.1) * 0.4)
    return Math.max(0.12, Math.min(0.96, (noise * 0.75 + 0.25) * (envelope * 0.65 + 0.35)))
  })
}

export function EditorialTimelineTracks({
  previewUrl,
  zoom,
  effectiveDuration,
  sourceLabel,
  transcriptSegments,
  captionsVisible,
  currentTime,
  textPlacements,
  cutRanges,
  selectedMusicTrack,
  editorialCues = [],
  onEditorialCuesChange,
  soundtrackVolume = 0.7,
  soundtrackMuted = false,
  onSoundtrackVolumeChange,
  onSoundtrackMutedChange,
  onOpenMusicCatalog,
  onSeek,
  selectedClipId: controlledSelectedClipId,
  onSelectClip,
  isVideoHidden = false,
  isMusicHidden = false,
}: EditorialTimelineTracksProps) {
  const thumbnails = useEditorialTimelineThumbnails(previewUrl, 12)
  const width = `${zoom * 100}%`

  // Show the source as one continuous clip; generated placeholder edits must not imply cuts or B-roll.
  const [internalClips, setInternalClips] = React.useState<EditorialVideoClip[]>(() => {
    return [{ id: 'source-video', start: 0, end: Math.max(0.01, effectiveDuration), title: sourceLabel, type: 'video' }]
  })

  // Synchronize duration changes to clips if needed
  React.useEffect(() => {
    setInternalClips((current) => {
      const dur = Math.max(0.01, effectiveDuration)
      return [{ ...(current[0] ?? { id: 'source-video', type: 'video' as const }), start: 0, end: dur, title: sourceLabel }]
    })
  }, [effectiveDuration, sourceLabel])

  const [internalSelectedClipId, setInternalSelectedClipId] = React.useState<string | null>('source-video')
  const activeClipId = controlledSelectedClipId !== undefined ? controlledSelectedClipId : internalSelectedClipId

  const handleClipClick = (clipId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onSelectClip) onSelectClip(clipId)
    else setInternalSelectedClipId(clipId)
  }

  // Ruler tick marks: major marks every 5s, minor marks every 1s
  const ticks = React.useMemo(() => {
    const count = Math.max(6, Math.min(20, Math.ceil(effectiveDuration / 5)))
    return Array.from({ length: count + 1 }, (_, index) => {
      const time = (index * 5)
      return { time, label: shortTime(time) }
    }).filter((t) => t.time <= effectiveDuration)
  }, [effectiveDuration])

  const musicWaveBars = React.useMemo(() => generateWaveBars(160, 7), [])

  const resolvedCaptions = transcriptSegments

  const timelineText = React.useMemo(() => {
    const saved = editorialCues.filter((cue) => cue.type === 'text')
    const ids = new Set(saved.map((cue) => cue.id))
    return [...saved, ...(textPlacements ?? []).filter((cue) => !ids.has(cue.id)).map((cue) => ({
      id: cue.id, type: 'text' as const, start: cue.start, end: cue.end, title: cue.text,
      text: cue.text, region: cue.region, origin: 'editor' as const,
    }))]
  }, [editorialCues, textPlacements])
  const textLanes = React.useMemo(() => packCueLanes(timelineText), [timelineText])
  const visualCues = React.useMemo(() => editorialCues.filter((cue) => cue.type !== 'text'), [editorialCues])
  const visualLanes = React.useMemo(() => packCueLanes(visualCues), [visualCues])

  return (
    <div
      data-editorial-timeline-tracks
      className="relative select-none pb-2 pt-0"
      style={{ width, minWidth: '100%' }}
    >
      {/* 0. TIME RULER */}
      <div
        className="relative h-[22px] border-b border-white/10"
        aria-label="Timeline Ruler"
      >
        {ticks.map(({ time, label }) => (
          <div
            key={time}
            className="absolute top-0 h-full border-l border-white/20 text-[9px] font-mono text-white/45"
            style={{ left: percent(time, effectiveDuration) }}
          >
            <span className="absolute left-1 top-0.5 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>

      {/* 1. VIDEO TRACK (Separable Clips, Thumbnails, Selection Highlight, Trim Handles) */}
      <div
        className={cn(
          'relative mt-1.5 h-[50px] overflow-visible rounded-[4px] bg-[#111622]/90 border border-white/10 transition-opacity',
          isVideoHidden && 'opacity-20 pointer-events-none',
        )}
        aria-label="Separable Video Clips Track"
      >
        <div className="absolute inset-0 flex">
          {internalClips.map((clip) => {
            const isSelected = clip.id === activeClipId
            const leftPct = percent(clip.start, effectiveDuration)
            const widthPct = percent(clip.end - clip.start, effectiveDuration)

            return (
              <div
                key={clip.id}
                onClick={(e) => handleClipClick(clip.id, e)}
                data-clip-id={clip.id}
                data-selected={isSelected ? 'true' : 'false'}
                style={{ left: leftPct, width: widthPct }}
                className={cn(
                  'group absolute inset-y-0 cursor-pointer overflow-hidden transition-all',
                  isSelected
                    ? 'z-10 rounded-[5px] border-2 border-[#9df65a] shadow-[0_0_14px_rgba(157,246,90,0.35)]'
                    : 'border-r border-black/80 hover:brightness-110',
                )}
              >
                {/* Even filmstrip frames preserve their source aspect ratio. */}
                <div className="absolute inset-0 flex overflow-hidden bg-[#10131a]">
                  {thumbnails.length ? thumbnails.map((thumbnail, frameIndex) => (
                    <div key={`${clip.id}-frame-${frameIndex}`} className="relative min-w-0 flex-1 overflow-hidden border-r border-black/25">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbnail} alt="" aria-hidden="true" className="pointer-events-none h-full w-full object-contain" draggable={false} />
                    </div>
                  )) : (
                    <div className="h-full w-full bg-[linear-gradient(90deg,#161a22,#202530,#161a22)]" />
                  )}
                  {/* Subtle darkening gradient */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
                </div>

                {/* Selected clip title badge */}
                {isSelected && (
                  <div className="pointer-events-none absolute left-3 top-1 z-10 flex max-w-[85%] items-center gap-1.5 truncate rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                    <span className="truncate">{clip.title}</span>
                  </div>
                )}

              </div>
            )
          })}
        </div>

      </div>

      {/* 3. CAPTIONS TRACK: Separable Rounded Transcript Pills */}
      <div
        className={cn(
          'relative mt-1.5 h-[32px] overflow-hidden rounded-[4px] bg-[#0c1017]/80 transition-opacity',
          !captionsVisible && 'opacity-65',
        )}
        aria-label="Separable Transcript Captions Track"
      >
        <div className="absolute inset-0">
          {resolvedCaptions.map((segment) => {
            const isActive = currentTime >= segment.start && currentTime < segment.end
            const leftPct = percent(segment.start, effectiveDuration)
            const widthPct = percent(segment.end - segment.start, effectiveDuration)

            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => onSeek?.(segment.start)}
                style={{ left: leftPct, width: widthPct }}
                title={segment.text}
                className={cn(
                  'group absolute inset-y-[2px] cursor-pointer overflow-hidden rounded-md border px-2.5 text-left text-[10px] font-medium leading-[26px] transition-all',
                  isActive
                    ? 'border-[#9df65a] bg-[#1a2b20] text-[#e0ffd4] shadow-[0_0_10px_rgba(157,246,90,0.3)] z-10'
                    : 'border-white/10 bg-[#161b26] text-white/85 hover:border-white/30 hover:bg-[#1f2535]',
                )}
              >
                <span className="block truncate">{segment.text}</span>
              </button>
            )
          })}
        </div>
        {cutRanges?.map((range, index) => (
          <div
            key={`source-cut-${index}`}
            data-source-cut-range
            aria-hidden="true"
            title={`Cut ${shortTime(range.start)}–${shortTime(range.end)}`}
            className="pointer-events-none absolute inset-y-0 z-20 border-x border-red-300/70 bg-[repeating-linear-gradient(135deg,rgba(127,29,29,.58),rgba(127,29,29,.58)_3px,rgba(0,0,0,.22)_3px,rgba(0,0,0,.22)_6px)]"
            style={{ left: percent(range.start, effectiveDuration), width: `${Math.max(0.35, ((range.end - range.start) / Math.max(effectiveDuration, 0.01)) * 100)}%` }}
          />
        ))}
      </div>

      {/* 4. Text clips are independently placed and stacked when their times overlap. */}
      <div data-timeline-track="text" className="relative mt-1.5 overflow-hidden rounded-[4px] border border-white/10 bg-[#11131b]" style={{ height: Math.max(30, textLanes.length * 30) }} aria-label="Text placements track">
        {!textLanes.length ? <span className="flex h-[30px] items-center px-2 text-[10px] text-white/35">Text placements from the edit will appear here</span> : null}
        {textLanes.map((lane, laneIndex) => lane.map((cue) => <DraggableEditorialCue key={cue.id} cue={cue} laneIndex={laneIndex} duration={effectiveDuration} currentTime={currentTime} onSeek={onSeek} onCommit={(updated) => onEditorialCuesChange?.(replaceCue(editorialCues, cue, updated))} />))}
      </div>

      {/* 5. Backend visual cues keep their type, source timing and context on the timeline. */}
      {visualCues.length ? <div data-timeline-track="visual-cues" className="relative mt-1.5 overflow-hidden rounded-[4px] border border-[#38bdf8]/15 bg-[#0d1720]" style={{ height: Math.max(30, visualLanes.length * 30) }} aria-label="Backend visual cues track">
        {visualLanes.map((lane, laneIndex) => lane.map((cue) => <DraggableEditorialCue key={cue.id} cue={cue} laneIndex={laneIndex} duration={effectiveDuration} currentTime={currentTime} onSeek={onSeek} onCommit={(updated) => onEditorialCuesChange?.(replaceCue(editorialCues, cue, updated))} />))}
      </div> : null}

      {/* 6. MUSIC TRACK: Selected soundtrack with a clear waveform and mute control */}
      <div
        className={cn(
          'relative mt-1.5 h-[38px] overflow-hidden rounded-[4px] transition-opacity',
          isMusicHidden && 'opacity-20 pointer-events-none',
        )}
        aria-label="Music Track"
      >
        {selectedMusicTrack ? (
          <div
            data-timeline-track="music-active"
            className="group relative h-full w-full overflow-hidden rounded-[4px] border border-[#55706c]/45 bg-[linear-gradient(90deg,#101a1b_0%,#182624_52%,#11191b_100%)]"
          >
            {/* Waveform visualization */}
            <div className="absolute inset-0 flex items-center gap-[1.5px] px-2 opacity-55">
              {musicWaveBars.map((height, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-[1px] bg-[#91b9a9]"
                  style={{ height: `${Math.round(height * 68)}%` }}
                />
              ))}
            </div>

            {/* Music Track Badge & Song Title */}
            <div className="relative z-10 flex h-full items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-[#91b9a9]/15 text-[#b3d2c4]">
                  <Music className="size-3" />
                </div>
                <span className="text-[11px] font-medium text-white tracking-wide">
                  {selectedMusicTrack.title}
                </span>
                {selectedMusicTrack.artist && (
                  <span className="hidden text-[10px] text-white/50 sm:inline">
                    · {selectedMusicTrack.artist}
                  </span>
                )}
              </div>

              {/* Mute toggle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSoundtrackMutedChange?.(!soundtrackMuted)
                }}
                aria-label={soundtrackMuted ? 'Unmute music' : 'Mute music'}
                className="grid size-6 place-items-center rounded bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors"
              >
                {soundtrackMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
              </button>
            </div>
          </div>
        ) : (
          /* Empty Music Slot with Sync soundtrack to motion */
          <div
            data-timeline-track="music-empty"
            className="h-full w-full overflow-hidden rounded-[4px] border border-dashed border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] transition-all"
          >
            <button
              type="button"
              onClick={onOpenMusicCatalog}
              className="flex h-full w-full items-center gap-2 px-3 text-[11px] text-white/55 hover:text-white transition-colors"
            >
              <div className="flex size-5 items-center justify-center rounded bg-white/5 text-[#9df65a]">
                <Plus className="size-3" />
              </div>
              <span className="font-medium text-white/75">Sync soundtrack to motion</span>
              <span className="text-[10px] text-white/35">
                — click to browse catalog or personal audio
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function packCueLanes<T extends { start: number; end: number }>(cues: T[]) {
  const lanes: T[][] = []
  for (const cue of [...cues].filter((item) => item.end > item.start).sort((a, b) => a.start - b.start || a.end - b.end)) {
    const lane = lanes.find((items) => items[items.length - 1]!.end <= cue.start)
    if (lane) lane.push(cue)
    else lanes.push([cue])
  }
  return lanes
}

function replaceCue(cues: EditorialCue[], previous: EditorialCue, updated: EditorialCue) {
  const index = cues.findIndex((cue) => cue.id === previous.id)
  if (index < 0) return [...cues, updated]
  return cues.map((cue, cueIndex) => cueIndex === index ? updated : cue)
}

function DraggableEditorialCue({ cue, laneIndex, duration, currentTime, onSeek, onCommit }: {
  cue: EditorialCue
  laneIndex: number
  duration: number
  currentTime: number
  onSeek?: (time: number) => void
  onCommit: (cue: EditorialCue) => void
}) {
  const [preview, setPreview] = React.useState<{ start: number; end: number } | null>(null)
  const drag = React.useRef<{ pointerId: number; x: number; start: number; end: number; width: number; moved: boolean } | null>(null)
  const suppressClick = React.useRef(false)
  const contextSummary = Object.entries(cue.context ?? {})
    .filter(([key, value]) => ['variant', 'treatment', 'tone', 'alignment', 'layout', 'templateType', 'templateId', 'direction', 'kind', 'sourceId', 'sourceUrl', 'cue'].includes(key) && (typeof value === 'string' || typeof value === 'number'))
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ')
  const start = preview?.start ?? cue.start
  const end = preview?.end ?? cue.end
  return (
    <button
      type="button"
      data-editorial-cue-id={cue.id}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return }
        onSeek?.(start)
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
        if (!bounds?.width) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointerId: event.pointerId, x: event.clientX, start, end, width: bounds.width, moved: false }
      }}
      onPointerMove={(event) => {
        const state = drag.current
        if (!state || state.pointerId !== event.pointerId) return
        const delta = ((event.clientX - state.x) / state.width) * duration
        if (Math.abs(delta) >= 0.03) state.moved = true
        if (!state.moved) return
        const nextStart = Math.max(0, Math.min(duration - (state.end - state.start), state.start + delta))
        setPreview({ start: nextStart, end: nextStart + (state.end - state.start) })
      }}
      onPointerUp={(event) => {
        const state = drag.current
        if (!state || state.pointerId !== event.pointerId) return
        if (state.moved && preview) {
          suppressClick.current = true
          onCommit({ ...cue, start: preview.start, end: preview.end, origin: 'editor' })
        }
        drag.current = null
        setPreview(null)
      }}
      onPointerCancel={() => { drag.current = null; setPreview(null) }}
      style={{ top: laneIndex * 30 + 3, left: percent(start, duration), width: percent(end - start, duration) }}
      className={cn('absolute flex h-6 min-w-[8px] touch-none cursor-grab items-center overflow-hidden rounded border px-1.5 text-left text-[9px] text-white/85 active:cursor-grabbing', cue.type === 'text' ? 'border-dashed border-[#9df65a]/45 bg-[#9df65a]/10 hover:border-[#9df65a]' : 'border-sky-300/30 bg-sky-300/10 hover:border-sky-200/70', currentTime >= start && currentTime < end && 'ring-1 ring-white/40')}
      title={`${cue.title} · ${start.toFixed(2)}–${end.toFixed(2)}s · drag to move${cue.region ? ` · ${cue.region}` : ''}${contextSummary ? ` · ${contextSummary}` : ''}`}
    >
      <span className="truncate">{cue.text || cue.title}</span>
    </button>
  )
}
