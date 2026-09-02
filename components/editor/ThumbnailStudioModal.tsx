'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Download,
  Image as ImageIcon,
  Check,
  Camera,
  Loader2,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from 'lucide-react'

import {
  ThumbnailEngine,
  type ExtractedFrameCandidate,
  type ThumbnailStylePreset,
  type ThumbnailTextConfig,
  type ThumbnailTextPosition,
} from '@/lib/thumbnails/thumbnail-engine'
import { cn } from '@/lib/utils'

interface ThumbnailStudioModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
  videoElement?: HTMLVideoElement | null
  videoUrl?: string | null
  transcriptSnippet?: string
  onSaveProjectThumbnail?: (dataUrl: string) => void
}

interface AiCurationResponse {
  recommendedFrameIndex: number
  candidateScores: number[]
  hookTitles: string[]
  suggestedStyle: ThumbnailStylePreset
  rationale: string
}

export type StudioAspectRatio = '9:16' | '9:6' | '1:1' | '16:9'

interface AspectRatioOption {
  id: StudioAspectRatio
  label: string
  category: string
  width: number
  height: number
  cssAspect: string
}

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '9:16', label: '9:16', category: 'Vertical Mobile', width: 720, height: 1280, cssAspect: 'aspect-[9/16]' },
  { id: '9:6', label: '9:6', category: 'Editorial Portrait', width: 720, height: 1080, cssAspect: 'aspect-[9/6]' },
  { id: '1:1', label: '1:1', category: 'Square Feed', width: 1080, height: 1080, cssAspect: 'aspect-square' },
  { id: '16:9', label: '16:9', category: 'Landscape Cinema', width: 1280, height: 720, cssAspect: 'aspect-video' },
]

interface PresetOption {
  id: ThumbnailStylePreset
  name: string
  subtitle: string
  swatch: string
}

const PRESET_OPTIONS: PresetOption[] = [
  { id: 'editorial', name: 'Atelier Editorial', subtitle: 'Luxury Serif', swatch: '#F7F6F2' },
  { id: 'minimal', name: 'Swiss Minimal', subtitle: 'Pure Grotesque', swatch: '#FFFFFF' },
  { id: 'cinematic', name: 'Cinematic Monolith', subtitle: 'Tracked Upper', swatch: '#EAE6DF' },
  { id: 'impact', name: 'Viral Bold', subtitle: 'High-Energy Contrast', swatch: '#FFE600' },
  { id: 'neon', name: 'Cyber Minimal', subtitle: 'Electric Tint', swatch: '#00F0FF' },
]

