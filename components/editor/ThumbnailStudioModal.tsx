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
  Layers,
  Wand2,
  SlidersHorizontal,
  Palette,
  Eye,
} from 'lucide-react'

import {
  ThumbnailEngine,
  type ExtractedFrameCandidate,
  type ThumbnailStylePreset,
  type ThumbnailTextConfig,
  type ThumbnailTextPosition,
  type TextLayerMode,
} from '@/lib/thumbnails/thumbnail-engine'
import { SHORT_FORM_ARCHETYPES, type ShortFormStyleConfig } from '@/lib/thumbnails/short-form-styles'
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

const BRAND_PALETTES = [
  { name: 'Viral Amber', color: '#FFE600' },
  { name: 'Electric Cyan', color: '#00F0FF' },
  { name: 'Neon Crimson', color: '#FF0033' },
  { name: 'Emerald High', color: '#10B981' },
  { name: 'Royal Violet', color: '#8B5CF6' },
  { name: 'Pure Bone', color: '#F7F6F2' },
  { name: 'High-Vis Orange', color: '#FF6B00' },
]

const AVAILABLE_FLOATING_ASSETS = [
  { id: 'hourglass', label: 'Hourglass' },
  { id: 'book', label: 'Open Book' },
  { id: 'calendar_x', label: 'Calendar X' },
  { id: 'notepad', label: '3D Notes' },
  { id: 'camera', label: 'Camera' },
  { id: 'dollar', label: 'Money Sign $' },
  { id: 'question_mark', label: 'Question ?' },
  { id: 'doodle_arrow', label: 'Doodle Arrow' },
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

  const [aspectRatio, setAspectRatio] = React.useState<StudioAspectRatio>('9:16')

  const [selectedArchetype, setSelectedArchetype] = React.useState<ShortFormStyleConfig>(
    SHORT_FORM_ARCHETYPES[0],
  )

  const [headline, setHeadline] = React.useState(() =>
    projectTitle?.trim() ? projectTitle.toUpperCase().slice(0, 28) : 'TIME MANAGEMENT',
  )
  const [scriptAccent, setScriptAccent] = React.useState("READING'DA")
  const [subtitle, setSubtitle] = React.useState('')
  const [position, setPosition] = React.useState<ThumbnailTextPosition>('bottom')
  const [fontSizeScale, setFontSizeScale] = React.useState(1.0)
  const [showBadge, setShowBadge] = React.useState(true)

  const [textLayer, setTextLayer] = React.useState<TextLayerMode>('behind')

  const [brandColor, setBrandColor] = React.useState('#FF6B00')

  const [activeAssets, setActiveAssets] = React.useState<string[]>(['hourglass', 'book'])

  const [hasVignette, setHasVignette] = React.useState(true)
  const [vignetteIntensity, setVignetteIntensity] = React.useState(0.75)
  const [hasFilmGrain, setHasFilmGrain] = React.useState(true)
  const [hasFringeBlur, setHasFringeBlur] = React.useState(false)
  const [hasInkBleed, setHasInkBleed] = React.useState(false)
  const [hasRimLight, setHasRimLight] = React.useState(true)
  const [hasBackgroundGrid, setHasBackgroundGrid] = React.useState(false)
  const [hasTelemetryRuler, setHasTelemetryRuler] = React.useState(true)

  const [isGeneratingNanoBanana, setIsGeneratingNanoBanana] = React.useState(false)
  const [nanoBananaImageUrl, setNanoBananaImageUrl] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'canvas' | 'nano_banana'>('canvas')
  const [nanoBananaStatus, setNanoBananaStatus] = React.useState<string | null>(null)

  const [previewDataUrl, setPreviewDataUrl] = React.useState<string | null>(null)
  const [isExporting, setIsExporting] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)

  const handleSelectArchetype = (archetype: ShortFormStyleConfig) => {
    setSelectedArchetype(archetype)
    setBrandColor(archetype.defaultBrandColor)
    setTextLayer(archetype.textLayer)
    setHasRimLight(archetype.hasRimLight)
    setHasVignette(archetype.hasVignette)
    setVignetteIntensity(archetype.defaultVignetteIntensity)
    setHasFilmGrain(archetype.hasFilmGrain)
    setHasFringeBlur(archetype.hasFringeBlur)
    setHasInkBleed(archetype.hasInkBleed)
    setHasBackgroundGrid(archetype.backgroundGrid)
    setHasTelemetryRuler(archetype.telemetryRuler)
    setActiveAssets(archetype.defaultFloatingAssets)
    if (archetype.sampleScript) setScriptAccent(archetype.sampleScript)
    if (archetype.sampleSubtitle) setSubtitle(archetype.sampleSubtitle)
  }

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
      }
    } catch (err) {
      console.warn('[AI Curation Fallback]', err)
    } finally {
      setIsAiCurating(false)
    }
  }

  const activeAspectConfig = React.useMemo(() => {
    return ASPECT_RATIO_OPTIONS.find((opt) => opt.id === aspectRatio) ?? ASPECT_RATIO_OPTIONS[0]
  }, [aspectRatio])

  React.useEffect(() => {
    if (!candidates.length || selectedFrameIndex >= candidates.length) return

    const activeFrame = candidates[selectedFrameIndex]
    const targetWidth = activeAspectConfig.width
    const targetHeight = activeAspectConfig.height

    const config: ThumbnailTextConfig = {
      headline,
      scriptAccent: scriptAccent || undefined,
      subtitle: subtitle || undefined,
      preset: selectedArchetype.id as ThumbnailStylePreset,
      position,
      fontSizeScale,
      showBadge,
      brandColor,
      textLayer,
      floatingAssets: activeAssets,
      treatments: {
        vignette: hasVignette,
        vignetteIntensity,
        filmGrain: hasFilmGrain,
        fringeBlur: hasFringeBlur,
        inkBleed: hasInkBleed,
        rimLight: hasRimLight,
        backgroundGrid: hasBackgroundGrid,
        telemetryRuler: hasTelemetryRuler,
      },
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
  }, [
    candidates,
    selectedFrameIndex,
    headline,
    scriptAccent,
    subtitle,
    selectedArchetype,
    position,
    fontSizeScale,
    showBadge,
    brandColor,
    textLayer,
    activeAssets,
    hasVignette,
    vignetteIntensity,
    hasFilmGrain,
    hasFringeBlur,
    hasInkBleed,
    hasRimLight,
    hasBackgroundGrid,
    hasTelemetryRuler,
    activeAspectConfig,
  ])

  const toggleFloatingAsset = (assetId: string) => {
    setActiveAssets((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    )
  }

  const handleGenerateNanoBanana = async () => {
    const activeFrame = candidates[selectedFrameIndex]
    setIsGeneratingNanoBanana(true)
    setNanoBananaStatus('Sending image shot & specifications to Nano Banana…')

    try {
      const res = await fetch(`/api/projects/${projectId}/thumbnails/nano-banana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameDataUrl: activeFrame?.dataUrl,
          headline,
          scriptAccent,
          subtitle,
          styleId: selectedArchetype.id,
          brandColor,
          aspectRatio,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.dataUrl) {
          setNanoBananaImageUrl(data.dataUrl)
          setViewMode('nano_banana')
          setNanoBananaStatus('Nano Banana generation complete!')
        } else {
          setNanoBananaStatus(data.fallbackMessage || 'Nano Banana specifications synthesized.')
        }
      } else {
        setNanoBananaStatus('Nano Banana request processed via Studio Canvas engine.')
      }
    } catch (err) {
      console.warn('[Nano Banana Request Error]', err)
      setNanoBananaStatus('Studio Canvas engine active.')
    } finally {
      setIsGeneratingNanoBanana(false)
      setTimeout(() => setNanoBananaStatus(null), 4000)
    }
  }

  const handleCaptureCurrentPlayhead = () => {
    if (!videoElement) return
    const frame = ThumbnailEngine.captureFrameFromVideo(videoElement)
    if (frame) {
      setCandidates((prev) => [frame, ...prev])
      setSelectedFrameIndex(0)
    }
  }

  const handleDownload = () => {
    const activeUrl = viewMode === 'nano_banana' && nanoBananaImageUrl ? nanoBananaImageUrl : previewDataUrl
    if (!activeUrl) return
    const link = document.createElement('a')
    link.href = activeUrl
    link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_${aspectRatio.replace(':', 'x')}_short_cover.png`
    link.click()
  }

  const handleSaveCover = () => {
    const activeUrl = viewMode === 'nano_banana' && nanoBananaImageUrl ? nanoBananaImageUrl : previewDataUrl
    if (!activeUrl) return
    setIsExporting(true)
    onSaveProjectThumbnail?.(activeUrl)
    setTimeout(() => {
      setIsExporting(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2400)
    }, 450)
  }

  if (!isOpen) return null

  const currentDisplayUrl =
    viewMode === 'nano_banana' && nanoBananaImageUrl ? nanoBananaImageUrl : previewDataUrl

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#040405]/88 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex h-[94vh] max-h-[920px] w-full max-w-7xl flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#09090b] shadow-[0_32px_100px_rgba(0,0,0,0.9)]"
        >
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                Short-Form Studio
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-300">
                Nano Banana Enabled
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const isActive = aspectRatio === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAspectRatio(opt.id)}
                      className={cn(
                        'relative rounded-md px-2.5 py-1 text-xs font-mono transition-colors',
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

              {nanoBananaImageUrl && (
                <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('canvas')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      viewMode === 'canvas' ? 'bg-white text-black' : 'text-white/50 hover:text-white',
                    )}
                  >
                    <Layers className="size-3" />
                    Canvas
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('nano_banana')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      viewMode === 'nano_banana' ? 'bg-amber-400 text-black' : 'text-white/50 hover:text-white',
                    )}
                  >
                    <Wand2 className="size-3" />
                    Nano Banana
                  </button>
                </div>
              )}

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

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
            <div className="flex flex-col justify-between border-b border-white/[0.06] bg-[#060608] p-4 lg:col-span-7 lg:border-b-0 lg:border-r lg:p-6">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden py-1">
                {currentDisplayUrl ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-25 blur-3xl transition-opacity duration-700"
                    style={{
                      backgroundImage: `url(${currentDisplayUrl})`,
                      backgroundPosition: 'center',
                      backgroundSize: 'cover',
                    }}
                  />
                ) : null}

                <div className="relative z-10 flex h-full max-h-[520px] w-full items-center justify-center">
                  {currentDisplayUrl ? (
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                      className={cn(
                        'relative overflow-hidden rounded-xl border border-white/12 bg-black shadow-[0_24px_64px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.06]',
                        activeAspectConfig.cssAspect,
                        aspectRatio === '9:16' || aspectRatio === '9:6' ? 'h-full max-h-[520px] w-auto' : 'w-full max-w-[540px] h-auto',
                      )}
                    >
                      <img
                        src={currentDisplayUrl}
                        alt="Active Studio Cover Art"
                        className="size-full object-contain"
                      />

                      <div className="pointer-events-none absolute bottom-2 left-2.5 flex items-center gap-1.5 rounded bg-black/75 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/70 backdrop-blur-md">
                        <span>{activeAspectConfig.width} × {activeAspectConfig.height}</span>
                        <span className="text-white/30">//</span>
                        <span style={{ color: brandColor }}>{selectedArchetype.name}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5 text-white/35">
                      <Loader2 className="size-5 animate-spin text-white/50" />
                      <span className="font-mono text-[11px] tracking-wider">Rendering Short-Form Cover…</span>
                    </div>
                  )}
                </div>
              </div>

              {nanoBananaStatus && (
                <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 font-mono text-[11px] text-amber-200">
                  {nanoBananaStatus}
                </div>
              )}

              <div className="mt-3 shrink-0 space-y-2 border-t border-white/[0.06] pt-3">
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
                  <div className="flex h-14 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.01]">
                    <Loader2 className="size-4 animate-spin text-white/30" />
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {candidates.map((candidate, idx) => {
                      const isSelected = selectedFrameIndex === idx
                      return (
                        <button
                          key={`candidate-${idx}-${candidate.timecode}`}
                          type="button"
                          onClick={() => setSelectedFrameIndex(idx)}
                          className={cn(
                            'group relative h-14 w-22 shrink-0 overflow-hidden rounded-lg border transition-all duration-200',
                            isSelected
                              ? 'border-white ring-1 ring-white/60'
                              : 'border-white/10 opacity-70 hover:border-white/30 hover:opacity-100',
                          )}
                        >
                          <img
                            src={candidate.dataUrl}
                            alt={`Candidate at ${candidate.timecode}`}
                            className="size-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 font-mono text-[8px] text-white/70">
                            {candidate.timecode}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between overflow-y-auto p-5 lg:col-span-5 lg:p-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Short-Form Archetypes
                    </span>
                    <span className="font-mono text-[9px] text-white/30">
                      {SHORT_FORM_ARCHETYPES.length} Curated Styles
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[155px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {SHORT_FORM_ARCHETYPES.map((arch) => {
                      const isSelected = selectedArchetype.id === arch.id
                      return (
                        <button
                          key={arch.id}
                          type="button"
                          onClick={() => handleSelectArchetype(arch)}
                          className={cn(
                            'flex flex-col items-start gap-1 rounded-lg border p-2 text-left transition-all',
                            isSelected
                              ? 'border-white/40 bg-white/[0.08] text-white'
                              : 'border-white/[0.08] bg-white/[0.015] text-white/50 hover:border-white/20 hover:text-white',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: arch.defaultBrandColor }}
                            />
                            <span className="truncate text-xs font-semibold">{arch.name}</span>
                          </div>
                          <span className="line-clamp-1 text-[9px] text-white/40">{arch.tagline}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Depth Layering
                    </span>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1">
                      {(
                        [
                          { id: 'behind', label: 'Behind Speaker' },
                          { id: 'foreground', label: 'Foreground Overlay' },
                          { id: 'split', label: 'Split Dual-Layer' },
                        ] as const
                      ).map(({ id, label }) => {
                        const isCurrent = textLayer === id
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTextLayer(id)}
                            className={cn(
                              'rounded px-2 py-1 text-left text-xs transition-colors',
                              isCurrent ? 'bg-white/15 text-white font-semibold' : 'text-white/50 hover:text-white',
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Brand Palette
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {BRAND_PALETTES.map((p) => {
                        const isSelected = brandColor.toLowerCase() === p.color.toLowerCase()
                        return (
                          <button
                            key={p.color}
                            type="button"
                            title={p.name}
                            onClick={() => setBrandColor(p.color)}
                            className={cn(
                              'size-6 rounded-md border transition-all',
                              isSelected ? 'scale-110 border-white ring-2 ring-white/50' : 'border-white/20 opacity-80 hover:opacity-100',
                            )}
                            style={{ backgroundColor: p.color }}
                          />
                        )
                      })}
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="size-6 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Typography & Multi-Script
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Primary bold headline (e.g. $ 1,000,000)"
                      className="w-full rounded-lg border border-white/[0.08] bg-black/60 px-3 py-2 text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={scriptAccent}
                        onChange={(e) => setScriptAccent(e.target.value)}
                        placeholder="Luxury cursive script accent"
                        className="w-full rounded-lg border border-white/[0.08] bg-black/60 px-3 py-1.5 text-xs text-amber-300 placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Optional subtitle / badge"
                        className="w-full rounded-lg border border-white/[0.08] bg-black/60 px-3 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:border-white/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Floating Contextual Assets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_FLOATING_ASSETS.map((asset) => {
                      const isActive = activeAssets.includes(asset.id)
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => toggleFloatingAsset(asset.id)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs transition-colors',
                            isActive
                              ? 'border-white/40 bg-white/10 text-white font-medium'
                              : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white',
                          )}
                        >
                          {asset.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Photo & Film Treatments
                    </span>
                    <span className="font-mono text-[9px] text-white/30">Vignette: {Math.round(vignetteIntensity * 100)}%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasVignette}
                        onChange={(e) => setHasVignette(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Deep Vignette</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasRimLight}
                        onChange={(e) => setHasRimLight(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Color Rim Light</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasFilmGrain}
                        onChange={(e) => setHasFilmGrain(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Film Dust & Grain</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasFringeBlur}
                        onChange={(e) => setHasFringeBlur(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Fringe Blur</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasInkBleed}
                        onChange={(e) => setHasInkBleed(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Text Ink Bleed</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasTelemetryRuler}
                        onChange={(e) => setHasTelemetryRuler(e.target.checked)}
                        className="size-3.5 rounded border-white/20 bg-black text-white focus:ring-0"
                      />
                      <span>Telemetry Ruler</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={handleGenerateNanoBanana}
                  disabled={isGeneratingNanoBanana}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
                >
                  {isGeneratingNanoBanana ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Nano Banana Synthesizing…
                    </>
                  ) : (
                    <>
                      <Wand2 className="size-3.5" />
                      Generate with Nano Banana AI
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2.5">
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
