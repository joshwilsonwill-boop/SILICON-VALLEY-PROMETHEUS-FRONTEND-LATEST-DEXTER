'use client'

import * as React from 'react'
import {
  Captions,
  Check,
  Crop,
  Download,
  Edit3,
  Film,
  Filter,
  Frame,
  GripHorizontal,
  Grid2X2,
  Info,
  Loader2,
  Maximize2,
  Pause,
  PanelBottomClose,
  PanelBottomOpen,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type PreviewMediaKind = 'video' | 'image'
type MotionToolId = 'enhance' | 'captions' | 'media' | 'layout'
type PreviewTreatment = 'clean' | 'contrast' | 'warm' | 'mono'
type CropRect = { left: number; top: number; width: number; height: number }

export type MotionTranscriptSegment = {
  id: string
  start: number
  end: number
  text: string
  emphasis?: string[]
}

export type MotionTextPlacement = {
  id: string
  start: number
  end: number
  text: string
  region?: 'top' | 'center' | 'bottom'
}

export interface VideoMetadataInfo {
  resolution?: string
  fps?: number | string
  duration?: string
  codec?: string
  size?: string
  aspectRatio?: string
}

export interface MotionEditWorkspaceProps {
  projectTitle: string
  previewUrl: string
  previewKind: PreviewMediaKind
  hasPreviewMedia: boolean
  sourceLabel?: string | null
  previewAspectRatio: number
  fitMode: 'fill' | 'fit'
  onFitModeChange: (mode: 'fill' | 'fit') => void
  objectFit: 'cover' | 'contain'
  mediaTransformStyle?: React.CSSProperties
  currentTimeLabel: string
  durationLabel: string
  currentTimeSec: number
  durationSec: number
  previewPlaying: boolean
  previewMuted: boolean
  onPreviewMutedChange: (muted: boolean) => void
  videoRef: React.Ref<HTMLVideoElement>
  transcriptSegments?: MotionTranscriptSegment[]
  onUpdateTranscriptSegment?: (segmentId: string, nextText: string) => void
  onRequestTranscribe?: () => void
  isTranscribing?: boolean
  videoMetadata?: VideoMetadataInfo
  onTogglePlayback: () => void
  onPickSource: () => void
  onSourceDrop?: (event: React.DragEvent) => void
  onSourceDragOver?: (event: React.DragEvent) => void
  onSourceDragLeave?: (event: React.DragEvent) => void
  isSourceDragOver?: boolean
  textPlacements?: MotionTextPlacement[]
  onSeek: (timeSec: number) => void
  onVideoLoadedMetadata?: React.ReactEventHandler<HTMLVideoElement>
  onVideoLoadedData?: React.ReactEventHandler<HTMLVideoElement>
  onVideoCanPlay?: React.ReactEventHandler<HTMLVideoElement>
  onVideoTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>
  onVideoEnded?: React.ReactEventHandler<HTMLVideoElement>
  onVideoPlay?: React.ReactEventHandler<HTMLVideoElement>
  onVideoPause?: React.ReactEventHandler<HTMLVideoElement>
  onVideoError?: React.ReactEventHandler<HTMLVideoElement>
  onImageLoaded?: React.ReactEventHandler<HTMLImageElement>
  onApplyPrompt?: (prompt: string) => void
}

const DEFAULT_TRANSCRIPT: MotionTranscriptSegment[] = [
  { id: 'opening', start: 0, end: 4.8, text: 'The thing most people miss is that momentum comes after you start.', emphasis: ['momentum', 'start'] },
  { id: 'idea', start: 4.8, end: 9.6, text: 'You do not have to see the entire path to make the next decision.', emphasis: ['entire path', 'next decision'] },
  { id: 'turn', start: 9.6, end: 14.5, text: 'Name the fear clearly, then build the edit around the truth of it.', emphasis: ['fear clearly', 'truth'] },
  { id: 'close', start: 14.5, end: 19.2, text: 'That is where the strongest story usually begins.', emphasis: ['strongest story'] },
]

const TOOLS = [
  { id: 'enhance', label: 'AI enhance', icon: Sparkles },
  { id: 'captions', label: 'Captions', icon: Captions },
  { id: 'media', label: 'Media', icon: Upload },
  { id: 'layout', label: 'Layout', icon: Grid2X2 },
] as const

const TREATMENTS: { id: PreviewTreatment; label: string; filter: string }[] = [
  { id: 'clean', label: 'Clean', filter: 'none' },
  { id: 'contrast', label: 'Contrast', filter: 'contrast(1.12) saturate(1.08)' },
  { id: 'warm', label: 'Warm', filter: 'sepia(.15) saturate(1.12) contrast(1.04)' },
  { id: 'mono', label: 'Mono', filter: 'grayscale(1) contrast(1.12)' },
]

const DEFAULT_CROP_RECT: CropRect = { left: 0, top: 0, width: 100, height: 100 }
const DEFAULT_TIMELINE_HEIGHT = 160
const MIN_TIMELINE_HEIGHT = 112
const MAX_TIMELINE_HEIGHT_ARIA = 1000
const TIMELINE_REVEAL_THRESHOLD = 8
const TIMELINE_COLLAPSE_THRESHOLD = 84
const TIMELINE_RESIZE_STEP = 16

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const remaining = Math.floor(safe % 60)
  const centiseconds = Math.floor((safe % 1) * 100)
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

function isActiveSegment(segment: MotionTranscriptSegment, time: number) {
  return time >= segment.start && time < segment.end
}

function HighlightedTranscript({ segment, active }: { segment: MotionTranscriptSegment; active: boolean }) {
  const words = segment.text.split(/(\s+)/)
  const emphasis = segment.emphasis ?? []

  return <span>{words.map((word, index) => {
    const normalized = word.trim().replace(/[.,!?]/g, '').toLowerCase()
    const emphasized = emphasis.some((item) => item.toLowerCase().includes(normalized) && normalized.length > 2)
    return <span key={`${word}-${index}`} className={cn(emphasized && active ? 'text-[#b4fb60]' : active ? 'text-white' : 'text-white/52')}>{word}</span>
  })}</span>
}

export function MotionEditWorkspace({
  projectTitle, previewUrl, previewKind, hasPreviewMedia, sourceLabel, previewAspectRatio, fitMode,
  onFitModeChange, objectFit, mediaTransformStyle, currentTimeLabel, durationLabel, currentTimeSec,
  durationSec, previewPlaying, previewMuted, onPreviewMutedChange, videoRef, transcriptSegments,
  onUpdateTranscriptSegment, onRequestTranscribe, isTranscribing = false, videoMetadata,
  onTogglePlayback, onPickSource, onSourceDrop, onSourceDragOver, onSourceDragLeave, isSourceDragOver = false,
  textPlacements, onSeek, onVideoLoadedMetadata, onVideoLoadedData, onVideoCanPlay,
  onVideoTimeUpdate, onVideoEnded, onVideoPlay, onVideoPause, onVideoError, onImageLoaded, onApplyPrompt,
}: MotionEditWorkspaceProps) {
  const resolvedSegments = React.useMemo(() => {
    if (Array.isArray(transcriptSegments) && transcriptSegments.length > 0) {
      return transcriptSegments
    }
    return DEFAULT_TRANSCRIPT
  }, [transcriptSegments])

  const [activeTool, setActiveTool] = React.useState<MotionToolId>('layout')
  const [zoom, setZoom] = React.useState(1)
  const [showTimeline, setShowTimeline] = React.useState(true)
  const [timelineHeight, setTimelineHeight] = React.useState(DEFAULT_TIMELINE_HEIGHT)
  const [cropEnabled, setCropEnabled] = React.useState(true)
  const [cropRect, setCropRect] = React.useState<CropRect>(DEFAULT_CROP_RECT)
  const [captionsVisible, setCaptionsVisible] = React.useState(false)
  const [treatment, setTreatment] = React.useState<PreviewTreatment>('clean')
  const [transcriptQuery, setTranscriptQuery] = React.useState('')
  const [activeOnly, setActiveOnly] = React.useState(false)
  const [showMetadata, setShowMetadata] = React.useState(false)
  const workspaceRef = React.useRef<HTMLElement>(null)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const timelineDragRef = React.useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null)
  const timelineResizeRef = React.useRef<{ pointerId: number; startY: number; startHeight: number; rawHeight: number } | null>(null)
  const [timelineDragging, setTimelineDragging] = React.useState(false)
  const [timelineResizing, setTimelineResizing] = React.useState(false)

  const effectiveDuration = durationSec > 0 ? durationSec : Math.max(60, ...resolvedSegments.map((segment) => segment.end))
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeSec / effectiveDuration) * 100))
  const activeSegment = resolvedSegments.find((segment) => isActiveSegment(segment, currentTimeSec))
  const safeAspectRatio = Number.isFinite(previewAspectRatio) && previewAspectRatio > 0 ? previewAspectRatio : 16 / 9
  const visibleSegments = resolvedSegments.filter((segment) => {
    const matchesQuery = segment.text.toLowerCase().includes(transcriptQuery.trim().toLowerCase())
    return matchesQuery && (!activeOnly || isActiveSegment(segment, currentTimeSec))
  })
  const activeTreatment = TREATMENTS.find((item) => item.id === treatment) ?? TREATMENTS[0]

  React.useEffect(() => {
    const root = transcriptRef.current
    root?.querySelector<HTMLElement>('[data-active-transcript="true"]')?.scrollIntoView({ block: 'nearest', behavior: previewPlaying ? 'smooth' : 'auto' })
  }, [activeSegment?.id, previewPlaying])

  const seekFromPointer = React.useCallback((clientX: number) => {
    const timeline = timelineRef.current
    if (!timeline) return
    const bounds = timeline.getBoundingClientRect()
    const contentX = clientX - bounds.left + timeline.scrollLeft
    onSeek(Math.min(1, Math.max(0, contentX / timeline.scrollWidth)) * effectiveDuration)
  }, [effectiveDuration, onSeek])

  const startTimelineDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current
    if (!timeline) return
    timeline.setPointerCapture(event.pointerId)
    timelineDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: timeline.scrollLeft, moved: false }
    setTimelineDragging(true)
  }

  const moveTimelineDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current
    const drag = timelineDragRef.current
    if (!timeline || !drag || drag.pointerId !== event.pointerId) return
    const delta = event.clientX - drag.startX
    if (Math.abs(delta) > 4) drag.moved = true
    timeline.scrollLeft = drag.startScrollLeft - delta
  }

  const endTimelineDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const timeline = timelineRef.current
    const drag = timelineDragRef.current
    if (!timeline || !drag || drag.pointerId !== event.pointerId) return
    if (!drag.moved) seekFromPointer(event.clientX)
    if (timeline.hasPointerCapture(event.pointerId)) timeline.releasePointerCapture(event.pointerId)
    timelineDragRef.current = null
    setTimelineDragging(false)
  }

  const getMaximumTimelineHeight = React.useCallback(() => {
    const workspaceHeight = workspaceRef.current?.getBoundingClientRect().height ?? 640
    return Math.max(MIN_TIMELINE_HEIGHT, Math.floor(workspaceHeight * 0.62))
  }, [])

  const resizeTimelineTo = React.useCallback((height: number) => {
    const nextHeight = Math.min(getMaximumTimelineHeight(), Math.max(MIN_TIMELINE_HEIGHT, height))
    setTimelineHeight(nextHeight)
    return nextHeight
  }, [getMaximumTimelineHeight])

  const startTimelineResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const startHeight = showTimeline ? timelineHeight : 0
    timelineResizeRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight, rawHeight: startHeight }
    setTimelineResizing(true)
  }

  const moveTimelineResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = timelineResizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rawHeight = drag.startHeight + drag.startY - event.clientY
    drag.rawHeight = rawHeight
    if (rawHeight > TIMELINE_REVEAL_THRESHOLD) {
      setShowTimeline(true)
      resizeTimelineTo(rawHeight)
    }
  }

  const endTimelineResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = timelineResizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.rawHeight <= TIMELINE_COLLAPSE_THRESHOLD) setShowTimeline(false)
    else resizeTimelineTo(drag.rawHeight)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    timelineResizeRef.current = null
    setTimelineResizing(false)
  }

  const handleTimelineResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === 'ArrowUp' || event.key === 'PageUp'
      ? (event.key === 'PageUp' ? TIMELINE_RESIZE_STEP * 3 : TIMELINE_RESIZE_STEP)
      : event.key === 'ArrowDown' || event.key === 'PageDown'
        ? -(event.key === 'PageDown' ? TIMELINE_RESIZE_STEP * 3 : TIMELINE_RESIZE_STEP)
        : 0
    if (delta) {
      event.preventDefault()
      const nextHeight = (showTimeline ? timelineHeight : 0) + delta
      if (nextHeight <= TIMELINE_COLLAPSE_THRESHOLD) setShowTimeline(false)
      else {
        setShowTimeline(true)
        resizeTimelineTo(nextHeight)
      }
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setShowTimeline((value) => !value)
    }
  }

  const timelineResizeHandle = (
    <div
      role="separator"
      aria-label="Resize timeline panel"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={MAX_TIMELINE_HEIGHT_ARIA}
      aria-valuenow={showTimeline ? Math.round(timelineHeight) : 0}
      aria-valuetext={showTimeline ? `Timeline height ${Math.round(timelineHeight)} pixels` : 'Timeline collapsed'}
      tabIndex={0}
      title="Drag to resize timeline. Drag down to collapse; drag up to expand."
      onPointerDown={startTimelineResize}
      onPointerMove={moveTimelineResize}
      onPointerUp={endTimelineResize}
      onPointerCancel={endTimelineResize}
      onDoubleClick={() => setShowTimeline((value) => !value)}
      onKeyDown={handleTimelineResizeKeyDown}
      className={cn(
        'group absolute inset-x-0 top-0 z-30 flex h-4 -translate-y-1/2 touch-none cursor-row-resize items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#98f237]/65',
        timelineResizing && 'cursor-grabbing',
      )}
    >
      <span className="flex h-2.5 w-16 items-center justify-center rounded-full border border-white/10 bg-[#111315] text-white/38 shadow-[0_2px_8px_rgba(0,0,0,.7)] transition-[width,color,border-color,background-color] group-hover:w-20 group-hover:border-[#98f237]/35 group-hover:bg-[#151817] group-hover:text-[#b4fb60] group-focus-visible:w-20 group-focus-visible:text-[#b4fb60]">
        <GripHorizontal className="size-3.5" aria-hidden="true" />
      </span>
    </div>
  )
  const selectTool = (tool: MotionToolId) => {
    setActiveTool(tool)
    if (tool === 'media') onPickSource()
    if (tool === 'captions') setCaptionsVisible(true)
  }

  const applyTreatment = (nextTreatment: PreviewTreatment) => {
    setTreatment(nextTreatment)
  }

  const renderMedia = () => hasPreviewMedia ? (
    previewKind === 'image' ? (
      <img src={previewUrl} alt={projectTitle} onLoad={onImageLoaded} className="h-full w-full bg-black object-center" style={{ ...mediaTransformStyle, objectFit: fitMode === 'fill' ? 'cover' : objectFit, filter: activeTreatment.filter }} />
    ) : (
      <video key={previewUrl} ref={videoRef} src={previewUrl} className="h-full w-full bg-black object-center" muted={previewMuted} playsInline controls={false} preload="metadata" onLoadedMetadata={onVideoLoadedMetadata} onLoadedData={onVideoLoadedData} onCanPlay={onVideoCanPlay} onTimeUpdate={onVideoTimeUpdate} onEnded={onVideoEnded} onPlay={onVideoPlay} onPause={onVideoPause} onError={onVideoError} style={{ ...mediaTransformStyle, objectFit: fitMode === 'fill' ? 'cover' : objectFit, filter: activeTreatment.filter }} />
    )
  ) : (
    <button type="button" onClick={onPickSource} className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(152,242,55,0.1),transparent_38%)] text-sm text-white/66 transition-colors hover:text-white"><span className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-black/45 px-4 py-2.5"><Upload className="size-4" /> Choose source media</span></button>
  )

  const [editingSegmentId, setEditingSegmentId] = React.useState<string | null>(null)
  const [editingText, setEditingText] = React.useState('')

  const handleStartEdit = (segment: MotionTranscriptSegment, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSegmentId(segment.id)
    setEditingText(segment.text)
  }

  const handleSaveEdit = (segmentId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation()
    if (editingText.trim() && onUpdateTranscriptSegment) {
      onUpdateTranscriptSegment(segmentId, editingText.trim())
    }
    setEditingSegmentId(null)
  }

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingSegmentId(null)
  }

  return (
    <section ref={workspaceRef} data-motion-chamber className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#080808_0%,#000_68%)] text-white" aria-label="Motion editing workspace" onDragOver={onSourceDragOver} onDragLeave={onSourceDragLeave} onDrop={onSourceDrop}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.035)_0_1px,transparent_1.2px)] bg-[length:7px_7px] opacity-[0.24]" aria-hidden="true" />
      {isSourceDragOver ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm" aria-hidden="true">
          <span className="inline-flex items-center gap-2 rounded-md border border-[#98f237]/45 bg-[#0a0d08] px-5 py-3 text-sm text-[#b4fb60] shadow-[0_0_40px_rgba(152,242,55,0.22)]"><Upload className="size-4" /> Drop source video to replace media</span>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden w-[clamp(270px,26vw,360px)] shrink-0 flex-col border-r border-white/10 xl:flex">
          <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-white/8 px-4">
            <span className="text-sm font-medium">Transcript</span>
            <span className="rounded bg-[#98f237]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#b4fb60]">AssemblyAI</span>
            {onRequestTranscribe ? (
              <button
                type="button"
                onClick={onRequestTranscribe}
                disabled={isTranscribing}
                className="inline-flex items-center gap-1 rounded bg-white/[0.08] px-2 py-1 text-[10px] text-white/70 hover:bg-white/[0.14] hover:text-white disabled:opacity-40"
                title="Transcribe source video with AssemblyAI"
              >
                {isTranscribing ? <Loader2 className="size-3 animate-spin text-[#98f237]" /> : <RefreshCw className="size-3" />}
                <span>Sync</span>
              </button>
            ) : null}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowMetadata((v) => !v)}
                className={cn('grid size-8 place-items-center rounded transition-colors', showMetadata ? 'bg-[#98f237]/15 text-[#b4fb60]' : 'text-white/58 hover:bg-white/5 hover:text-white')}
                aria-label="Toggle Video Metadata"
                title="Video Metadata"
              >
                <Info className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTranscriptQuery((value) => value ? '' : ' ')}
                className="grid size-8 place-items-center rounded text-white/58 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Search transcript"
              >
                <Search className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveOnly((value) => !value)}
                className={cn('grid size-8 place-items-center rounded transition-colors', activeOnly ? 'text-[#b4fb60]' : 'text-white/58 hover:bg-white/5 hover:text-white')}
                aria-label="Filter transcript to current line"
              >
                <Filter className="size-3.5" />
              </button>
            </div>
          </div>

          {showMetadata ? (
            <div className="border-b border-white/8 bg-white/[0.02] p-4 text-xs text-white/80">
              <div className="flex items-center justify-between pb-2">
                <span className="font-semibold text-white flex items-center gap-1.5"><Film className="size-3.5 text-[#98f237]" /> Video Metadata</span>
                <span className="text-[10px] text-white/40">Server Source</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="rounded bg-black/40 p-2 border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Resolution</div>
                  <div className="font-mono text-white/90">{videoMetadata?.resolution || (previewAspectRatio ? (previewAspectRatio > 1 ? '1920x1080' : '1080x1920') : '1080p')}</div>
                </div>
                <div className="rounded bg-black/40 p-2 border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Aspect Ratio</div>
                  <div className="font-mono text-white/90">{videoMetadata?.aspectRatio || (safeAspectRatio.toFixed(2) + ':1')}</div>
                </div>
                <div className="rounded bg-black/40 p-2 border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Duration</div>
                  <div className="font-mono text-white/90">{durationLabel || formatTime(effectiveDuration)}</div>
                </div>
                <div className="rounded bg-black/40 p-2 border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Framerate</div>
                  <div className="font-mono text-white/90">{videoMetadata?.fps ? `${videoMetadata.fps} fps` : '30.00 fps'}</div>
                </div>
                <div className="rounded bg-black/40 p-2 border border-white/5 col-span-2">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Encoding / Codec</div>
                  <div className="font-mono text-white/90">{videoMetadata?.codec || 'H.264 / AAC (48.0 kHz)'}</div>
                </div>
              </div>
            </div>
          ) : null}

          {transcriptQuery !== '' ? (
            <div className="border-b border-white/8 px-4 py-2.5">
              <label className="sr-only" htmlFor="motion-transcript-search">Search transcript</label>
              <input
                id="motion-transcript-search"
                autoFocus
                value={transcriptQuery.trim()}
                onChange={(event) => setTranscriptQuery(event.target.value)}
                placeholder="Search transcript..."
                className="h-8 w-full rounded-md border border-white/10 bg-black/30 px-3 text-xs text-white outline-none placeholder:text-white/34 focus:border-[#98f237]/50"
              />
            </div>
          ) : null}

          <div ref={transcriptRef} className="premium-scroll-hide min-h-0 flex-1 overflow-y-auto p-4">
            {isTranscribing ? (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#98f237]/30 bg-[#98f237]/10 p-3 text-xs text-[#b4fb60] shadow-[0_0_20px_rgba(152,242,55,0.15)]">
                <Loader2 className="size-4 animate-spin shrink-0 text-[#98f237]" />
                <div>
                  <div className="font-semibold text-white">Transcribing with AssemblyAI...</div>
                  <div className="text-[11px] text-white/60">Processing speech and aligning word timestamps.</div>
                </div>
              </div>
            ) : null}

            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onApplyPrompt?.('Clean up the selected speech in the current edit.')}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-white/86 transition-colors hover:bg-white/[0.13]"
              >
                <Wand2 className="size-3.5 text-[#98f237]" /> Speech cleanup
              </button>
              {onRequestTranscribe && !isTranscribing ? (
                <button
                  type="button"
                  onClick={onRequestTranscribe}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#98f237]/30 bg-[#98f237]/10 px-2.5 py-1.5 text-xs font-medium text-[#b4fb60] transition-colors hover:bg-[#98f237]/20"
                >
                  <Sparkles className="size-3.5" /> Re-transcribe
                </button>
              ) : null}
            </div>

            <div className="space-y-3.5 text-[17px] leading-8">
              {visibleSegments.map((segment) => {
                const active = isActiveSegment(segment, currentTimeSec)
                const isEditing = editingSegmentId === segment.id

                if (isEditing) {
                  return (
                    <div key={segment.id} className="rounded-md border border-[#98f237]/40 bg-black/50 p-2.5 shadow-lg">
                      <textarea
                        autoFocus
                        rows={3}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSaveEdit(segment.id)
                          } else if (e.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        className="w-full resize-none rounded border border-white/10 bg-black/60 p-2 text-xs leading-relaxed text-white outline-none focus:border-[#98f237]"
                      />
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          <X className="size-3" /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSaveEdit(segment.id, e)}
                          className="inline-flex items-center gap-1 rounded bg-[#98f237] px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-[#b4fb60]"
                        >
                          <Check className="size-3" /> Save
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={segment.id}
                    data-active-transcript={active}
                    onClick={() => onSeek(segment.start)}
                    className={cn(
                      'group relative block w-full cursor-pointer rounded-md p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98f237]/55',
                      active ? 'bg-white/[0.045] ring-1 ring-[#98f237]/25' : 'hover:bg-white/[0.025]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <HighlightedTranscript segment={segment} active={active} />
                        <span className={cn('ml-2 inline-flex translate-y-[-1px] rounded px-1.5 py-0.5 text-[10px] tabular-nums leading-none', active ? 'bg-[#98f237]/16 font-semibold text-[#b4fb60]' : 'bg-white/[0.08] text-white/38')}>
                          {formatTime(segment.start).slice(0, 5)}
                        </span>
                      </div>
                      {onUpdateTranscriptSegment ? (
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(segment, e)}
                          title="Edit transcript text"
                          className="opacity-0 transition-opacity group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
                        >
                          <Edit3 className="size-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
              {visibleSegments.length === 0 ? (
                <p className="text-sm text-white/42">No matching transcript lines.</p>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative shrink-0 border-b border-white/8 px-3 py-1.5 sm:px-5">
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-white/62"><span className="hidden sm:inline">Motion edit</span><span className="rounded border border-white/10 px-2 py-1 text-[11px] tabular-nums">{safeAspectRatio.toFixed(2)}:1</span><button type="button" onClick={() => onFitModeChange(fitMode === 'fill' ? 'fit' : 'fill')} className="inline-flex min-h-9 items-center gap-1.5 rounded px-1.5 transition-colors hover:bg-white/[0.06] hover:text-white"><Maximize2 className="size-3.5" /> {fitMode === 'fill' ? 'Fill frame' : 'Fit frame'}</button></div>
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => onApplyPrompt?.(`Add a motion marker at ${formatTime(currentTimeSec)} in ${projectTitle}.`)} className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-white/72 transition-colors hover:bg-white/[0.1] hover:text-white" aria-label="Add motion marker"><Plus className="size-4" /></button><button type="button" onClick={() => onApplyPrompt?.('Prepare the current motion edit for export.')} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/85"><Download className="size-3.5" /> <span className="hidden sm:inline">Export</span></button></div>
            </div>
            <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 lg:hidden" aria-label="Motion tools">{TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTool(id)} className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors', activeTool === id ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#c9ff7d]' : 'border-white/10 text-white/58 hover:text-white')}><Icon className="size-3.5" />{label}</button>)}</div>
            <ToolPanel activeTool={activeTool} treatment={treatment} captionsVisible={captionsVisible} cropEnabled={cropEnabled} fitMode={fitMode} onTreatment={applyTreatment} onToggleCaptions={() => setCaptionsVisible((value) => !value)} onToggleCrop={() => setCropEnabled((value) => !value)} onToggleFit={() => onFitModeChange(fitMode === 'fill' ? 'fit' : 'fill')} onPickSource={onPickSource} />
          </header>

          <div className="relative min-h-[220px] flex-1 overflow-hidden bg-black/18 p-2 sm:min-h-[280px] sm:p-3 lg:min-h-0 lg:p-3">
            <div className="grid h-full w-full place-items-center [container-type:size]">
              <div
                className="relative aspect-[var(--motion-preview-aspect)] w-[min(100cqw,calc(100cqh*var(--motion-preview-aspect)))] max-h-full max-w-full"
                style={{ '--motion-preview-aspect': safeAspectRatio } as React.CSSProperties}
              >
                <div className="relative h-full w-full overflow-hidden border border-white/18 bg-black shadow-[0_28px_80px_rgba(0,0,0,0.56)]">
                  {renderMedia()}
                  <div className="pointer-events-none absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded bg-black/60 px-2.5 py-1.5 text-[10px] text-white/72 backdrop-blur-sm"><Frame className="size-3 shrink-0 text-[#98f237]" /><span className="truncate">{sourceLabel ?? 'Source video'}</span></div>
                  {captionsVisible && activeSegment ? <div className="pointer-events-none absolute inset-x-[10%] bottom-8 text-center text-[clamp(.7rem,1.7vw,1.2rem)] font-semibold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,1)]">{activeSegment.text}</div> : null}
                  <button type="button" onClick={onTogglePlayback} disabled={previewKind !== 'video' || !previewUrl} className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-full border border-white/12 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/82 disabled:cursor-not-allowed disabled:opacity-35" aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}>{previewPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button>
                </div>
                {cropEnabled ? <CropFrame rect={cropRect} onChange={setCropRect} /> : null}
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[72px] shrink-0 border-l border-white/8 bg-black/28 lg:flex lg:flex-col lg:items-center lg:gap-2 lg:pt-3">{TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTool(id)} className={cn('group flex min-h-12 w-full flex-col items-center gap-1 border-l-2 px-1 py-1.5 text-[9px] font-medium transition-colors', activeTool === id ? 'border-[#98f237] text-white' : 'border-transparent text-white/46 hover:text-white/82')}><span className={cn('grid size-7 place-items-center rounded-md transition-colors', activeTool === id ? 'bg-[#98f237]/12 text-[#b4fb60]' : 'text-white/65 group-hover:bg-white/[0.06]')}><Icon className="size-3.5" /></span>{label}</button>)}<div className="mt-auto mb-3 text-[8px] uppercase tracking-[0.12em] text-white/28">{activeTool}</div></aside>
      </div>

      {showTimeline ? <section className="relative shrink-0 border-t border-white/12 bg-[#070809]/95" style={{ height: timelineHeight }} aria-label="Video timeline">{timelineResizeHandle}<div className="flex h-11 items-center justify-between border-b border-white/8 px-3 sm:px-5"><div className="flex items-center gap-1.5 sm:gap-3"><span className="text-xs font-medium text-white/86">Timeline</span><button type="button" onClick={() => setShowTimeline(false)} className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-white/62 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white" aria-label="Collapse timeline" title="Collapse timeline"><PanelBottomClose className="size-3.5" /></button><button type="button" onClick={() => setCropEnabled((value) => !value)} className={cn('grid size-8 place-items-center rounded border transition-colors', cropEnabled ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#b4fb60]' : 'border-white/10 text-white/56 hover:text-white')} aria-label="Toggle crop frame"><Crop className="size-3.5" /></button><button type="button" onClick={onTogglePlayback} disabled={previewKind !== 'video' || !previewUrl} className="grid size-8 place-items-center text-white/82 disabled:opacity-35" aria-label={previewPlaying ? 'Pause timeline' : 'Play timeline'}>{previewPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}</button><button type="button" onClick={() => onPreviewMutedChange(!previewMuted)} disabled={previewKind !== 'video' || !previewUrl} className={cn('grid size-8 place-items-center transition-colors disabled:opacity-35', previewMuted ? 'text-white/42' : 'text-[#b4fb60]')} aria-label={previewMuted ? 'Unmute preview' : 'Mute preview'}><Volume2 className="size-3.5" /></button><span className="hidden font-mono text-xs tabular-nums text-white/78 sm:inline">{currentTimeLabel} <span className="mx-1 text-white/28">/</span> {durationLabel}</span></div><label className="flex items-center gap-2 text-white/52"><ZoomOut className="size-3.5" /><span className="sr-only">Timeline zoom</span><input aria-label="Timeline zoom" type="range" min="0.7" max="2.4" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-1 w-16 accent-[#98f237] sm:w-20" /><ZoomIn className="size-3.5" /></label></div><div className="flex min-h-0"><div className="hidden w-24 shrink-0 border-r border-white/8 pt-8 text-right text-[10px] text-white/40 sm:block"><div className="pr-3">Video</div><div className="mt-7 pr-3">Audio</div><div className="mt-6 pr-3">Captions</div><div className="mt-6 pr-3">Text</div></div><div ref={timelineRef} onPointerDown={startTimelineDrag} onPointerMove={moveTimelineDrag} onPointerUp={endTimelineDrag} onPointerCancel={endTimelineDrag} className={cn('premium-scroll-hide relative min-w-0 flex-1 touch-none select-none overflow-x-auto overflow-y-hidden px-3 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98f237]/60', timelineDragging ? 'cursor-grabbing' : 'cursor-grab')} role="slider" aria-label="Timeline. Drag to scroll, click to seek." aria-valuemin={0} aria-valuemax={effectiveDuration} aria-valuenow={currentTimeSec} tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); onSeek(Math.max(0, currentTimeSec - 1)) } if (event.key === 'ArrowRight') { event.preventDefault(); onSeek(Math.min(effectiveDuration, currentTimeSec + 1)) } if (event.key === 'Home') { event.preventDefault(); onSeek(0) } if (event.key === 'End') { event.preventDefault(); onSeek(effectiveDuration) } }}><TimelineTracks zoom={zoom} effectiveDuration={effectiveDuration} sourceLabel={sourceLabel ?? projectTitle} transcriptSegments={resolvedSegments} captionsVisible={captionsVisible} currentTime={currentTimeSec} textPlacements={textPlacements} /><div className="pointer-events-none absolute bottom-0 top-0 z-10 border-l border-white shadow-[0_0_12px_rgba(255,255,255,.75)]" style={{ left: `calc(${playheadPercent * zoom}% + 0.75rem)` }}><span className="absolute -left-1.5 -top-1 size-3 rotate-45 bg-white" /></div></div></div></section> : <div className="relative h-10 shrink-0 border-t border-white/10 bg-[#070809]">{timelineResizeHandle}<button type="button" onClick={() => setShowTimeline(true)} className="group flex h-full w-full items-center justify-center gap-2 text-xs text-white/58 transition-colors hover:bg-white/[0.025] hover:text-white"><PanelBottomOpen className="size-3.5 transition-transform group-hover:-translate-y-0.5" /> Show timeline</button></div>}
    </section>
  )
}

type CropHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const MIN_CROP_SIZE = 18

function resizeCropRect(rect: CropRect, handle: CropHandle, deltaX: number, deltaY: number): CropRect {
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const changesLeft = handle === 'top-left' || handle === 'bottom-left'
  const changesTop = handle === 'top-left' || handle === 'top-right'
  const nextLeft = changesLeft ? Math.min(right - MIN_CROP_SIZE, Math.max(0, rect.left + deltaX)) : rect.left
  const nextRight = changesLeft ? right : Math.max(rect.left + MIN_CROP_SIZE, Math.min(100, right + deltaX))
  const nextTop = changesTop ? Math.min(bottom - MIN_CROP_SIZE, Math.max(0, rect.top + deltaY)) : rect.top
  const nextBottom = changesTop ? bottom : Math.max(rect.top + MIN_CROP_SIZE, Math.min(100, bottom + deltaY))
  return { left: nextLeft, top: nextTop, width: nextRight - nextLeft, height: nextBottom - nextTop }
}

function CropFrame({ rect, onChange }: { rect: CropRect; onChange: (rect: CropRect) => void }) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{ handle: CropHandle; pointerId: number; clientX: number; clientY: number; rect: CropRect; bounds: DOMRect } | null>(null)
  const updateFromPointer = React.useCallback((clientX: number, clientY: number) => {
    const drag = dragRef.current
    if (!drag || !drag.bounds.width || !drag.bounds.height) return
    const deltaX = ((clientX - drag.clientX) / drag.bounds.width) * 100
    const deltaY = ((clientY - drag.clientY) / drag.bounds.height) * 100
    onChange(resizeCropRect(drag.rect, drag.handle, deltaX, deltaY))
  }, [onChange])
  const startResize = (event: React.PointerEvent<HTMLButtonElement>, handle: CropHandle) => {
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds) return
    event.preventDefault()
    event.stopPropagation()
    frameRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { handle, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, rect, bounds }
  }
  const endResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if (frameRef.current?.hasPointerCapture(event.pointerId)) frameRef.current.releasePointerCapture(event.pointerId)
    dragRef.current = null
  }
  const nudgeHandle = (event: React.KeyboardEvent<HTMLButtonElement>, handle: CropHandle) => {
    const step = event.shiftKey ? 5 : 1
    const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
    const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
    if (!deltaX && !deltaY) return
    event.preventDefault()
    onChange(resizeCropRect(rect, handle, deltaX, deltaY))
  }
  const handles: { id: CropHandle; label: string; className: string }[] = [
    { id: 'top-left', label: 'Resize crop from top left', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
    { id: 'top-right', label: 'Resize crop from top right', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { id: 'bottom-left', label: 'Resize crop from bottom left', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
    { id: 'bottom-right', label: 'Resize crop from bottom right', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
  ]
  return <div ref={frameRef} className="pointer-events-none absolute inset-0 z-20 touch-none" onPointerMove={(event) => updateFromPointer(event.clientX, event.clientY)} onPointerUp={endResize} onPointerCancel={endResize}>
    <div className="pointer-events-none absolute border-2 border-[#b4fb60] shadow-[0_0_0_1px_rgba(0,0,0,0.82),0_0_18px_rgba(180,251,96,0.28)]" style={{ left: rect.left + '%', top: rect.top + '%', width: rect.width + '%', height: rect.height + '%' }}>
      {handles.map(({ id, label, className }) => <button key={id} type="button" aria-label={label} title={label + '. Drag or use arrow keys.'} onPointerDown={(event) => startResize(event, id)} onKeyDown={(event) => nudgeHandle(event, id)} className={'pointer-events-auto absolute grid size-5 place-items-center rounded-full border-2 border-[#b4fb60] bg-[#111]/95 shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ' + className}><span className="size-1.5 rounded-full bg-[#b4fb60]" /></button>)}
    </div>
  </div>
}

function ToolPanel({ activeTool, treatment, captionsVisible, cropEnabled, fitMode, onTreatment, onToggleCaptions, onToggleCrop, onToggleFit, onPickSource }: { activeTool: MotionToolId; treatment: PreviewTreatment; captionsVisible: boolean; cropEnabled: boolean; fitMode: 'fill' | 'fit'; onTreatment: (value: PreviewTreatment) => void; onToggleCaptions: () => void; onToggleCrop: () => void; onToggleFit: () => void; onPickSource: () => void }) {
  const content = activeTool === 'enhance' ? <div className="flex flex-wrap gap-1.5">{TREATMENTS.map((item) => <button key={item.id} type="button" onClick={() => onTreatment(item.id)} className={cn('inline-flex min-h-8 items-center gap-1.5 rounded border px-2 text-[11px] transition-colors', treatment === item.id ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#c9ff7d]' : 'border-white/10 text-white/56 hover:text-white')}>{treatment === item.id ? <Check className="size-3" /> : null}{item.label}</button>)}</div> : activeTool === 'captions' ? <button type="button" onClick={onToggleCaptions} className={cn('inline-flex min-h-8 items-center gap-2 rounded border px-2.5 text-[11px] transition-colors', captionsVisible ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#c9ff7d]' : 'border-white/10 text-white/56 hover:text-white')}><Captions className="size-3.5" /> {captionsVisible ? 'Captions on' : 'Show captions'}</button> : activeTool === 'media' ? <button type="button" onClick={onPickSource} className="inline-flex min-h-8 items-center gap-2 rounded border border-white/10 px-2.5 text-[11px] text-white/64 transition-colors hover:text-white"><Upload className="size-3.5" /> Replace source media</button> : <div className="flex flex-wrap gap-1.5"><button type="button" onClick={onToggleFit} className="inline-flex min-h-8 items-center gap-2 rounded border border-white/10 px-2.5 text-[11px] text-white/64 transition-colors hover:text-white"><Maximize2 className="size-3.5" /> {fitMode === 'fill' ? 'Fill frame' : 'Fit frame'}</button><button type="button" onClick={onToggleCrop} className={cn('inline-flex min-h-8 items-center gap-2 rounded border px-2.5 text-[11px] transition-colors', cropEnabled ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#c9ff7d]' : 'border-white/10 text-white/56 hover:text-white')}><Crop className="size-3.5" /> {cropEnabled ? 'Crop guides on' : 'Crop guides off'}</button></div>
  return <div className="mt-2 border-t border-white/8 pt-2">{content}</div>
}

function TimelineTracks({ zoom, effectiveDuration, sourceLabel, transcriptSegments, captionsVisible, currentTime, textPlacements }: { zoom: number; effectiveDuration: number; sourceLabel: string; transcriptSegments: MotionTranscriptSegment[]; captionsVisible: boolean; currentTime: number; textPlacements?: MotionTextPlacement[] }) {
  const width = `${zoom * 100}%`
  const activeSegment = transcriptSegments.find((segment) => isActiveSegment(segment, currentTime))
  const resolvedTextPlacements = textPlacements ?? transcriptSegments.slice(0, 3).map((segment, index) => ({
    id: `text-${segment.id}`,
    start: segment.start,
    end: segment.end,
    text: segment.text.split(' ').slice(0, 4).join(' '),
    region: index === 1 ? 'bottom' : index === 2 ? 'top' : 'center',
  } as MotionTextPlacement))
  return <><div className="relative h-5 border-b border-white/10" style={{ width, minWidth: '100%' }}>{Array.from({ length: 8 }).map((_, index) => <span key={index} className="absolute top-0 h-2 border-l border-white/28 text-[10px] text-white/42" style={{ left: `${(index / 7) * 100}%` }}><span className="absolute left-1 top-2 whitespace-nowrap">{formatTime((effectiveDuration * index) / 7).slice(0, 5)}</span></span>)}</div><div className="relative mt-2 h-11 overflow-hidden rounded border border-white/14 bg-[linear-gradient(120deg,#6b4332_0%,#d99768_13%,#5c3427_21%,#d89b71_34%,#273d48_53%,#bd825d_68%,#5b3728_82%,#d99c6d_100%)]" style={{ width, minWidth: '100%' }}><div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_36px,rgba(0,0,0,.46)_37px,transparent_39px)]" />{activeSegment ? <div className="absolute inset-y-0 border-x border-white/30 bg-white/[0.07]" style={{ left: `${(activeSegment.start / effectiveDuration) * 100}%`, width: `${Math.max(1.5, ((activeSegment.end - activeSegment.start) / effectiveDuration) * 100)}%` }} /> : null}<span className="absolute bottom-1 left-2 max-w-[calc(100%-1rem)] truncate rounded bg-black/62 px-1.5 py-0.5 text-[9px] text-white/82">{sourceLabel}</span></div><div className="relative mt-2 h-8 overflow-hidden rounded bg-white/[0.08]" style={{ width, minWidth: '100%' }}><div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,transparent_0%,rgba(255,255,255,.7)_1%,transparent_2%,transparent_5%,rgba(255,255,255,.4)_6%,transparent_8%)] [background-size:42px_100%]" />{transcriptSegments.length > 0 ? transcriptSegments.map((segment, index) => { const centerPct = (((segment.start + segment.end) / 2) / effectiveDuration) * 100; const energy = 30 + ((segment.text.length + index * 3) % 7) * 8; return <span key={segment.id} className={cn('absolute bottom-1 w-[3px] -translate-x-1/2 rounded-full transition-colors duration-150', isActiveSegment(segment, currentTime) ? 'bg-[#b4fb60] shadow-[0_0_8px_rgba(180,251,96,.6)]' : 'bg-white/42')} style={{ left: `${centerPct}%`, height: `${energy}%` }} /> }) : null}</div>{captionsVisible ? <div className="relative mt-2 h-7 overflow-hidden" style={{ width, minWidth: '100%' }}>{transcriptSegments.map((segment) => <span key={segment.id} className={cn('absolute top-1 truncate rounded px-1.5 py-1 text-[9px] transition-colors', isActiveSegment(segment, currentTime) ? 'bg-[#98f237]/38 text-white' : 'bg-[#98f237]/18 text-white/72')} style={{ left: `${(segment.start / effectiveDuration) * 100}%`, width: `${Math.max(8, ((segment.end - segment.start) / effectiveDuration) * 100)}%` }}>{segment.text.split(' ').slice(0, 3).join(' ')}</span>)}</div> : null}<div className="relative mt-2 h-7 overflow-hidden rounded bg-white/[0.035]" style={{ width, minWidth: '100%' }}>{resolvedTextPlacements.map((placement) => <button type="button" key={placement.id} className="absolute top-1 truncate rounded border border-dashed border-[#98f237]/40 bg-[#98f237]/8 px-1.5 py-1 text-left text-[9px] text-white/70 transition-colors hover:border-[#98f237] hover:bg-[#98f237]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98f237]/60" style={{ left: `${(placement.start / effectiveDuration) * 100}%`, width: `${Math.max(10, ((placement.end - placement.start) / effectiveDuration) * 100)}%` }} title={`Text placement (${placement.region ?? 'center'}) from ${formatTime(placement.start)}`}>{placement.text}</button>)}</div></>
}