export function ThumbnailStudioModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  videoElement,
  videoUrl,
  transcriptSnippet = '',
  onSaveProjectThumbnail,
}: ThumbnailStudioModalProps) {
  const [candidates, setCandidates] = React.useState<ExtractedFrameCandidate[]>([])
  const [selectedFrameIndex, setSelectedFrameIndex] = React.useState<number>(0)
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [isAiCurating, setIsAiCurating] = React.useState(false)
  const [aiData, setAiData] = React.useState<AiCurationResponse | null>(null)

  // Default to 9:16 vertical as requested by the user
  const [aspectRatio, setAspectRatio] = React.useState<StudioAspectRatio>('9:16')
  const [headline, setHeadline] = React.useState(() =>
    projectTitle?.trim() ? projectTitle.toUpperCase().slice(0, 32) : 'THE NEW DISCIPLINE',
  )
  const [subtitle, setSubtitle] = React.useState('')
  const [preset, setPreset] = React.useState<ThumbnailStylePreset>('editorial')
  const [position, setPosition] = React.useState<ThumbnailTextPosition>('bottom')
  const [fontSizeScale, setFontSizeScale] = React.useState(1.0)
  const [showBadge, setShowBadge] = React.useState(true)

  const [previewDataUrl, setPreviewDataUrl] = React.useState<string | null>(null)
  const [isExporting, setIsExporting] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)

  // Sync initial headline when projectTitle changes
  React.useEffect(() => {
    if (projectTitle?.trim()) {
      setHeadline((prev) => (prev === 'THE NEW DISCIPLINE' ? projectTitle.toUpperCase().slice(0, 32) : prev))
    }
  }, [projectTitle])

  // Extract candidate frames when modal opens
  React.useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setIsExtracting(true)

    const runExtraction = async () => {
      try {
        let extracted: ExtractedFrameCandidate[] = []

        if (videoElement && videoElement.readyState >= 2) {
          const currentFrame = ThumbnailEngine.captureFrameFromVideo(videoElement)
          extracted = await ThumbnailEngine.extractCandidateFrames(videoElement, 6)
          if (currentFrame) {
            extracted.unshift(currentFrame)
          }
        } else if (videoUrl) {
          extracted = await ThumbnailEngine.extractCandidateFrames(videoUrl, 6)
        }

        if (isMounted && extracted.length > 0) {
          setCandidates(extracted)
          setSelectedFrameIndex(0)
          void triggerAiCuration(extracted)
        }
      } catch (err) {
        console.error('[Thumbnail Extraction Failed]', err)
      } finally {
        if (isMounted) setIsExtracting(false)
      }
    }

    void runExtraction()

    return () => {
      isMounted = false
    }
  }, [isOpen, videoElement, videoUrl])

  // AI Curation Call
  const triggerAiCuration = async (frames: ExtractedFrameCandidate[]) => {
    if (!frames.length) return
    setIsAiCurating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/thumbnails/ai-curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.slice(0, 6).map((f) => ({
            timeSec: f.timeSec,
            timecode: f.timecode,
            dataUrl: f.dataUrl,
          })),
          transcriptSnippet,
          projectTitle,
        }),
      })

      if (res.ok) {
        const data = (await res.json()) as AiCurationResponse
        setAiData(data)
        if (typeof data.recommendedFrameIndex === 'number' && data.recommendedFrameIndex < frames.length) {
          setSelectedFrameIndex(data.recommendedFrameIndex)
        }
        if (data.hookTitles && data.hookTitles.length > 0) {
          setHeadline(data.hookTitles[0])
        }
        if (data.suggestedStyle) {
          setPreset(data.suggestedStyle)
        }
      }
    } catch (err) {
      console.warn('[AI Curation Fallback]', err)
    } finally {
      setIsAiCurating(false)
    }
  }

  // Active Aspect Config
  const activeAspectConfig = React.useMemo(() => {
    return ASPECT_RATIO_OPTIONS.find((opt) => opt.id === aspectRatio) ?? ASPECT_RATIO_OPTIONS[0]
  }, [aspectRatio])

  // Live Thumbnail Render Loop
  React.useEffect(() => {
    if (!candidates.length || selectedFrameIndex >= candidates.length) return

    const activeFrame = candidates[selectedFrameIndex]
    const targetWidth = activeAspectConfig.width
    const targetHeight = activeAspectConfig.height

    const config: ThumbnailTextConfig = {
      headline,
      subtitle: subtitle || undefined,
      preset,
      position,
      fontSizeScale,
      showBadge,
    }

    let isMounted = true
    ThumbnailEngine.renderThumbnail(activeFrame.dataUrl, config, targetWidth, targetHeight)
      .then((res) => {
        if (isMounted) setPreviewDataUrl(res.dataUrl)
      })
      .catch((err) => console.error('[Render Thumbnail Error]', err))

    return () => {
      isMounted = false
    }
  }, [candidates, selectedFrameIndex, headline, subtitle, preset, position, fontSizeScale, showBadge, activeAspectConfig])

  // Capture current playhead from video
  const handleCaptureCurrentPlayhead = () => {
    if (!videoElement) return
    const frame = ThumbnailEngine.captureFrameFromVideo(videoElement)
    if (frame) {
      setCandidates((prev) => [frame, ...prev])
      setSelectedFrameIndex(0)
    }
  }

  // Download Action
  const handleDownload = () => {
    if (!previewDataUrl) return
    const link = document.createElement('a')
    link.href = previewDataUrl
    link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_${aspectRatio.replace(':', 'x')}_cover.png`
    link.click()
  }

  // Save as Project Cover Action
  const handleSaveCover = () => {
    if (!previewDataUrl) return
    setIsExporting(true)
    onSaveProjectThumbnail?.(previewDataUrl)
    setTimeout(() => {
      setIsExporting(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2400)
    }, 450)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8">
        {/* Minimalist Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#040405]/85 backdrop-blur-md"
        />

        {/* Modal Chamber */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex h-[92vh] max-h-[890px] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#09090b] shadow-[0_32px_100px_rgba(0,0,0,0.85)]"
        >
          {/* Minimalist Architectural Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/38">
                Cover Studio
              </span>
              <span className="h-3 w-px bg-white/10" />
              <h2 className="truncate text-xs font-medium tracking-[0.02em] text-white/80">
                {projectTitle || 'Untitled Sequence'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Aspect Ratio Segmented Control */}
              <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const isActive = aspectRatio === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAspectRatio(opt.id)}
                      className={cn(
                        'relative rounded-md px-3 py-1 text-xs font-mono transition-colors',
                        isActive ? 'text-black' : 'text-white/50 hover:text-white/85',
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-aspect-ratio"
                          className="absolute inset-0 rounded-md bg-white shadow-sm"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 font-semibold">{opt.label}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                aria-label="Close Studio"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </header>

          {/* Main Workspace Stage */}
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
            {/* Left Column: Vertical Canvas Display (7 Cols) */}
            <div className="flex flex-col justify-between border-b border-white/[0.06] bg-[#070709] p-5 lg:col-span-7 lg:border-b-0 lg:border-r lg:p-7">
              {/* Centered Luxury Canvas Stage */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden py-2">
                {/* Subtle Ambient Backlight derived from frame */}
                {previewDataUrl ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-20 blur-3xl transition-opacity duration-700"
                    style={{
                      backgroundImage: `url(${previewDataUrl})`,
                      backgroundPosition: 'center',
                      backgroundSize: 'cover',
                    }}
                  />
                ) : null}

                {/* Canvas Box */}
                <div className="relative z-10 flex h-full max-h-[510px] w-full items-center justify-center">
                  {previewDataUrl ? (
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                      className={cn(
                        'relative overflow-hidden rounded-xl border border-white/12 bg-black shadow-[0_24px_64px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.04]',
                        activeAspectConfig.cssAspect,
                        aspectRatio === '9:16' || aspectRatio === '9:6' ? 'h-full max-h-[510px] w-auto' : 'w-full max-w-[540px] h-auto',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewDataUrl}
                        alt="Active Studio Cover Art"
                        className="size-full object-contain"
                      />

                      {/* Technical Specs Pill */}
                      <div className="pointer-events-none absolute bottom-2 left-2.5 rounded bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/65 backdrop-blur-md">
                        {activeAspectConfig.width} × {activeAspectConfig.height} // {activeAspectConfig.label}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5 text-white/35">
                      <Loader2 className="size-5 animate-spin text-white/50" />
                      <span className="font-mono text-[11px] tracking-wider">Synthesizing Cover…</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Keyframes Filmstrip */}
              <div className="mt-4 shrink-0 space-y-2 border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Source Keyframes
                  </span>
                  {videoElement ? (
                    <button
                      type="button"
                      onClick={handleCaptureCurrentPlayhead}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/60 transition-colors hover:text-white"
                    >
                      <Camera className="size-3 text-white/50" />
                      Sample Playhead
                    </button>
                  ) : null}
                </div>

                {isExtracting ? (
                  <div className="flex h-16 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.01]">
                    <Loader2 className="size-4 animate-spin text-white/30" />
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {candidates.map((candidate, idx) => {
                      const score = aiData?.candidateScores?.[idx]
                      const isRecommended = aiData?.recommendedFrameIndex === idx
                      const isSelected = selectedFrameIndex === idx

                      return (
                        <button
                          key={`candidate-${idx}-${candidate.timecode}`}
                          type="button"
                          onClick={() => setSelectedFrameIndex(idx)}
                          className={cn(
                            'group relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-all duration-200',
                            isSelected
                              ? 'border-white ring-1 ring-white/60'
                              : 'border-white/10 opacity-70 hover:border-white/30 hover:opacity-100',
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.dataUrl}
                            alt={`Candidate at ${candidate.timecode}`}
                            className="size-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 font-mono text-[8px] text-white/70">
                            {candidate.timecode}
                          </span>
                          {score ? (
                            <span
                              className={cn(
                                'absolute left-1 top-1 rounded px-1 py-0.2 font-mono text-[8px]',
                                isRecommended
                                  ? 'bg-white text-black font-semibold'
                                  : 'bg-black/80 text-white/70',
                              )}
                            >
                              {score}%
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Editorial Typographic & Aesthetic Controls (5 Cols) */}
            <div className="flex flex-col justify-between overflow-y-auto p-6 lg:col-span-5 lg:p-7">
              <div className="space-y-6">
                {/* AI Curated Hooks */}
                <div className="space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      <Sparkles className="size-3 text-white/60" />
                      <span>Curated Hooks</span>
                    </div>
                    {isAiCurating && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                        Analyzing…
                      </span>
                    )}
                  </div>

                  {aiData?.rationale ? (
                    <p className="text-xs leading-relaxed text-white/40">{aiData.rationale}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-1.5">
                    {(aiData?.hookTitles && aiData.hookTitles.length > 0
                      ? aiData.hookTitles
                      : ['THE NEW DISCIPLINE', 'BEFORE YOU DECIDE', 'LESS BUT BETTER', 'THE TURNING POINT']
                    ).map((hook) => {
                      const isActive = headline === hook
                      return (
                        <button
                          key={hook}
                          type="button"
                          onClick={() => setHeadline(hook)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs transition-colors',
                            isActive
                              ? 'border-white/40 bg-white/10 text-white'
                              : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white',
                          )}
                        >
                          {hook}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Typography Inputs */}
                <div className="space-y-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Typography & Copy
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Enter primary cover headline"
                      className="w-full rounded-lg border border-white/[0.08] bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Optional subtitle / author / chapter"
                      className="w-full rounded-lg border border-white/[0.08] bg-black/60 px-3.5 py-2 text-xs text-white/80 placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Style Aesthetic Presets */}
                <div className="space-y-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Aesthetic Direction
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PRESET_OPTIONS.map((style) => {
                      const isSelected = preset === style.id
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setPreset(style.id)}
                          className={cn(
                            'flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all',
                            isSelected
                              ? 'border-white/40 bg-white/[0.07] text-white'
                              : 'border-white/[0.08] bg-white/[0.015] text-white/50 hover:border-white/20 hover:text-white',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: style.swatch }} />
                            <span className="truncate text-xs font-medium">{style.name}</span>
                          </div>
                          <span className="text-[10px] text-white/35">{style.subtitle}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Placement & Composition */}
                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Placement
                    </span>
                    <div className="flex rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
                      {(
                        [
                          { id: 'top', icon: AlignVerticalJustifyStart, label: 'Top' },
                          { id: 'center', icon: AlignVerticalJustifyCenter, label: 'Mid' },
                          { id: 'bottom', icon: AlignVerticalJustifyEnd, label: 'Base' },
                        ] as const
                      ).map(({ id, icon: Icon, label }) => {
                        const isCurrent = position === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPosition(id)}
                            className={cn(
                              'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                              isCurrent ? 'bg-white/15 text-white font-medium' : 'text-white/50 hover:text-white',
                            )}
                          >
                            <Icon className="size-3" />
                            <span>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Contrast Pill Toggle & Scale */}
                  <div className="flex items-center justify-between gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={showBadge}
                        onChange={(e) => setShowBadge(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Contrast Badge</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-white/40">Scale:</span>
                      <input
                        type="range"
                        min="0.7"
                        max="1.4"
                        step="0.05"
                        value={fontSizeScale}
                        onChange={(e) => setFontSizeScale(parseFloat(e.target.value))}
                        className="w-20 accent-white"
                      />
                      <span className="w-8 text-right font-mono text-[11px] text-white/60">
                        {Math.round(fontSizeScale * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Deck */}
              <div className="mt-8 border-t border-white/[0.06] pt-5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/85 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Download className="size-3.5" />
                    Download PNG
                  </button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveCover}
                    disabled={isExporting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black transition-opacity hover:opacity-95 disabled:opacity-50"
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="size-3.5 text-black" />
                        Cover Saved
                      </>
                    ) : (
                      <>
                        <ImageIcon className="size-3.5" />
                        Save Project Cover
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
