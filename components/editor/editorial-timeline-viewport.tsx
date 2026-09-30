'use client'

import * as React from 'react'
import {
  Eye,
  EyeOff,
  Film,
  Music,
  Plus,
  Sparkles,
  Type,
} from 'lucide-react'

import { EditorialTimelineToolbar } from './editorial-timeline-toolbar'
import { EditorialTimelineTracks, type EditorialTimelineTracksProps } from './editorial-timeline-tracks'
import { cn } from '@/lib/utils'

export interface EditorialTimelineViewportProps extends EditorialTimelineTracksProps {
  playing: boolean
  onTogglePlayback?: () => void
  onZoomChange?: (zoom: number) => void
  showToolbar?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  onToggleLayout?: () => void
  onUndo?: () => void
  onRedo?: () => void
}

export function EditorialTimelineViewport({
  playing,
  onTogglePlayback,
  onZoomChange,
  showToolbar = true,
  isFullscreen = false,
  onToggleFullscreen,
  onToggleLayout,
  onUndo,
  onRedo,
  ...props
}: EditorialTimelineViewportProps) {
  const scroller = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ id: number; x: number; scroll: number; moved: boolean } | null>(null)
  const playheadDrag = React.useRef<number | null>(null)
  const [viewportWidth, setViewportWidth] = React.useState(800)
  const [activeTool, setActiveTool] = React.useState<'select' | 'razor'>('select')
  const [snapping, setSnapping] = React.useState(true)

  // Track lock and visibility states
  const [isVideoHidden, setIsVideoHidden] = React.useState(false)
  const [isCaptionsHidden, setIsCaptionsHidden] = React.useState(false)
  const [isMusicHidden, setIsMusicHidden] = React.useState(false)

  // Selected clip state
  const [selectedClipId, setSelectedClipId] = React.useState<string | null>('source-video')

  const contentWidth = Math.max(1, viewportWidth - 110) * Math.max(1, props.zoom)
  const time = Math.max(0, Math.min(props.effectiveDuration, props.currentTime))

  React.useEffect(() => {
    const element = scroller.current
    if (!element) return
    const observer = new ResizeObserver(() => setViewportWidth(element.clientWidth))
    observer.observe(element)
    setViewportWidth(element.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Auto-scroll when playing
  React.useEffect(() => {
    const element = scroller.current
    if (!element || !playing || drag.current || playheadDrag.current !== null) return
    const position = 110 + (time / props.effectiveDuration) * (contentWidth - 12)
    if (position > element.scrollLeft + element.clientWidth - 32 || position < element.scrollLeft + 110) {
      element.scrollLeft = Math.max(0, position - 110 - (element.clientWidth - 110) * 0.2)
    }
  }, [time, contentWidth, props.effectiveDuration, playing])

  // Handle Split Clip (Razor tool)
  const handleSplitClip = React.useCallback(() => {
    if (props.onSplitClip) {
      props.onSplitClip()
    }
  }, [props])

  // Handle Delete Clip
  const handleDeleteClip = React.useCallback(() => {
    if (props.onDeleteClip) {
      props.onDeleteClip()
    }
  }, [props])

  // Handle Duplicate Clip
  const handleDuplicateClip = React.useCallback(() => {
    if (props.onDuplicateClip) {
      props.onDuplicateClip()
    }
  }, [props])

  const handleSeekInternal = React.useCallback(
    (timeSec: number) => {
      let target = Math.max(0, Math.min(props.effectiveDuration, timeSec))
      // Magnetic snapping to 1-second ticks when snapping enabled
      if (snapping) {
        const rounded = Math.round(target)
        if (Math.abs(target - rounded) < 0.25) target = rounded
      }
      props.onSeek?.(target)
    },
    [props, snapping],
  )

  const seekPlayheadFromPointer = React.useCallback((clientX: number) => {
    const tracks = scroller.current?.querySelector<HTMLElement>('[data-editorial-timeline-tracks]')
    const bounds = tracks?.getBoundingClientRect()
    if (!bounds?.width) return
    const fraction = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width))
    handleSeekInternal(fraction * props.effectiveDuration)
  }, [handleSeekInternal, props.effectiveDuration])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#090d14]">
      {/* 1. NLE Top Toolbar matching 9103 Reference */}
      {showToolbar && (
        <EditorialTimelineToolbar
          currentTimeSec={props.currentTime}
          effectiveDuration={props.effectiveDuration}
          zoom={props.zoom}
          onZoomChange={(newZoom) => onZoomChange?.(newZoom)}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onSplitClip={handleSplitClip}
          onUndo={onUndo}
          onRedo={onRedo}
          onDeleteClip={handleDeleteClip}
          onDuplicateClip={handleDuplicateClip}
          onToggleSnapping={() => setSnapping((v) => !v)}
          snapping={snapping}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          onToggleLayout={onToggleLayout}
          playing={playing}
          onTogglePlayback={onTogglePlayback}
        />
      )}

      {/* 2. Track Workspace (Sticky Track Headers on Left + Scrubbable Tracks on Right) */}
      <div
        ref={scroller}
        data-editorial-timeline-viewport
        className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-color:rgba(255,255,255,.24)_transparent] [scrollbar-width:thin]"
      >
        <div
          className="grid min-h-full grid-cols-[110px_minmax(0,1fr)]"
          style={{ width: contentWidth + 110 }}
        >
          {/* Left Sticky Column: Track Headers with visibility controls */}
          <div className="sticky left-0 z-20 flex flex-col border-r border-white/10 bg-[#0c1018] pt-[22px] text-[10px] text-white/70 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
            {/* Video Track Header */}
            <div
              className="flex h-[50px] items-center justify-between border-b border-white/[0.04] px-2.5 transition-colors hover:bg-white/[0.02]"
              style={{ marginTop: 6 }}
            >
              <div className="flex items-center gap-1.5 font-medium text-white/85">
                <Film className="size-3 text-white/50" />
                <span>Video</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsVideoHidden((v) => !v)}
                  aria-label={isVideoHidden ? 'Show video track' : 'Hide video track'}
                  title={isVideoHidden ? 'Show video track' : 'Hide video track'}
                  className={cn(
                    'grid size-5 place-items-center rounded hover:bg-white/10 transition-colors',
                    isVideoHidden ? 'text-white/30' : 'text-white/60 hover:text-white',
                  )}
                >
                  {isVideoHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
              </div>
            </div>

            {/* Captions Track Header */}
            <div
              className="flex h-[32px] items-center justify-between border-b border-white/[0.04] px-2.5 transition-colors hover:bg-white/[0.02]"
              style={{ marginTop: 6 }}
            >
              <div className="flex items-center gap-1.5 font-medium text-white/85">
                <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-bold text-white/70">
                  CC
                </span>
                <span>Captions</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCaptionsHidden((v) => !v)}
                  aria-label={isCaptionsHidden ? 'Show captions' : 'Hide captions'}
                  title={isCaptionsHidden ? 'Show captions' : 'Hide captions'}
                  className={cn(
                    'grid size-5 place-items-center rounded hover:bg-white/10 transition-colors',
                    isCaptionsHidden ? 'text-white/30' : 'text-white/60 hover:text-white',
                  )}
                >
                  {isCaptionsHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
              </div>
            </div>

            {/* Text Placement Track Header */}
            <div className="flex h-[30px] items-center justify-between border-b border-white/[0.04] px-2.5 transition-colors hover:bg-white/[0.02]" style={{ marginTop: 6 }}>
              <div className="flex items-center gap-1.5 font-medium text-white/85"><Type className="size-3 text-[#9df65a]" /><span>Text</span></div>
            </div>

            {props.editorialCues?.some((cue) => cue.type !== 'text') ? <div className="flex h-[30px] items-center justify-between border-b border-white/[0.04] px-2.5 transition-colors hover:bg-white/[0.02]" style={{ marginTop: 6 }}>
              <div className="flex items-center gap-1.5 font-medium text-white/85"><Sparkles className="size-3 text-sky-300" /><span>Effects &amp; cues</span></div>
            </div> : null}

            {/* Music Track Header */}
            <div
              className="flex h-[42px] items-center justify-between border-b border-white/[0.04] px-2.5 transition-colors hover:bg-white/[0.02]"
              style={{ marginTop: 6 }}
            >
              <div className="flex items-center gap-1.5 font-medium text-white/85">
                <Music className="size-3 text-[#c084fc]" />
                <span>Music</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMusicHidden((v) => !v)}
                  aria-label={isMusicHidden ? 'Show music track' : 'Hide music track'}
                  title={isMusicHidden ? 'Show music track' : 'Hide music track'}
                  className={cn(
                    'grid size-5 place-items-center rounded hover:bg-white/10 transition-colors',
                    isMusicHidden ? 'text-white/30' : 'text-white/60 hover:text-white',
                  )}
                >
                  {isMusicHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
              </div>
            </div>

            {/* + Add Track Button */}
            <div className="pt-2 px-2">
              <button
                type="button"
                onClick={props.onOpenMusicCatalog}
                aria-label="Add track"
                className="flex w-full items-center gap-1.5 rounded border border-white/10 bg-white/[0.02] px-2 py-1 text-[9px] font-medium text-white/50 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <Plus className="size-2.5" />
                <span>Add track</span>
              </button>
            </div>
          </div>

          {/* Right Column: Track Area & Scrubbable Playhead */}
          <div
            className="relative min-w-0 select-none pb-2 pr-4 outline-none"
            role="region"
            aria-label="Editorial tracks. Click to seek, drag to scroll, or use arrow keys."
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? props.effectiveDuration
                    : event.key === 'ArrowLeft'
                      ? time - (event.shiftKey ? 5 : 1)
                      : event.key === 'ArrowRight'
                        ? time + (event.shiftKey ? 5 : 1)
                        : null
              if (next === null) return
              event.preventDefault()
              handleSeekInternal(next)
            }}
            onPointerDown={(event) => {
              if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button, input'))) return
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = {
                id: event.pointerId,
                x: event.clientX,
                scroll: scroller.current?.scrollLeft ?? 0,
                moved: false,
              }
            }}
            onPointerMove={(event) => {
              const gesture = drag.current
              if (!gesture || gesture.id !== event.pointerId || !scroller.current) return
              const delta = event.clientX - gesture.x
              if (Math.abs(delta) > 4) gesture.moved = true
              scroller.current.scrollLeft = gesture.scroll - delta
            }}
            onPointerUp={(event) => {
              const gesture = drag.current
              if (!gesture || gesture.id !== event.pointerId) return
              if (!gesture.moved) {
                const bounds = event.currentTarget.getBoundingClientRect()
                const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / (bounds.width - 12)))
                handleSeekInternal(fraction * props.effectiveDuration)
              }
              drag.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
          >
            <EditorialTimelineTracks
              {...props}
              zoom={1}
              selectedClipId={selectedClipId}
              onSelectClip={setSelectedClipId}
              isVideoHidden={isVideoHidden}
              isMusicHidden={isMusicHidden}
            />

            {/* Playhead matching 9103 Reference: White vertical hairline with white teardrop / flag pin */}
            <div
              data-editorial-playhead
              role="slider"
              aria-label="Timeline playhead"
              aria-valuemin={0}
              aria-valuemax={props.effectiveDuration}
              aria-valuenow={time}
              tabIndex={0}
              data-editorial-playhead-hit-area
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                playheadDrag.current = event.pointerId
                event.currentTarget.setPointerCapture(event.pointerId)
                seekPlayheadFromPointer(event.clientX)
              }}
              onPointerMove={(event) => {
                if (playheadDrag.current !== event.pointerId) return
                event.stopPropagation()
                seekPlayheadFromPointer(event.clientX)
              }}
              onPointerUp={(event) => {
                if (playheadDrag.current !== event.pointerId) return
                event.stopPropagation()
                playheadDrag.current = null
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
              }}
              onPointerCancel={() => { playheadDrag.current = null }}
              onKeyDown={(event) => {
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? props.effectiveDuration : event.key === 'ArrowLeft' ? time - (event.shiftKey ? 5 : 1) : event.key === 'ArrowRight' ? time + (event.shiftKey ? 5 : 1) : null
                if (next === null) return
                event.preventDefault()
                event.stopPropagation()
                handleSeekInternal(next)
              }}
              className="absolute bottom-0 top-0 z-30 w-6 -translate-x-1/2 cursor-ew-resize touch-none outline-none before:absolute before:inset-y-0 before:left-1/2 before:border-l-[1.5px] before:border-white before:shadow-[0_0_8px_rgba(255,255,255,0.7)] before:content-[''] focus-visible:bg-white/[0.04]"
              style={{
                left: (time / Math.max(props.effectiveDuration, 0.01)) * (contentWidth - 12),
              }}
            >
              {/* White flag pin marker with rounded top */}
              <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-[2px] bg-white shadow-md rotate-45" />
                <div className="-mt-1 h-1.5 w-1 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
