'use client'

import * as React from 'react'
import {
  Captions,
  Crop,
  Download,
  Filter,
  Frame,
  Grid2X2,
  Maximize2,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type PreviewMediaKind = 'video' | 'image'

export type MotionTranscriptSegment = {
  id: string
  start: number
  end: number
  text: string
  emphasis?: string[]
}

export interface MotionEditWorkspaceProps {
  projectTitle: string
  previewUrl: string
  previewKind: PreviewMediaKind
  hasPreviewMedia: boolean
  sourceLabel?: string | null
  objectFit: 'cover' | 'contain'
  mediaTransformStyle?: React.CSSProperties
  currentTimeLabel: string
  durationLabel: string
  currentTimeSec: number
  durationSec: number
  previewPlaying: boolean
  previewMuted: boolean
  videoRef: React.Ref<HTMLVideoElement>
  transcriptSegments?: MotionTranscriptSegment[]
  onTogglePlayback: () => void
  onPickSource: () => void
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

  return (
    <span>
      {words.map((word, index) => {
        const normalized = word.trim().replace(/[.,!?]/g, '').toLowerCase()
        const emphasized = emphasis.some((item) => item.toLowerCase().includes(normalized) && normalized.length > 2)
        return (
          <span key={`${word}-${index}`} className={cn(emphasized && active ? 'text-[#98f237]' : active ? 'text-white' : 'text-white/52')}>
            {word}
          </span>
        )
      })}
    </span>
  )
}

export function MotionEditWorkspace({
  projectTitle,
  previewUrl,
  previewKind,
  hasPreviewMedia,
  sourceLabel,
  objectFit,
  mediaTransformStyle,
  currentTimeLabel,
  durationLabel,
  currentTimeSec,
  durationSec,
  previewPlaying,
  previewMuted,
  videoRef,
  transcriptSegments = DEFAULT_TRANSCRIPT,
  onTogglePlayback,
  onPickSource,
  onSeek,
  onVideoLoadedMetadata,
  onVideoLoadedData,
  onVideoCanPlay,
  onVideoTimeUpdate,
  onVideoEnded,
  onVideoPlay,
  onVideoPause,
  onVideoError,
  onImageLoaded,
  onApplyPrompt,
}: MotionEditWorkspaceProps) {
  const [activeTool, setActiveTool] = React.useState<(typeof TOOLS)[number]['id']>('layout')
  const [zoom, setZoom] = React.useState(1)
  const [showTimeline, setShowTimeline] = React.useState(true)
  const [isMuted, setIsMuted] = React.useState(previewMuted)
  const [fit, setFit] = React.useState<'fill' | 'fit'>('fill')
  const [cropEnabled, setCropEnabled] = React.useState(true)
  const selectionStart = 0
  const selectionEnd = 0.28
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const timelineRef = React.useRef<HTMLDivElement>(null)

  const effectiveDuration = durationSec > 0 ? durationSec : Math.max(60, ...transcriptSegments.map((segment) => segment.end))
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeSec / effectiveDuration) * 100))
  const activeSegment = transcriptSegments.find((segment) => isActiveSegment(segment, currentTimeSec))

  React.useEffect(() => {
    const root = transcriptRef.current
    const activeElement = root?.querySelector<HTMLElement>('[data-active-transcript="true"]')
    activeElement?.scrollIntoView({ block: 'center', behavior: previewPlaying ? 'smooth' : 'auto' })
  }, [activeSegment?.id, previewPlaying])

  React.useEffect(() => setIsMuted(previewMuted), [previewMuted])

  const seekFromPointer = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const percentage = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    onSeek(percentage * effectiveDuration)
  }, [effectiveDuration, onSeek])

  const addMotionMarker = React.useCallback(() => {
    const prompt = `Add a motion marker at ${formatTime(currentTimeSec)} in ${projectTitle}.`
    onApplyPrompt?.(prompt)
  }, [currentTimeSec, onApplyPrompt, projectTitle])

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#060708] text-white" aria-label="Motion editing workspace">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[32%] min-w-[280px] max-w-[460px] flex-col border-r border-white/10 xl:flex">
          <div className="flex h-14 shrink-0 items-center gap-4 border-b border-white/8 px-5">
            <span className="text-sm font-medium">Transcript</span>
            <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/46">Live</span>
            <button type="button" className="ml-auto text-white/58 transition-colors hover:text-white" aria-label="Search transcript">
              <Search className="size-4" />
            </button>
            <button type="button" className="text-white/58 transition-colors hover:text-white" aria-label="Filter transcript">
              <Filter className="size-4" />
            </button>
          </div>
          <div ref={transcriptRef} className="premium-scroll-hide min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <button
              type="button"
              onClick={() => onApplyPrompt?.('Clean up the selected speech in the current edit.')}
              className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/86 transition-colors hover:bg-white/[0.13]"
            >
              <Wand2 className="size-3.5" /> Speech cleanup
            </button>
            <div className="space-y-3.5 text-[17px] leading-8">
              {transcriptSegments.map((segment) => {
                const active = isActiveSegment(segment, currentTimeSec)
                return (
                  <button
                    key={segment.id}
                    type="button"
                    data-active-transcript={active}
                    onClick={() => onSeek(segment.start)}
                    className={cn('block w-full rounded-md px-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98f237]/55', active ? 'bg-white/[0.035]' : 'hover:bg-white/[0.025]')}
                  >
                    <HighlightedTranscript segment={segment} active={active} />
                    <span className={cn('ml-2 inline-flex translate-y-[-1px] rounded px-1.5 py-0.5 text-[10px] leading-none', active ? 'bg-[#98f237]/16 text-[#b4fb60]' : 'bg-white/[0.08] text-white/38')}>
                      {formatTime(segment.start).slice(0, 5)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 px-4 sm:px-6">
            <div className="flex items-center gap-3 text-xs text-white/62">
              <span className="hidden sm:inline">Motion edit</span>
              <span className="rounded border border-white/10 px-2 py-1 text-[11px]">16:9</span>
              <button type="button" onClick={() => setFit((value) => value === 'fill' ? 'fit' : 'fill')} className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
                <Maximize2 className="size-3.5" /> Layout: {fit === 'fill' ? 'Fill' : 'Fit'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={addMotionMarker} className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-white/72 transition-colors hover:bg-white/[0.1] hover:text-white" aria-label="Add motion marker">
                <Plus className="size-4" />
              </button>
              <button type="button" onClick={() => onApplyPrompt?.('Prepare the current motion edit for export.')} className="hidden items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/85 sm:inline-flex">
                <Download className="size-3.5" /> Export
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0a0b0d] p-4 sm:p-8">
            <div className="relative aspect-video max-h-full w-full max-w-[min(100%,880px)] overflow-hidden border border-white/18 bg-black shadow-[0_28px_80px_rgba(0,0,0,0.56)]">
              {hasPreviewMedia ? (
                previewKind === 'image' ? (
                  <img src={previewUrl} alt={projectTitle} onLoad={onImageLoaded} className="h-full w-full bg-black" style={{ ...mediaTransformStyle, objectFit: fit === 'fill' ? 'cover' : objectFit }} />
                ) : (
                  <video
                    key={previewUrl}
                    ref={videoRef}
                    src={previewUrl}
                    className="h-full w-full bg-black"
                    muted={isMuted}
                    playsInline
                    controls={false}
                    preload="auto"
                    onLoadedMetadata={onVideoLoadedMetadata}
                    onLoadedData={onVideoLoadedData}
                    onCanPlay={onVideoCanPlay}
                    onTimeUpdate={onVideoTimeUpdate}
                    onEnded={onVideoEnded}
                    onPlay={onVideoPlay}
                    onPause={onVideoPause}
                    onError={onVideoError}
                    style={{ ...mediaTransformStyle, objectFit: fit === 'fill' ? 'cover' : objectFit }}
                  />
                )
              ) : (
                <button type="button" onClick={onPickSource} className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(152,242,55,0.1),transparent_38%)] text-sm text-white/66 transition-colors hover:text-white">
                  <span className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-black/45 px-4 py-2.5"><Upload className="size-4" /> Choose source media</span>
                </button>
              )}
              <div className="absolute left-3 top-3 inline-flex max-w-[70%] items-center gap-2 rounded bg-black/60 px-2.5 py-1.5 text-[10px] text-white/72 backdrop-blur-sm">
                <Frame className="size-3 text-[#98f237]" /><span className="truncate">{sourceLabel ?? 'Source video'}</span>
              </div>
              {cropEnabled ? <div className="pointer-events-none absolute left-[19%] top-[11%] h-[76%] w-[62%] border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.65)]"><span className="absolute -left-1 -top-1 size-2.5 rounded-full border border-white bg-[#111]" /><span className="absolute -right-1 -top-1 size-2.5 rounded-full border border-white bg-[#111]" /><span className="absolute -bottom-1 -left-1 size-2.5 rounded-full border border-white bg-[#111]" /><span className="absolute -bottom-1 -right-1 size-2.5 rounded-full border border-white bg-[#111]" /></div> : null}
              <button type="button" onClick={onTogglePlayback} disabled={previewKind !== 'video' || !previewUrl} className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full border border-white/12 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/82 disabled:opacity-35" aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}>
                {previewPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
              </button>
            </div>
          </div>
        </main>

        <aside className="hidden w-[86px] shrink-0 border-l border-white/8 bg-[#090a0c] lg:flex lg:flex-col lg:items-center lg:gap-4 lg:pt-5">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTool(id)} className={cn('group flex w-full flex-col items-center gap-1.5 border-l-2 px-1 py-2 text-[10px] font-medium transition-colors', activeTool === id ? 'border-[#98f237] text-white' : 'border-transparent text-white/46 hover:text-white/82')}>
              <span className={cn('grid size-8 place-items-center rounded-md transition-colors', activeTool === id ? 'bg-[#98f237]/12 text-[#b4fb60]' : 'text-white/65 group-hover:bg-white/[0.06]')}><Icon className="size-4" /></span>{label}
            </button>
          ))}
          <div className="mt-auto mb-5 text-[9px] uppercase tracking-[0.14em] text-white/28">{activeTool}</div>
        </aside>
      </div>

      {showTimeline ? (
        <section className="h-[244px] shrink-0 border-t border-white/12 bg-[#070809] sm:h-[280px]" aria-label="Video timeline">
          <div className="flex h-12 items-center justify-between border-b border-white/8 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowTimeline(false)} className="text-xs font-medium text-white/86">Hide timeline</button>
              <button type="button" onClick={() => setCropEnabled((value) => !value)} className={cn('grid size-8 place-items-center rounded border transition-colors', cropEnabled ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#b4fb60]' : 'border-white/10 text-white/56 hover:text-white')} aria-label="Toggle crop frame"><Crop className="size-3.5" /></button>
              <button type="button" onClick={onTogglePlayback} disabled={previewKind !== 'video' || !previewUrl} className="grid size-8 place-items-center text-white/82 disabled:opacity-35" aria-label={previewPlaying ? 'Pause timeline' : 'Play timeline'}>{previewPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}</button>
              <button type="button" onClick={() => setIsMuted((value) => !value)} disabled={previewKind !== 'video' || !previewUrl} className={cn('grid size-8 place-items-center transition-colors disabled:opacity-35', isMuted ? 'text-white/42' : 'text-[#b4fb60]')} aria-label={isMuted ? 'Unmute preview' : 'Mute preview'}><Volume2 className="size-3.5" /></button>
              <span className="font-mono text-xs tabular-nums text-white/78">{currentTimeLabel} <span className="mx-1 text-white/28">/</span> {durationLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-white/52"><ZoomOut className="size-3.5" /><input aria-label="Timeline zoom" type="range" min="0.7" max="2.4" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-1 w-20 accent-[#98f237]" /><ZoomIn className="size-3.5" /></div>
          </div>
          <div className="flex min-h-0">
            <div className="hidden w-24 shrink-0 border-r border-white/8 pt-8 text-right text-[10px] text-white/40 sm:block"><div className="pr-3">Video</div><div className="mt-7 pr-3">Audio</div><div className="mt-6 pr-3">Captions</div></div>
            <div ref={timelineRef} onClick={seekFromPointer} className="relative min-w-0 flex-1 cursor-crosshair overflow-hidden px-3 pt-5" role="slider" aria-label="Seek motion timeline" aria-valuemin={0} aria-valuemax={effectiveDuration} aria-valuenow={currentTimeSec} tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTimeSec - 1)); if (event.key === 'ArrowRight') onSeek(Math.min(effectiveDuration, currentTimeSec + 1)) }}>
              <div className="relative h-5 border-b border-white/10" style={{ width: `${zoom * 100}%`, minWidth: '100%' }}>
                {Array.from({ length: 8 }).map((_, index) => <span key={index} className="absolute top-0 h-2 border-l border-white/28 text-[10px] text-white/42" style={{ left: `${(index / 7) * 100}%` }}><span className="absolute left-1 top-2 whitespace-nowrap">{formatTime((effectiveDuration * index) / 7).slice(0, 5)}</span></span>)}
              </div>
              <div className="relative mt-2 h-11 overflow-hidden rounded border border-white/14 bg-[linear-gradient(120deg,#6b4332_0%,#d99768_13%,#5c3427_21%,#d89b71_34%,#273d48_53%,#bd825d_68%,#5b3728_82%,#d99c6d_100%)]" style={{ width: `${zoom * 100}%`, minWidth: '100%' }}>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_36px,rgba(0,0,0,.46)_37px,transparent_39px)]" />
                <span className="absolute bottom-1 left-2 rounded bg-black/62 px-1.5 py-0.5 text-[9px] text-white/82">{sourceLabel ?? projectTitle}</span>
              </div>
              <div className="relative mt-2 h-8 overflow-hidden rounded bg-white/[0.08]" style={{ width: `${zoom * 100}%`, minWidth: '100%' }}><div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,transparent_0%,rgba(255,255,255,.7)_1%,transparent_2%,transparent_5%,rgba(255,255,255,.4)_6%,transparent_8%)] [background-size:42px_100%]" /></div>
              <div className="relative mt-2 h-7 overflow-hidden" style={{ width: `${zoom * 100}%`, minWidth: '100%' }}><div className="absolute inset-y-0 rounded bg-[#98f237]/18" style={{ left: `${selectionStart * 100}%`, width: `${(selectionEnd - selectionStart) * 100}%` }} />{transcriptSegments.map((segment) => <span key={segment.id} className="absolute top-1 truncate rounded bg-white/[0.09] px-1.5 py-1 text-[9px] text-white/64" style={{ left: `${(segment.start / effectiveDuration) * 100}%`, width: `${Math.max(8, ((segment.end - segment.start) / effectiveDuration) * 100)}%` }}>{segment.text.split(' ').slice(0, 3).join(' ')}</span>)}</div>
              <div className="pointer-events-none absolute bottom-0 top-0 z-10 border-l border-white shadow-[0_0_12px_rgba(255,255,255,.75)]" style={{ left: `calc(${playheadPercent}% + 0.75rem)` }}><span className="absolute -left-1.5 -top-1 size-3 rotate-45 bg-white" /></div>
            </div>
          </div>
        </section>
      ) : <button type="button" onClick={() => setShowTimeline(true)} className="h-9 shrink-0 border-t border-white/10 bg-[#070809] text-xs text-white/58 hover:text-white">Show timeline</button>}
    </section>
  )
}
