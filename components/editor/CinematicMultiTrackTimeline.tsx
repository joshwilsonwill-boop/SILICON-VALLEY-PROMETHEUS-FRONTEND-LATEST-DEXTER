'use client'

import * as React from 'react'
import {
  Film,
  Music,
  Type,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Scissors,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  shiftClip,
  trimClipStart,
  trimClipEnd,
  getActiveClipsAtTime,
  generateWaveformBars,
  formatTimelineTimecode,
  type InteractiveClip,
} from '@/lib/editor/interactive-timeline'
import type { MotionTranscriptSegment, MotionTextPlacement } from './motion-edit-workspace'

export interface CinematicMultiTrackTimelineProps {
  effectiveDuration: number
  currentTimeSec: number
  previewPlaying: boolean
  previewMuted: boolean
  sourceLabel: string
  transcriptSegments: MotionTranscriptSegment[]
  textPlacements?: MotionTextPlacement[]
  cutRanges?: Array<{ start: number; end: number }>
  captionsVisible?: boolean
  onSeek: (timeSec: number) => void
  onTogglePlayback: () => void
  onToggleMute: () => void
  onSplit?: (timeSec: number) => void
  onTextPlacementsChange?: (placements: MotionTextPlacement[]) => void
  onUpdateTranscriptSegment?: (segment: MotionTranscriptSegment) => void
  className?: string
}

const MIN_ZOOM = 1.0
const MAX_ZOOM = 4.0
const TRACK_LABEL_WIDTH = 100 // pixels

