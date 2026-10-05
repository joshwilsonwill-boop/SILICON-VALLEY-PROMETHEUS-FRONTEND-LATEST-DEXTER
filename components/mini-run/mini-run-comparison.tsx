'use client'

import * as React from 'react'
import { ArrowUpRight, CheckCircle2, Clock3, Download, Film, Play, ScanEye } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ComparisonClip = {
  id: string
  label: string
  outputUrl: string
  sourceStartMs?: number
  sourceEndMs?: number
  hook?: string
  score?: number
}

type Dimensions = { width: number; height: number }

type Props = {
  sourceUrl: string | null
  sourceTitle: string
  sourceDimensions?: Dimensions | null
  sourceDurationMs?: number | null
  clips: ComparisonClip[]
  selectedClipId: string
  onSelectClip: (id: string) => void
  onOutputDuration?: (seconds: number | null) => void
}

function time(milliseconds?: number | null) {
  if (milliseconds == null || !Number.isFinite(milliseconds)) return '—'
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function aspectLabel(dimensions?: Dimensions | null) {
  if (!dimensions?.width || !dimensions.height) return 'Detecting format'
  const ratio = dimensions.width / dimensions.height
  if (ratio > 1.1) return 'Landscape source'
  if (ratio < 0.9) return 'Portrait source'
  return 'Square source'
}

export function MiniRunComparison({
  sourceUrl,
  sourceTitle,
  sourceDimensions,
  sourceDurationMs,
  clips,
  selectedClipId,
  onSelectClip,
  onOutputDuration,
}: Props) {
  const sourceRef = React.useRef<HTMLVideoElement>(null)
  const [measuredSource, setMeasuredSource] = React.useState<Dimensions | null>(null)
  const [measuredOutput, setMeasuredOutput] = React.useState<Dimensions | null>(null)
  const selected = clips.find((clip) => clip.id === selectedClipId) ?? clips[0]
  const dimensions = measuredSource ?? sourceDimensions

  React.useEffect(() => {
    setMeasuredSource(null)
  }, [sourceUrl])

  React.useEffect(() => {
    setMeasuredOutput(null)
  }, [selected?.outputUrl])

  const seekToSource = React.useCallback(() => {
    const video = sourceRef.current
    if (!video || selected?.sourceStartMs == null || !Number.isFinite(selected.sourceStartMs)) return
    const position = Math.max(0, selected.sourceStartMs / 1000)
    if (video.readyState >= 1) video.currentTime = position
  }, [selected?.sourceStartMs])

  React.useEffect(() => {
    seekToSource()
  }, [seekToSource, sourceUrl])

  if (!selected) return null

  const sourceIsPortrait = dimensions != null && dimensions.height > dimensions.width
  const windowKnown = selected.sourceStartMs != null && selected.sourceEndMs != null

  return (
    <section aria-label="Source and final output comparison" className="relative mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0e14] text-white shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute -right-24 -top-40 size-[460px] rounded-full bg-violet-500/[0.08] blur-3xl" />
      <div className="relative border-b border-white/10 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-300">
              <ScanEye className="size-3.5" aria-hidden="true" /> Final review
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">From source to short.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Inspect the original moment beside the rendered MP4. Select a short to jump the source player to its chosen window.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs text-emerald-200">
            <CheckCircle2 className="size-3.5" aria-hidden="true" /> {clips.length} {clips.length === 1 ? 'output' : 'outputs'} ready
          </div>
        </div>
      </div>

      {clips.length > 1 && (
        <div className="relative border-b border-white/10 px-5 py-4 sm:px-8">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Select a rendered short</div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Rendered shorts">
            {clips.map((clip, index) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onSelectClip(clip.id)}
                aria-pressed={clip.id === selected.id}
                className={cn(
                  'group min-w-32 flex-1 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                  clip.id === selected.id
                    ? 'border-violet-300/60 bg-violet-300/[0.12]'
                    : 'border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]',
                )}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Cut {String(index + 1).padStart(2, '0')}</span>
                <span className="mt-1 block truncate text-sm font-medium text-white">{clip.label}</span>
                <span className="mt-1 block text-xs text-white/45">{time(clip.sourceStartMs)} – {time(clip.sourceEndMs)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative grid gap-px bg-white/10 lg:grid-cols-2">
        <div className="min-w-0 bg-[#0b0e14] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">01 / Original</div>
              <div className="mt-1 truncate text-sm font-medium text-white/90">{sourceTitle}</div>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/55">{aspectLabel(dimensions)}</span>
          </div>
          <div className="flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black sm:h-[440px] xl:h-[520px]">
            {sourceUrl ? (
              <video
                key={sourceUrl}
                ref={sourceRef}
                src={sourceUrl}
                controls
                preload="metadata"
                playsInline
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget
                  if (video.videoWidth && video.videoHeight) setMeasuredSource({ width: video.videoWidth, height: video.videoHeight })
                  seekToSource()
                }}
                className={cn('max-h-full max-w-full bg-black object-contain', sourceIsPortrait ? 'h-full w-auto' : 'h-auto w-full')}
                aria-label="Original source video"
              />
            ) : (
              <div className="max-w-xs px-6 text-center text-sm leading-6 text-white/45">
                The source preview is unavailable. Select the original project to compare this render.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" /> Full source · {time(sourceDurationMs)}</span>
            {windowKnown && sourceUrl && (
              <button type="button" onClick={seekToSource} className="inline-flex items-center gap-1.5 text-violet-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                <Play className="size-3.5" aria-hidden="true" /> Jump to {time(selected.sourceStartMs)}
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 bg-[#0e1018] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">02 / Rendered short</div>
              <div className="mt-1 truncate text-sm font-medium text-white/90">{selected.label}</div>
            </div>
            <span className="shrink-0 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-2.5 py-1 text-[11px] text-violet-200">
              {measuredOutput ? `${measuredOutput.width} × ${measuredOutput.height}` : '9:16 target'}
            </span>
          </div>
          <div className="flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black sm:h-[440px] xl:h-[520px]">
            <video
              key={selected.outputUrl}
              src={selected.outputUrl}
              controls
              preload="metadata"
              playsInline
              onLoadedMetadata={(event) => {
                const video = event.currentTarget
                if (video.videoWidth && video.videoHeight) setMeasuredOutput({ width: video.videoWidth, height: video.videoHeight })
                onOutputDuration?.(Number.isFinite(video.duration) ? video.duration : null)
              }}
              className="h-full max-w-full bg-black object-contain"
              aria-label={`Rendered output: ${selected.label}`}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><Film className="size-3.5" aria-hidden="true" /> MP4 · {windowKnown ? `${time((selected.sourceEndMs ?? 0) - (selected.sourceStartMs ?? 0))} selected` : 'Rendered file'}</span>
            <div className="flex items-center gap-4">
              <a href={selected.outputUrl} download className="inline-flex items-center gap-1.5 text-white/80 underline-offset-4 hover:text-white hover:underline"><Download className="size-3.5" aria-hidden="true" /> Download</a>
              <a href={selected.outputUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/80 underline-offset-4 hover:text-white hover:underline"><ArrowUpRight className="size-3.5" aria-hidden="true" /> Open</a>
            </div>
          </div>
        </div>
      </div>

      {windowKnown && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-5 py-4 text-xs text-white/50 sm:px-8">
          <span className="font-semibold uppercase tracking-[0.14em] text-white/35">Selected source window</span>
          <span className="font-mono text-white/80">{time(selected.sourceStartMs)} → {time(selected.sourceEndMs)}</span>
          {selected.hook && <span className="max-w-xl truncate text-white/65">“{selected.hook}”</span>}
          {selected.score != null && <span className="ml-auto text-amber-200">Score {selected.score}/100</span>}
        </div>
      )}
    </section>
  )
}
