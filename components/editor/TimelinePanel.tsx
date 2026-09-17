'use client'

import * as React from 'react'
import { Pause, Play, Volume2, VolumeX, Layers, Scissors, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Project, HeaderNavMode, PreviewMediaKind, BottomMode } from '@/lib/types'

export interface TimelinePanelProps {
  activeWorkspaceTab: HeaderNavMode
  previewKind: PreviewMediaKind
  previewUrl: string
  previewPlaying: boolean
  transportCurrentTime: string
  transportTime: string
  transportProgress: number
  isPreviewMuted: boolean
  project: Project | null
  bottomMode: BottomMode
  onTogglePlayback: () => void
  onSeek: (value: number) => void
  onToggleMute: () => void
  onSetBottomMode: (mode: BottomMode) => void
  /** Frame-accurate seek target in seconds (bypasses 0-100 quantization). */
  onSeekSeconds?: (timeSec: number) => void
  /** Split clip at playhead or specified timestamp */
  onSplit?: (timeSec?: number) => void
  /** Total preview duration in seconds; enables frame stepping + preview filmstrip. */
  durationSec?: number
}

const FRAME_STEP_SEC = 1 / 30
const THUMB_WIDTH = 160
const THUMB_HEIGHT = 90

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  const frames = Math.floor((safe % 1) * 30)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}

