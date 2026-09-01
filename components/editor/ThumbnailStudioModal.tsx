'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Download,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sliders,
  Type,
  Camera,
  Loader2,
  Share2,
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

const STYLE_PRESETS: Array<{ id: ThumbnailStylePreset; label: string; accent: string }> = [
  { id: 'impact', label: 'Viral Impact', accent: '#FFE600' },
  { id: 'editorial', label: 'Editorial Elegist', accent: '#F5F5F0' },
  { id: 'neon', label: 'Cyber Neon', accent: '#00F0FF' },
  { id: 'minimal', label: 'Minimal Swiss', accent: '#FFFFFF' },
  { id: 'bold_accent', label: 'Bold Accent', accent: '#FF2D55' },
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

  const [aspectRatio, setAspectRatio] = React.useState<'16:9' | '9:16'>('16:9')
  const [headline, setHeadline] = React.useState('STOP DOING THIS')
  const [subtitle, setSubtitle] = React.useState('')
  const [preset, setPreset] = React.useState<ThumbnailStylePreset>('impact')
  const [position, setPosition] = React.useState<ThumbnailTextPosition>('bottom')
  const [fontSizeScale, setFontSizeScale] = React.useState(1.0)
  const [showBadge, setShowBadge] = React.useState(true)

  const [previewDataUrl, setPreviewDataUrl] = React.useState<string | null>(null)
  const [isExporting, setIsExporting] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)

  // Extract candidate frames when modal opens
  React.useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setIsExtracting(true)

    const runExtraction = async () => {
      try {
        let extracted: ExtractedFrameCandidate[] = []

        if (videoElement && videoElement.readyState >= 2) {
          // If video element exists, grab current playhead frame first
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

  // Live Thumbnail Render Loop
  React.useEffect(() => {
    if (!candidates.length || selectedFrameIndex >= candidates.length) return

    const activeFrame = candidates[selectedFrameIndex]
    const targetWidth = aspectRatio === '16:9' ? 1280 : 720
    const targetHeight = aspectRatio === '16:9' ? 720 : 1280

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
  }, [candidates, selectedFrameIndex, headline, subtitle, preset, position, fontSizeScale, showBadge, aspectRatio])

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
    link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_thumbnail.png`
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
    }, 600)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Chamber */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex h-[90vh] max-h-[860px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0C] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-white/[0.06] text-[#7ff2d4]">
                <ImageIcon className="size-4" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-base font-medium tracking-tight text-white/90">Thumbnail Studio</h2>
                <p className="text-xs text-white/40">AI-curated viral cover art & keyframe typography</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Aspect Ratio Switcher */}
              <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs text-white/60">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={cn(
                    'rounded-full px-3 py-1 transition-all',
                    aspectRatio === '16:9' ? 'bg-white text-black font-semibold' : 'hover:text-white',
                  )}
                >
                  16:9 Landscape
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={cn(
                    'rounded-full px-3 py-1 transition-all',
                    aspectRatio === '9:16' ? 'bg-white text-black font-semibold' : 'hover:text-white',
                  )}
                >
                  9:16 Portrait
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
            {/* Left Column: Live Canvas & Keyframe Strip (7 Cols) */}
            <div className="flex flex-col gap-5 border-b border-white/[0.08] p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
              {/* Live Canvas Stage */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4">
                {previewDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewDataUrl}
                    alt="Thumbnail Preview"
                    className={cn(
                      'max-h-full rounded-xl object-contain shadow-2xl ring-1 ring-white/10 transition-all',
                      aspectRatio === '16:9' ? 'aspect-video w-full' : 'aspect-[9/16] h-full',
                    )}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <Loader2 className="size-6 animate-spin text-[#7ff2d4]" />
                    <span className="text-xs">Rendering thumbnail…</span>
                  </div>
                )}
              </div>

              {/* Candidate Keyframes Strip */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] text-white/40">Candidate Keyframes</span>
                  {videoElement ? (
                    <button
                      type="button"
                      onClick={handleCaptureCurrentPlayhead}
                      className="inline-flex items-center gap-1.5 text-xs text-[#7ff2d4] transition-colors hover:underline"
                    >
                      <Camera className="size-3.5" />
                      Capture at Playhead
                    </button>
                  ) : null}
                </div>

                {isExtracting ? (
                  <div className="flex h-20 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02]">
                    <Loader2 className="size-4 animate-spin text-white/40" />
                  </div>
                ) : (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                    {candidates.map((candidate, idx) => {
                      const score = aiData?.candidateScores?.[idx]
                      const isRecommended = aiData?.recommendedFrameIndex === idx

                      return (
                        <button
                          key={`candidate-${idx}-${candidate.timecode}`}
                          type="button"
                          onClick={() => setSelectedFrameIndex(idx)}
                          className={cn(
                            'group relative h-18 w-28 shrink-0 overflow-hidden rounded-xl border transition-all',
                            selectedFrameIndex === idx
                              ? 'border-[#7ff2d4] ring-2 ring-[#7ff2d4]/40'
                              : 'border-white/10 hover:border-white/30',
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.dataUrl}
                            alt={`Frame ${candidate.timecode}`}
                            className="size-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 font-mono text-[9px] text-white/80">
                            {candidate.timecode}
                          </span>
                          {score ? (
                            <span
                              className={cn(
                                'absolute left-1 top-1 rounded px-1 py-0.5 text-[8px] font-bold',
                                isRecommended ? 'bg-[#7ff2d4] text-black' : 'bg-black/80 text-white/90',
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

            {/* Right Column: AI Hooks & Visual Styling Controls (5 Cols) */}
            <div className="flex flex-col gap-6 p-6 lg:col-span-5">
              {/* AI Viral Hooks Section */}
              <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                    <Sparkles className="size-3.5" />
                    <span>AI Viral Hooks</span>
                  </div>
                  {isAiCurating ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                      <Loader2 className="size-3 animate-spin" />
                      Analyzing
                    </span>
                  ) : null}
                </div>

                {aiData?.rationale ? (
                  <p className="text-[11px] leading-relaxed text-white/50">{aiData.rationale}</p>
                ) : null}

                {aiData?.hookTitles && aiData.hookTitles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {aiData.hookTitles.map((hook, idx) => (
                      <button
                        key={`hook-${idx}`}
                        type="button"
                        onClick={() => setHeadline(hook)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-all',
                          headline === hook
                            ? 'border-amber-400/50 bg-amber-400/10 text-amber-200'
                            : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white',
                        )}
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {['STOP DOING THIS', 'THE REAL SECRET', 'NEVER AGAIN', 'WATCH THIS FIRST'].map((hook) => (
                      <button
                        key={hook}
                        type="button"
                        onClick={() => setHeadline(hook)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70 hover:text-white"
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Text Inputs */}
              <div className="flex flex-col gap-3">
                <label className="text-xs uppercase tracking-[0.14em] text-white/40">Typography & Headline</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Enter main headline text"
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#7ff2d4]/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Optional subtitle (e.g. In 60 Seconds)"
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white/80 placeholder:text-white/30 focus:border-[#7ff2d4]/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Style Presets */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.14em] text-white/40">Style Aesthetic</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setPreset(style.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all',
                        preset === style.id
                          ? 'border-white/30 bg-white/[0.08] text-white'
                          : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white',
                      )}
                    >
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: style.accent }} />
                      <span className="truncate">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Position & Badge Switches */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
                {/* Position */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Position:</span>
                  <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs text-white/60">
                    {(['top', 'center', 'bottom'] as ThumbnailTextPosition[]).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(pos)}
                        className={cn(
                          'rounded px-2.5 py-0.5 capitalize transition-all',
                          position === pos ? 'bg-white/20 text-white font-medium' : 'hover:text-white',
                        )}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Badge Toggle */}
                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={showBadge}
                    onChange={(e) => setShowBadge(e.target.checked)}
                    className="size-4 rounded border-white/20 bg-black text-[#7ff2d4] focus:ring-0"
                  />
                  <span>Contrast Badge</span>
                </label>
              </div>

              {/* Font Size Scale */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">Scale:</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={fontSizeScale}
                  onChange={(e) => setFontSizeScale(parseFloat(e.target.value))}
                  className="flex-1 accent-[#7ff2d4]"
                />
                <span className="w-8 text-right font-mono text-xs text-white/60">
                  {Math.round(fontSizeScale * 100)}%
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto flex flex-col gap-2.5 border-t border-white/[0.08] pt-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-xs font-semibold text-white transition-all hover:bg-white/[0.1]"
                  >
                    <Download className="size-4" />
                    Download PNG
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCover}
                    disabled={isExporting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7ff2d4] px-4 py-3 text-xs font-semibold text-black transition-all hover:bg-[#9ff6e3] disabled:opacity-50"
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="size-4 text-black" />
                        Cover Saved!
                      </>
                    ) : (
                      <>
                        <ImageIcon className="size-4" />
                        Save Project Cover
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