export function CinematicMultiTrackTimeline({
  effectiveDuration,
  currentTimeSec,
  previewPlaying,
  previewMuted,
  sourceLabel,
  transcriptSegments,
  textPlacements = [],
  cutRanges = [],
  captionsVisible = true,
  onSeek,
  onTogglePlayback,
  onToggleMute,
  onSplit,
  onTextPlacementsChange,
  onUpdateTranscriptSegment,
  className,
}: CinematicMultiTrackTimelineProps) {
  const [zoom, setZoom] = React.useState<number>(1.0)
  const [activeClipId, setActiveClipId] = React.useState<string | null>(null)
  const [dragState, setDragState] = React.useState<{
    clipId: string
    type: 'move' | 'trim-start' | 'trim-end'
    initialPointerX: number
    initialStartSec: number
    initialEndSec: number
    trackWidth: number
  } | null>(null)

  const [isScrubbingPlayhead, setIsScrubbingPlayhead] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const trackAreaRef = React.useRef<HTMLDivElement | null>(null)

  const safeDuration = Math.max(0.1, effectiveDuration)
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeSec / safeDuration) * 100))

  // Waveform cache for audio track
  const waveformBars = React.useMemo(() => generateWaveformBars(safeDuration, 80), [safeDuration])

  // Map text placements to interactive clips
  const [localTextPlacements, setLocalTextPlacements] = React.useState<MotionTextPlacement[]>(textPlacements)
  React.useEffect(() => {
    setLocalTextPlacements(textPlacements)
  }, [textPlacements])

  // Time conversion helpers
  const getTimeFromPointerX = React.useCallback(
    (clientX: number): number => {
      const area = trackAreaRef.current
      if (!area) return 0
      const rect = area.getBoundingClientRect()
      const x = clientX - rect.left + area.scrollLeft
      const fraction = Math.max(0, Math.min(1, x / (rect.width * zoom)))
      return fraction * safeDuration
    },
    [safeDuration, zoom],
  )

  // Playhead scrub handler
  const handleTimelinePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragState) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsScrubbingPlayhead(true)
      const targetSec = getTimeFromPointerX(event.clientX)
      onSeek(targetSec)
    },
    [dragState, getTimeFromPointerX, onSeek],
  )

  const handleTimelinePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isScrubbingPlayhead) {
        const targetSec = getTimeFromPointerX(event.clientX)
        onSeek(targetSec)
      } else if (dragState) {
        const area = trackAreaRef.current
        if (!area) return
        const rect = area.getBoundingClientRect()
        const totalTrackWidth = rect.width * zoom
        const deltaX = event.clientX - dragState.initialPointerX
        const deltaSec = (deltaX / totalTrackWidth) * safeDuration
        const snapPoints = [currentTimeSec, ...Array.from({ length: Math.ceil(safeDuration) }, (_, i) => i)]

        if (dragState.type === 'move') {
          const shifted = shiftClip(
            { startSec: dragState.initialStartSec, endSec: dragState.initialEndSec },
            deltaSec,
            safeDuration,
            { snapPoints, snapThresholdSec: 0.15 },
          )
          setLocalTextPlacements((prev) =>
            prev.map((p) => (p.id === dragState.clipId ? { ...p, start: shifted.startSec, end: shifted.endSec } : p)),
          )
          onSeek(shifted.startSec)
        } else if (dragState.type === 'trim-start') {
          const trimmed = trimClipStart(
            { startSec: dragState.initialStartSec, endSec: dragState.initialEndSec },
            dragState.initialStartSec + deltaSec,
            0.2,
            { snapPoints, snapThresholdSec: 0.15 },
          )
          setLocalTextPlacements((prev) =>
            prev.map((p) => (p.id === dragState.clipId ? { ...p, start: trimmed.startSec } : p)),
          )
          onSeek(trimmed.startSec)
        } else if (dragState.type === 'trim-end') {
          const trimmed = trimClipEnd(
            { startSec: dragState.initialStartSec, endSec: dragState.initialEndSec },
            dragState.initialEndSec + deltaSec,
            safeDuration,
            0.2,
            { snapPoints, snapThresholdSec: 0.15 },
          )
          setLocalTextPlacements((prev) =>
            prev.map((p) => (p.id === dragState.clipId ? { ...p, end: trimmed.endSec } : p)),
          )
          onSeek(trimmed.endSec)
        }
      }
    },
    [currentTimeSec, dragState, getTimeFromPointerX, isScrubbingPlayhead, onSeek, safeDuration, zoom],
  )

  const handleTimelinePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isScrubbingPlayhead) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        setIsScrubbingPlayhead(false)
      }
      if (dragState) {
        if (onTextPlacementsChange) {
          onTextPlacementsChange(localTextPlacements)
        }
        setDragState(null)
      }
    },
    [dragState, isScrubbingPlayhead, localTextPlacements, onTextPlacementsChange],
  )

  // Start clip drag or trim
  const startClipInteraction = (
    e: React.PointerEvent,
    clipId: string,
    type: 'move' | 'trim-start' | 'trim-end',
    startSec: number,
    endSec: number,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    setActiveClipId(clipId)
    const area = trackAreaRef.current
    const rect = area?.getBoundingClientRect()
    setDragState({
      clipId,
      type,
      initialPointerX: e.clientX,
      initialStartSec: startSec,
      initialEndSec: endSec,
      trackWidth: (rect?.width ?? 600) * zoom,
    })
  }

  // Active text highlight query
  const activeTextPlacements = React.useMemo(() => {
    return localTextPlacements.filter((p) => currentTimeSec >= p.start && currentTimeSec < p.end)
  }, [currentTimeSec, localTextPlacements])

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col w-full select-none rounded-xl border border-white/10 bg-[#07090e]/95 text-white shadow-2xl backdrop-blur-md overflow-hidden',
        className,
      )}
    >
      {/* ─── Top Control Bar ────────────────────────────────────────── */}
      <div className="flex h-11 items-center justify-between border-b border-white/8 px-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          {/* Transport buttons */}
          <button
            type="button"
            onClick={onTogglePlayback}
            data-action="toggle-playback"
            aria-label={previewPlaying ? 'Pause timeline' : 'Play timeline'}
            className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            {previewPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            data-action="toggle-mute"
            aria-label={previewMuted ? 'Unmute' : 'Mute'}
            className={cn(
              'flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10',
              previewMuted ? 'text-white/40' : 'text-emerald-400',
            )}
          >
            {previewMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* Timecode Readout */}
          <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums tracking-tight">
            <span className="font-semibold text-white">{formatTimelineTimecode(currentTimeSec)}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50">{formatTimelineTimecode(safeDuration)}</span>
          </div>
        </div>

        {/* Right tools: Split, Zoom */}
        <div className="flex items-center gap-3">
          {onSplit && (
            <button
              type="button"
              onClick={() => onSplit(currentTimeSec)}
              data-action="split-clip"
              title="Split at playhead (S)"
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Scissors className="size-3" />
              <span>Split</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/8">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
              className="p-1 hover:text-white text-white/40 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="size-3" />
            </button>
            <span className="font-mono text-[10px] w-7 text-center text-white/60">{zoom.toFixed(1)}x</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
              className="p-1 hover:text-white text-white/40 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Multi-Track Grid ────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Track Headers Sidebar */}
        <div
          className="flex flex-col shrink-0 border-r border-white/8 bg-[#090b10] z-20"
          style={{ width: TRACK_LABEL_WIDTH }}
        >
          {/* Ruler spacer */}
          <div className="h-6 border-b border-white/8 flex items-center px-2 text-[9px] font-mono text-white/30">
            TC RULER
          </div>
          {/* Video Track Header */}
          <div className="h-10 border-b border-white/8 flex items-center px-2.5 gap-1.5 text-[10px] font-medium text-cyan-400">
            <Film className="size-3 shrink-0" />
            <span className="truncate">VIDEO</span>
          </div>
          {/* Audio Track Header */}
          <div className="h-9 border-b border-white/8 flex items-center px-2.5 gap-1.5 text-[10px] font-medium text-emerald-400">
            <Music className="size-3 shrink-0" />
            <span className="truncate">AUDIO</span>
          </div>
          {/* Captions Track Header */}
          {captionsVisible && (
            <div className="h-8 border-b border-white/8 flex items-center px-2.5 gap-1.5 text-[10px] font-medium text-purple-400">
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">CAPTIONS</span>
            </div>
          )}
          {/* Text Placements Track Header */}
          <div className="h-9 flex items-center px-2.5 gap-1.5 text-[10px] font-medium text-amber-400">
            <Type className="size-3 shrink-0" />
            <span className="truncate">TEXT FX</span>
          </div>
        </div>

        {/* Scrollable Track Workspace */}
        <div
          ref={trackAreaRef}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
          onPointerCancel={handleTimelinePointerUp}
          className="relative flex-1 overflow-x-auto overflow-y-hidden select-none bg-[#05060a]"
        >
          <div
            className="relative min-h-full"
            style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          >
            {/* 1. Timecode Ruler */}
            <div className="h-6 border-b border-white/8 relative">
              {Array.from({ length: Math.ceil(safeDuration) + 1 }).map((_, sec) => {
                const leftPct = (sec / safeDuration) * 100
                return (
                  <div key={sec} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${leftPct}%` }}>
                    <div className="h-2 w-px bg-white/20" />
                    {sec % 2 === 0 && (
                      <span className="absolute left-1 top-1 text-[8px] font-mono text-white/40 whitespace-nowrap">
                        {sec}s
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 2. Video Master Track */}
            <div className="h-10 border-b border-white/8 relative bg-cyan-950/20 overflow-hidden group">
              <div
                className="absolute inset-y-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 flex items-center gap-2 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                style={{ left: '0%', width: '100%' }}
              >
                <div className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-[10px] font-medium text-cyan-200 truncate">{sourceLabel || 'Master Clip'}</span>
              </div>

              {/* Cut Section Overlays */}
              {cutRanges.map((range, idx) => (
                <div
                  key={`cut-${idx}`}
                  className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.3),rgba(239,68,68,0.3)_4px,rgba(0,0,0,0.6)_4px,rgba(0,0,0,0.6)_8px)] border-x border-red-500/70"
                  style={{
                    left: `${(range.start / safeDuration) * 100}%`,
                    width: `${Math.max(0.5, ((range.end - range.start) / safeDuration) * 100)}%`,
                  }}
                  title={`Cut: ${formatTimelineTimecode(range.start)} - ${formatTimelineTimecode(range.end)}`}
                />
              ))}
            </div>

            {/* 3. Audio Waveform Track */}
            <div className="h-9 border-b border-white/8 relative bg-emerald-950/20 px-1 flex items-center overflow-hidden">
              <div className="w-full flex items-end justify-between h-5 gap-0.5 opacity-60">
                {waveformBars.map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-400/70 rounded-t-sm"
                    style={{ height: `${bar * 100}%` }}
                  />
                ))}
              </div>
            </div>

            {/* 4. Captions Track */}
            {captionsVisible && (
              <div className="h-8 border-b border-white/8 relative bg-purple-950/20 overflow-hidden">
                {transcriptSegments.map((seg) => {
                  const leftPct = (seg.start / safeDuration) * 100
                  const widthPct = Math.max(1.5, ((seg.end - seg.start) / safeDuration) * 100)
                  const isActive = currentTimeSec >= seg.start && currentTimeSec < seg.end
                  return (
                    <div
                      key={seg.id}
                      className={cn(
                        'absolute inset-y-1 rounded border px-1.5 flex items-center text-[9px] truncate transition-colors duration-150',
                        seg.isCut
                          ? 'border-red-500/30 bg-red-950/40 text-red-300/50 line-through'
                          : isActive
                            ? 'border-purple-400 bg-purple-500/40 text-white font-medium shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                            : 'border-purple-500/30 bg-purple-500/15 text-purple-200/80',
                      )}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={seg.text}
                    >
                      {seg.text}
                    </div>
                  )
                })}
              </div>
            )}

            {/* 5. Text Placements / Typography Track (Interactive & Draggable) */}
            <div className="h-9 relative bg-amber-950/15 overflow-hidden">
              {localTextPlacements.map((placement) => {
                const leftPct = (placement.start / safeDuration) * 100
                const widthPct = Math.max(2.0, ((placement.end - placement.start) / safeDuration) * 100)
                const isSelected = activeClipId === placement.id
                const isCurrent = currentTimeSec >= placement.start && currentTimeSec < placement.end

                return (
                  <div
                    key={placement.id}
                    data-clip-id={placement.id}
                    data-action="drag-text-clip"
                    onPointerDown={(e) =>
                      startClipInteraction(e, placement.id, 'move', placement.start, placement.end)
                    }
                    className={cn(
                      'group absolute inset-y-1 rounded border px-1.5 flex items-center justify-between text-[9px] cursor-grab active:cursor-grabbing transition-shadow',
                      isSelected
                        ? 'border-amber-300 bg-amber-500/35 text-white shadow-[0_0_12px_rgba(251,191,36,0.6)] z-10'
                        : isCurrent
                          ? 'border-amber-400/80 bg-amber-500/25 text-amber-100'
                          : 'border-amber-400/40 bg-amber-500/15 text-amber-200/80 hover:border-amber-400/80',
                    )}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    {/* Left Trim Handle */}
                    <div
                      onPointerDown={(e) =>
                        startClipInteraction(e, placement.id, 'trim-start', placement.start, placement.end)
                      }
                      title="Trim start"
                      className="absolute left-0 inset-y-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-amber-300/60 rounded-l transition-opacity"
                    />

                    <span className="truncate font-medium">{placement.text}</span>
                    {placement.region && (
                      <span className="ml-1 text-[8px] uppercase tracking-wider text-amber-300/80 bg-black/40 px-1 rounded">
                        {placement.region}
                      </span>
                    )}

                    {/* Right Trim Handle */}
                    <div
                      onPointerDown={(e) =>
                        startClipInteraction(e, placement.id, 'trim-end', placement.start, placement.end)
                      }
                      title="Trim end"
                      className="absolute right-0 inset-y-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-amber-300/60 rounded-r transition-opacity"
                    />
                  </div>
                )
              })}
            </div>

            {/* ─── Playhead Needle ────────────────────────────────────────── */}
            <div
              className="pointer-events-none absolute inset-y-0 z-30 flex flex-col items-center"
              style={{ left: `${playheadPercent}%` }}
            >
              {/* Playhead Top Badge */}
              <div className="size-3.5 -translate-y-1 bg-red-500 rounded-sm rotate-45 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
              {/* Vertical Glowing Line */}
              <div className="w-[1.5px] flex-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