export function TimelinePanel({
  activeWorkspaceTab,
  previewKind,
  previewUrl,
  previewPlaying,
  transportCurrentTime,
  transportTime,
  transportProgress,
  isPreviewMuted,
  onTogglePlayback,
  onSeek,
  onToggleMute,
  onSeekSeconds,
  onSplit,
  durationSec = 0,
}: TimelinePanelProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const wasMutedBeforeScrubRef = React.useRef<boolean | null>(null)

  const [isDragging, setIsDragging] = React.useState(false)
  const [dragFraction, setDragFraction] = React.useState<number | null>(null)
  const [hoverFraction, setHoverFraction] = React.useState<number | null>(null)
  const [thumbTime, setThumbTime] = React.useState<number | null>(null)

  const scrubberDisabled = previewKind !== 'video' || !previewUrl || durationSec <= 0
  const progressFraction = clamp01(transportProgress / 100)
  const displayFraction = isDragging && dragFraction !== null ? clamp01(dragFraction) : progressFraction

  const emitSeek = React.useCallback(
    (targetSec: number) => {
      const clamped = Math.min(Math.max(0, targetSec), durationSec > 0 ? durationSec : targetSec)
      setDragFraction(durationSec > 0 ? clamped / durationSec : null)
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        if (onSeekSeconds) onSeekSeconds(clamped)
        else onSeek(durationSec > 0 ? (clamped / durationSec) * 100 : 0)
      })
    },
    [durationSec, onSeek, onSeekSeconds],
  )

  const fractionFromEvent = React.useCallback((clientX: number): number => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return clamp01((clientX - rect.left) / rect.width)
  }, [])

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (scrubberDisabled) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDragging(true)
      if (!isPreviewMuted) {
        wasMutedBeforeScrubRef.current = false
        onToggleMute()
      }
      const fraction = fractionFromEvent(event.clientX)
      setHoverFraction(fraction)
      emitSeek(fraction * durationSec)
    },
    [durationSec, emitSeek, fractionFromEvent, isPreviewMuted, onToggleMute, scrubberDisabled],
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (scrubberDisabled) return
      const fraction = fractionFromEvent(event.clientX)
      if (isDragging) {
        setHoverFraction(fraction)
        emitSeek(fraction * durationSec)
      }
    },
    [durationSec, emitSeek, fractionFromEvent, isDragging, scrubberDisabled],
  )

  const endScrub = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      setIsDragging(false)
      if (wasMutedBeforeScrubRef.current === false) {
        wasMutedBeforeScrubRef.current = null
        onToggleMute()
      }
      const fraction = fractionFromEvent(event.clientX)
      emitSeek(fraction * durationSec)
    },
    [durationSec, emitSeek, fractionFromEvent, isDragging, onToggleMute],
  )

  const handlePointerLeave = React.useCallback(() => {
    if (!isDragging) setHoverFraction(null)
  }, [isDragging])

  const stepFrame = React.useCallback(
    (direction: 1 | -1, coarse: boolean) => {
      if (scrubberDisabled) return
      const step = coarse ? 1 : FRAME_STEP_SEC
      const current = displayFraction * durationSec
      emitSeek(current + direction * step)
    },
    [displayFraction, durationSec, emitSeek, scrubberDisabled],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (scrubberDisabled) return
      const coarse = event.shiftKey
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          stepFrame(-1, coarse)
          break
        case 'ArrowRight':
          event.preventDefault()
          stepFrame(1, coarse)
          break
        case 'Home':
          event.preventDefault()
          emitSeek(0)
          break
        case 'End':
          event.preventDefault()
          emitSeek(durationSec)
          break
      }
    },
    [durationSec, emitSeek, scrubberDisabled, stepFrame],
  )

  React.useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const hoverTime = hoverFraction !== null && durationSec > 0 ? hoverFraction * durationSec : null

  React.useEffect(() => {
    if (hoverTime === null) return
    const timeout = window.setTimeout(() => setThumbTime(hoverTime), 40)
    return () => window.clearTimeout(timeout)
  }, [hoverTime])

  const thumbnailVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const thumbCanvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const video = thumbnailVideoRef.current
    const canvas = thumbCanvasRef.current
    if (!video || !canvas || thumbTime === null) return
    let cancelled = false
    const draw = () => {
      if (cancelled) return
      const ctx = canvas.getContext('2d')
      if (!ctx || video.videoWidth === 0) return
      ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
    }
    if (Math.abs(video.currentTime - thumbTime) < 0.033 && video.readyState >= 2) {
      draw()
      return
    }
    video.addEventListener('seeked', draw, { once: true })
    video.currentTime = thumbTime
    return () => {
      cancelled = true
      video.removeEventListener('seeked', draw)
    }
  }, [thumbTime])

  if (activeWorkspaceTab === 'Music') return null

  return (
    <div className="w-full max-w-[min(100%,64rem)] self-center px-4">
      <div className="glass-panel flex flex-col gap-4 bg-abyss/40 p-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlayback}
              disabled={previewKind !== 'video' || !previewUrl}
              data-action="toggle-playback"
              data-autonomous-target="playback"
              aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}
              title={previewPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-white/60 transition-all hover:border-white/20 hover:text-white disabled:opacity-20"
            >
              {previewPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current ml-0.5" />}
            </button>

            <div className="flex flex-col min-w-[100px]">
              <span className="font-mono text-xs font-medium tabular-nums text-white">
                {transportCurrentTime}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-chrome-dim">
                {transportTime}
              </span>
            </div>
          </div>

          <div className="relative flex-1">
            <div
              ref={trackRef}
              role="slider"
              tabIndex={scrubberDisabled ? -1 : 0}
              data-action="seek-scrubber"
              data-autonomous-target="timeline-scrubber"
              aria-label="Timeline scrubber"
              aria-valuemin={0}
              aria-valuemax={Math.round(durationSec * 1000)}
              aria-valuenow={Math.round(displayFraction * durationSec * 1000)}
              aria-valuetext={formatTimecode(displayFraction * durationSec)}
              aria-disabled={scrubberDisabled}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
              onPointerLeave={handlePointerLeave}
              onKeyDown={handleKeyDown}
              className={`group relative h-12 w-full touch-none select-none rounded-lg transition-opacity ${
                scrubberDisabled ? 'pointer-events-none opacity-20' : 'cursor-pointer opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60'
              }`}
            >
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-accent-cyan/70 to-accent-cyan ${isDragging ? 'transition-none' : 'transition-[width] duration-75'}`}
                  style={{ width: `${displayFraction * 100}%` }}
                />
              </div>

              <div
                className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-cyan bg-abyss shadow-[0_0_12px_rgba(34,211,238,0.45)] ${isDragging ? 'scale-110' : 'scale-100 transition-transform duration-100'}`}
                style={{ left: `${displayFraction * 100}%` }}
              />

              {hoverFraction !== null && hoverTime !== null && (
                <div
                  className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 rounded-lg border border-white/10 bg-surface/95 p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
                  style={{ left: `${clamp01(hoverFraction) * 100}%` }}
                >
                  <canvas
                    ref={thumbCanvasRef}
                    width={THUMB_WIDTH}
                    height={THUMB_HEIGHT}
                    className="block h-[54px] w-[96px] rounded bg-black/60"
                  />
                  <div className="py-0.5 text-center font-mono text-[10px] tabular-nums text-white/80">
                    {formatTimecode(hoverTime)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepFrame(-1, false)}
              disabled={scrubberDisabled}
              aria-label="Step one frame back"
              title="Step back 1 frame (←)"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-20"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => stepFrame(1, false)}
              disabled={scrubberDisabled}
              aria-label="Step one frame forward"
              title="Step forward 1 frame (→)"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-20"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              data-action="toggle-mute"
              data-autonomous-target="mute"
              aria-label={isPreviewMuted ? 'Unmute preview' : 'Mute preview'}
              title={isPreviewMuted ? 'Unmute (M)' : 'Mute (M)'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            >
              {isPreviewMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <div className="mx-1 h-6 w-px bg-white/8" />
            <button className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white">
              <Layers className="size-4" />
            </button>
            <button
              data-action="split-cut"
              data-autonomous-target="split"
              aria-label="Split clip at playhead"
              title="Split clip at playhead (S)"
              onClick={() => {
                const targetTime = displayFraction * durationSec
                if (onSplit) {
                  onSplit(targetTime)
                } else if (onSeekSeconds) {
                  onSeekSeconds(targetTime)
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Scissors className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {previewKind === 'video' && previewUrl && (
        <video
          ref={thumbnailVideoRef}
          src={previewUrl}
          muted
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          aria-hidden="true"
          className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
        />
      )}
    </div>
  )
}
