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
  SlidersHorizontal,
  Palette,
  Eye,
  TriangleAlert,
  Plus,
  Upload,
  Trash2,
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
import {
  VIRAL_THUMBNAIL_RECIPES,
  BACKGROUND_SNIPPETS,
  TEXT_TREATMENT_SNIPPETS,
  PROOF_ARTIFACT_SNIPPETS,
  DIRECTIONAL_SNIPPETS,
  LIGHTING_SNIPPETS,
  type ThumbnailRecipe,
} from '@/lib/thumbnails/nano-banana-rulebook'
import { cn } from '@/lib/utils'
import SpotlightFrames from '@/components/editor/SpotlightFrames'
import LiquidCarveButton from '@/components/editor/LiquidCarveButton'
import DitherReveal from '@/components/editor/DitherReveal'
import PixelReveal from '@/components/editor/PixelReveal'

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
  { name: 'Ink Slate', color: '#3E5C76' },
  { name: 'Bone Paper', color: '#E8E1D2' },
  { name: 'Charcoal', color: '#2B2D33' },
  { name: 'Sage', color: '#8A8A7C' },
  { name: 'Porcelain Blue', color: '#4C6E9E' },
  { name: 'Deep Forest', color: '#3A4B38' },
  { name: 'Mist', color: '#B7BCC2' },
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

export type SpatialPointId =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface SpatialPositionConfig {
  id: SpatialPointId
  label: string
  row: ThumbnailTextPosition
  align: 'left' | 'center' | 'right'
}

export const SPATIAL_POSITIONS: SpatialPositionConfig[] = [
  { id: 'top-left', label: 'TL', row: 'top', align: 'left' },
  { id: 'top-center', label: 'TC', row: 'top', align: 'center' },
  { id: 'top-right', label: 'TR', row: 'top', align: 'right' },
  { id: 'center-left', label: 'CL', row: 'center', align: 'left' },
  { id: 'center', label: 'CC', row: 'center', align: 'center' },
  { id: 'center-right', label: 'CR', row: 'center', align: 'right' },
  { id: 'bottom-left', label: 'BL', row: 'bottom', align: 'left' },
  { id: 'bottom-center', label: 'BC', row: 'bottom', align: 'center' },
  { id: 'bottom-right', label: 'BR', row: 'bottom', align: 'right' },
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
  const [spatialPoint, setSpatialPoint] = React.useState<SpatialPointId>('bottom-center')
  const [fontSizeScale, setFontSizeScale] = React.useState(1.0)
  const [showBadge, setShowBadge] = React.useState(true)

  const [selectedRecipe, setSelectedRecipe] = React.useState<ThumbnailRecipe>(VIRAL_THUMBNAIL_RECIPES[0])
  const [highlightWord, setHighlightWord] = React.useState<string>(VIRAL_THUMBNAIL_RECIPES[0].highlightWord || 'EASY')
  const [highlightColor, setHighlightColor] = React.useState<string>('#FFE600')
  const [selectedProofArtifactId, setSelectedProofArtifactId] = React.useState<string>(VIRAL_THUMBNAIL_RECIPES[0].proofArtifact)
  const [selectedDirectionalId, setSelectedDirectionalId] = React.useState<string>(VIRAL_THUMBNAIL_RECIPES[0].directionalStyle)

  const handleSelectRecipe = (recipe: ThumbnailRecipe) => {
    setSelectedRecipe(recipe)
    setAspectRatio(recipe.aspectRatio as StudioAspectRatio)
    setSelectedProofArtifactId(recipe.proofArtifact)
    setSelectedDirectionalId(recipe.directionalStyle)
    if (recipe.highlightWord) {
      setHighlightWord(recipe.highlightWord)
    }
    if (recipe.exampleHeadline && (!headline || headline === 'TIME MANAGEMENT')) {
      setHeadline(recipe.exampleHeadline)
    }
  }

  const [stageTilt, setStageTilt] = React.useState({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    active: false,
  })
  const [canvasPlacementFeedback, setCanvasPlacementFeedback] = React.useState<{
    x: number
    y: number
    label: string
  } | null>(null)

  const [textLayer, setTextLayer] = React.useState<TextLayerMode>('behind')

  const [brandColor, setBrandColor] = React.useState('#3E5C76')

  const [activeAssets, setActiveAssets] = React.useState<string[]>([])

  const [hasVignette, setHasVignette] = React.useState(true)
  const [vignetteIntensity, setVignetteIntensity] = React.useState(0.5)
  const [hasFilmGrain, setHasFilmGrain] = React.useState(false)
  const [hasFringeBlur, setHasFringeBlur] = React.useState(false)
  const [hasInkBleed, setHasInkBleed] = React.useState(false)
  const [hasRimLight, setHasRimLight] = React.useState(false)
  const [hasBackgroundGrid, setHasBackgroundGrid] = React.useState(false)
  const [hasTelemetryRuler, setHasTelemetryRuler] = React.useState(false)

  const [previewDataUrl, setPreviewDataUrl] = React.useState<string | null>(null)
  const [isExporting, setIsExporting] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)
  const [isGeneratingNano, setIsGeneratingNano] = React.useState(false)
  const [nanoSuccessMessage, setNanoSuccessMessage] = React.useState<string | null>(null)
  const [nanoErrorMessage, setNanoErrorMessage] = React.useState<string | null>(null)
  const [channelReferences, setChannelReferences] = React.useState<string[]>([])
  const [lockedStyleDna, setLockedStyleDna] = React.useState<any>(null)
  const [previewMode, setPreviewMode] = React.useState<'render' | 'dither' | 'pixel'>('render')
  const [ditherStyle, setDitherStyle] = React.useState<'bayer8' | 'lines' | 'noise'>('bayer8')
  const [keyframeReelMode, setKeyframeReelMode] = React.useState<'spotlight' | 'stagger-matrix'>('spotlight')
  const [pixelDissolveKey, setPixelDissolveKey] = React.useState(0)

  const handleSelectSpatialPoint = (point: SpatialPositionConfig) => {
    setSpatialPoint(point.id)
    setPosition(point.row)
  }

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10
    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100
    setStageTilt({
      rotateX,
      rotateY,
      glareX,
      glareY,
      active: true,
    })
  }

  const handleStageMouseLeave = () => {
    setStageTilt({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      active: false,
    })
  }

  const handleCanvasPlacement = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const clickY = e.clientY - rect.top
    const clickX = e.clientX - rect.left
    const normalizedY = clickY / rect.height
    const normalizedX = clickX / rect.width

    let newRow: ThumbnailTextPosition = 'bottom'
    let newRowName = 'Bottom'
    if (normalizedY < 0.36) {
      newRow = 'top'
      newRowName = 'Top'
    } else if (normalizedY < 0.64) {
      newRow = 'center'
      newRowName = 'Center'
    }

    let colId = 'center'
    let colName = 'Center'
    if (normalizedX < 0.33) {
      colId = 'left'
      colName = 'Left'
    } else if (normalizedX > 0.66) {
      colId = 'right'
      colName = 'Right'
    }

    const pointId =
      newRow === 'center' && colId === 'center'
        ? 'center'
        : (`${newRow}-${colId}` as SpatialPointId)

    setPosition(newRow)
    setSpatialPoint(pointId)
    setCanvasPlacementFeedback({
      x: clickX,
      y: clickY,
      label: `${newRowName} ${colName}`,
    })
    setTimeout(() => setCanvasPlacementFeedback(null), 1200)
  }

  const handleAddReferenceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files.length) return
    const file = files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setChannelReferences((prev) => [...prev.slice(-3), dataUrl])
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveReferenceImage = (idx: number) => {
    setChannelReferences((prev) => prev.filter((_, i) => i !== idx))
  }

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

  const handleCaptureCurrentPlayhead = () => {
    if (!videoElement) return
    const frame = ThumbnailEngine.captureFrameFromVideo(videoElement)
    if (frame) {
      setCandidates((prev) => [frame, ...prev])
      setSelectedFrameIndex(0)
    }
  }

  const handleDownload = () => {
    const activeUrl = previewDataUrl
    if (!activeUrl) return
    const link = document.createElement('a')
    link.href = activeUrl
    link.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_${aspectRatio.replace(':', 'x')}_short_cover.png`
    link.click()
  }

  const handleSaveCover = () => {
    const activeUrl = previewDataUrl
    if (!activeUrl) return
    setIsExporting(true)
    onSaveProjectThumbnail?.(activeUrl)
    setTimeout(() => {
      setIsExporting(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2400)
    }, 450)
  }

  const handleGenerateNanoBanana = async () => {
    if (!candidates.length || selectedFrameIndex >= candidates.length) return
    const activeFrame = candidates[selectedFrameIndex]
    setIsGeneratingNano(true)
    setNanoErrorMessage(null)
    setNanoSuccessMessage(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/thumbnails/nano-banana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameDataUrl: activeFrame.dataUrl,
          headline,
          highlightWord,
          scriptAccent,
          subtitle,
          recipeId: selectedRecipe.id,
          styleId: selectedArchetype.id,
          backgroundId: selectedRecipe.backgroundStyle,
          textTreatmentId: selectedRecipe.textTreatmentStyle,
          proofArtifactId: selectedProofArtifactId,
          directionalId: selectedDirectionalId,
          lightingId: selectedRecipe.lightingStyle,
          brandColor,
          aspectRatio,
          referenceImages: channelReferences,
          lockChannelStyle: channelReferences.length > 0,
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }

      const data = await res.json()
      if (data.styleDna) {
        setLockedStyleDna(data.styleDna)
        if (data.styleDna.colorPalette?.accent) {
          setBrandColor(data.styleDna.colorPalette.accent)
        }
        if (data.styleDna.composition?.textPlacement) {
          setTextLayer(data.styleDna.composition.textPlacement)
        }
      }
      if (data.dataUrl) {
        setPreviewDataUrl(data.dataUrl)
        setNanoSuccessMessage('Synthesized viral cover with Multimodal Nano Banana!')
      } else if (data.styleDna) {
        setNanoSuccessMessage('Channel Style-Lock DNA extracted & applied to studio canvas!')
      }
    } catch (err: any) {
      console.warn('[Nano Banana Generation Failed]', err)
      setNanoErrorMessage(err?.message || 'Nano Banana synthesis failed. Using Canvas engine.')
    } finally {
      setIsGeneratingNano(false)
    }
  }

  if (!isOpen) return null

  const currentDisplayUrl = previewDataUrl

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
              <span className="rounded border border-[#3E5C76]/30 bg-[#3E5C76]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#AFC7DE]">
                Canvas Compositor
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
              <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-1">
                {/* Cinematic Stage Mode Navigation Bar */}
                <div className="z-20 mb-3 flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur-xl shadow-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('render')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all',
                      previewMode === 'render'
                        ? 'bg-white/15 text-white font-semibold shadow-sm'
                        : 'text-white/40 hover:text-white/80',
                    )}
                  >
                    <Sparkles className="size-3 text-[#7ff2d4]" />
                    <span>Compositor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewMode('dither')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all',
                      previewMode === 'dither'
                        ? 'bg-[#7ff2d4]/20 text-[#7ff2d4] font-semibold border border-[#7ff2d4]/40 shadow-sm'
                        : 'text-white/40 hover:text-white/80',
                    )}
                  >
                    <span className="text-[11px] leading-none">〰</span>
                    <span>Dither Wave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode('pixel')
                      setPixelDissolveKey((k) => k + 1)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all',
                      previewMode === 'pixel'
                        ? 'bg-white/15 text-white font-semibold shadow-sm'
                        : 'text-white/40 hover:text-white/80',
                    )}
                  >
                    <span className="text-[11px] leading-none">▦</span>
                    <span>Pixel Matrix</span>
                  </button>

                  {previewMode === 'dither' ? (
                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                      {(['bayer8', 'lines', 'noise'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setDitherStyle(style)}
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase transition-colors',
                            ditherStyle === style
                              ? 'bg-[#7ff2d4]/30 text-[#7ff2d4] font-bold'
                              : 'text-white/40 hover:text-white/70',
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {previewMode === 'pixel' ? (
                    <button
                      type="button"
                      onClick={() => setPixelDissolveKey((k) => k + 1)}
                      className="ml-1 rounded border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white hover:bg-white/20 transition-colors"
                      title="Re-trigger Pixel Dissolve"
                    >
                      Re-Dissolve
                    </button>
                  ) : null}
                </div>

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

                <div className="relative z-10 flex h-full max-h-[500px] w-full items-center justify-center [perspective:1000px]">
                  {currentDisplayUrl ? (
                    <motion.div
                      layout
                      onMouseMove={handleStageMouseMove}
                      onMouseLeave={handleStageMouseLeave}
                      onClick={handleCanvasPlacement}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                      style={{
                        transform: stageTilt.active
                          ? `perspective(1000px) rotateX(${stageTilt.rotateX}deg) rotateY(${stageTilt.rotateY}deg) scale3d(1.02, 1.02, 1.02)`
                          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                        transition: stageTilt.active
                          ? 'transform 75ms ease-out'
                          : 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      className={cn(
                        'relative cursor-crosshair overflow-hidden rounded-xl border border-white/12 bg-black shadow-[0_24px_64px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.06] transition-shadow duration-300 hover:shadow-[0_32px_80px_rgba(0,0,0,0.98)]',
                        activeAspectConfig.cssAspect,
                        aspectRatio === '9:16' || aspectRatio === '9:6' ? 'h-full max-h-[500px] w-auto' : 'w-full max-w-[520px] h-auto',
                      )}
                    >
                      {/* Dynamic Cursor Spotlight Glare Beam */}
                      {stageTilt.active && (
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-30 opacity-75 transition-opacity duration-200"
                          style={{
                            background: `radial-gradient(380px circle at ${stageTilt.glareX}% ${stageTilt.glareY}%, rgba(255,255,255,0.18), transparent 70%)`,
                          }}
                        />
                      )}

                      {/* Interactive Thirds Spatial Guide Lines */}
                      {stageTilt.active && (
                        <div aria-hidden className="pointer-events-none absolute inset-0 z-25 flex flex-col justify-between opacity-30 transition-opacity">
                          <div className="h-1/3 border-b border-dashed border-[#7ff2d4]/50" />
                          <div className="h-1/3 border-b border-dashed border-[#7ff2d4]/50" />
                          <div className="h-1/3" />
                        </div>
                      )}

                      {/* Click Placement Feedback Ripple */}
                      {canvasPlacementFeedback && (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full border border-[#7ff2d4]/70 bg-black/90 px-3 py-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-[#7ff2d4] shadow-[0_0_24px_rgba(127,242,212,0.45)] backdrop-blur-md"
                          style={{ left: canvasPlacementFeedback.x, top: canvasPlacementFeedback.y }}
                        >
                          <span className="size-1.5 rounded-full bg-[#7ff2d4] animate-ping" />
                          <span>Text Anchor: {canvasPlacementFeedback.label}</span>
                        </motion.div>
                      )}

                      {previewMode === 'dither' ? (
                        <DitherReveal
                          key={`dither-${selectedFrameIndex}-${currentDisplayUrl}-${ditherStyle}`}
                          image={currentDisplayUrl}
                          fit="contain"
                          ditherStyle={ditherStyle}
                          dotSize={5}
                          revealRadius={140}
                          revealSoftness={45}
                          wave={true}
                          waveSpeed={80}
                          waveDensity={26}
                          className="size-full"
                        />
                      ) : previewMode === 'pixel' ? (
                        <PixelReveal
                          key={`pixel-${selectedFrameIndex}-${pixelDissolveKey}`}
                          imageSrc={currentDisplayUrl}
                          gridSize={12}
                          edgeHeight={20}
                          transitionColor="#060608"
                          transition={{ type: 'tween', duration: 1.0, ease: 'easeInOut' }}
                          direction="down"
                          objectFit="contain"
                          className="size-full"
                        />
                      ) : (
                        <PixelReveal
                          key={`render-${selectedFrameIndex}-${selectedArchetype.id}-${headline}-${aspectRatio}`}
                          imageSrc={currentDisplayUrl}
                          gridSize={16}
                          edgeHeight={14}
                          transitionColor="#060608"
                          transition={{ type: 'tween', duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                          direction="up"
                          objectFit="contain"
                          className="size-full"
                        />
                      )}

                      <div className="pointer-events-none absolute bottom-2 left-2.5 z-20 flex items-center gap-1.5 rounded bg-black/75 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/70 backdrop-blur-md">
                        <span>{activeAspectConfig.width} × {activeAspectConfig.height}</span>
                        <span className="text-white/30">{'//'}</span>
                        <span style={{ color: brandColor }}>{selectedArchetype.name}</span>
                        <span className="text-white/30">{'//'}</span>
                        <span className="text-[#7ff2d4]">{previewMode.toUpperCase()}</span>
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

              <div className="mt-3 shrink-0 space-y-2 border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Source Keyframes
                    </span>
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-white/40">
                      {candidates.length} Captures
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
                      <button
                        type="button"
                        onClick={() => setKeyframeReelMode('spotlight')}
                        className={cn(
                          'rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors',
                          keyframeReelMode === 'spotlight'
                            ? 'bg-[#7ff2d4]/20 text-[#7ff2d4] font-semibold'
                            : 'text-white/40 hover:text-white/80',
                        )}
                        title="Cinematic Spotlight Ribbon"
                      >
                        Spotlight Ribbon
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeyframeReelMode('stagger-matrix')}
                        className={cn(
                          'rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-colors',
                          keyframeReelMode === 'stagger-matrix'
                            ? 'bg-[#7ff2d4]/20 text-[#7ff2d4] font-semibold'
                            : 'text-white/40 hover:text-white/80',
                        )}
                        title="Staggered Pixel Matrix"
                      >
                        Stagger Matrix
                      </button>
                    </div>

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
                </div>

                {isExtracting ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.01]">
                    <div className="flex items-center gap-2 text-white/40">
                      <Loader2 className="size-4 animate-spin text-[#7ff2d4]" />
                      <span className="font-mono text-xs">Extracting cinematic candidate keyframes…</span>
                    </div>
                  </div>
                ) : keyframeReelMode === 'spotlight' && candidates.length > 0 ? (
                  <div className="relative h-28 w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
                    <SpotlightFrames
                      images={candidates.map((c) => ({ image: c.dataUrl, offsetY: 0 }))}
                      selectedIndex={selectedFrameIndex}
                      onSelectIndex={(idx) => setSelectedFrameIndex(idx)}
                      background="transparent"
                      panels={candidates.length}
                      track={{
                        collapsedWidth: 70,
                        expandedWidth: 260,
                        gap: 4,
                      }}
                      panel={{
                        height: 104,
                        radius: 8,
                        dim: 4,
                      }}
                      selector={{
                        box: true,
                        lines: true,
                        lineLength: 70,
                        thickness: 2,
                        color: '#7ff2d4',
                        reticle: true,
                        spotlight: true,
                      }}
                      enableCursorSpotlight={true}
                      enableParallaxTilt={true}
                      entrance={{
                        animate: true,
                        duration: 0.6,
                        stagger: 0.04,
                      }}
                      trigger="hover"
                      renderOverlay={(idx, isOpen) => {
                        const candidate = candidates[idx]
                        if (!candidate) return null
                        return (
                          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1.5">
                            <div className="flex items-center justify-between">
                              <span className="rounded bg-black/85 px-1.5 py-0.5 font-mono text-[8px] text-white/80 backdrop-blur-md">
                                {candidate.timecode}
                              </span>
                              {isOpen && (
                                <span className="rounded border border-[#7ff2d4]/40 bg-[#7ff2d4]/20 px-1.5 py-0.5 font-mono text-[7px] font-semibold text-[#7ff2d4] backdrop-blur-md">
                                  FRAME #{idx + 1}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      }}
                    />
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
                            'group relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border transition-all duration-200',
                            isSelected
                              ? 'border-[#7ff2d4] ring-2 ring-[#7ff2d4]/50 shadow-[0_0_12px_rgba(127,242,212,0.25)]'
                              : 'border-white/10 opacity-70 hover:border-white/30 hover:opacity-100',
                          )}
                        >
                          <PixelReveal
                            imageSrc={candidate.dataUrl}
                            gridSize={8}
                            edgeHeight={12}
                            transitionColor="#060608"
                            transition={{ type: 'tween', duration: 0.8, ease: 'easeInOut' }}
                            direction="up"
                            staggerDelay={idx * 0.12}
                            alt={`Candidate at ${candidate.timecode}`}
                            className="size-full"
                          />
                          <span className="absolute bottom-1 right-1 z-10 rounded bg-black/80 px-1 py-0.2 font-mono text-[8px] text-white/70">
                            {candidate.timecode}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 left-1 z-10 size-2 rounded-full bg-[#7ff2d4] shadow-[0_0_8px_#7ff2d4]" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-between overflow-y-auto p-5 lg:col-span-5 lg:p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Nano Banana Studio
                      </h3>
                    </div>
                    <p className="mt-0.5 text-[10px] text-white/40">
                      High-conversion AI thumbnails conditioned on your video frame
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
                    Multimodal v2.5
                  </span>
                </div>

                {/* STEP 1: HOOK & POWER WORD */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      1. Hook Headline & Power Word
                    </span>
                    <span className="font-mono text-[9px] text-white/30">
                      Click word to highlight
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => {
                        const val = e.target.value
                        setHeadline(val)
                        const words = val.trim().split(/\s+/)
                        if (words.length > 0 && !words.includes(highlightWord)) {
                          setHighlightWord(words[words.length - 1])
                        }
                      }}
                      placeholder="e.g. EASY MODE or Control your MIND"
                      className="w-full rounded-xl border border-white/[0.12] bg-black/60 px-3.5 py-2 text-xs font-semibold text-white placeholder:text-white/25 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>

                  {/* Word-by-word Click-to-Highlight Chips */}
                  {headline.trim() ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-white/40 mr-1">Highlight:</span>
                      {headline
                        .trim()
                        .split(/\s+/)
                        .map((w, idx) => {
                          const cleanW = w.replace(/[^a-zA-Z0-9$]/g, '')
                          const isHighlighted =
                            highlightWord.toLowerCase() === cleanW.toLowerCase() ||
                            highlightWord.toLowerCase() === w.toLowerCase()
                          return (
                            <button
                              key={`${w}-${idx}`}
                              type="button"
                              onClick={() => setHighlightWord(isHighlighted ? '' : w)}
                              className={cn(
                                'rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-all',
                                isHighlighted
                                  ? 'bg-[#FFE600] text-black shadow-[0_0_12px_rgba(255,230,0,0.5)] scale-105'
                                  : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.1] hover:text-white',
                              )}
                            >
                              {w}
                            </button>
                          )
                        })}
                    </div>
                  ) : null}

                  {/* Highlight Color Swatches */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-mono text-white/35">Style:</span>
                    {[
                      { id: '#FFE600', label: 'Safety Yellow' },
                      { id: '#7FF2D4', label: 'Neon Mint' },
                      { id: '#2563EB', label: 'Cobalt Pill' },
                      { id: '#EF4444', label: 'Crimson' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setHighlightColor(col.id)
                          setBrandColor(col.id)
                        }}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono border transition-all',
                          highlightColor === col.id
                            ? 'border-white bg-white/10 text-white font-semibold'
                            : 'border-white/10 text-white/40 hover:text-white/70',
                        )}
                      >
                        <span className="size-2 rounded-full" style={{ backgroundColor: col.id }} />
                        <span>{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 2: VIRAL RECIPES */}
                <div className="space-y-2 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                      2. Viral Archetype Recipe
                    </span>
                    <span className="font-mono text-[9px] text-amber-300/80">
                      {selectedRecipe.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {VIRAL_THUMBNAIL_RECIPES.map((recipe) => {
                      const isSelected = selectedRecipe.id === recipe.id
                      return (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => handleSelectRecipe(recipe)}
                          className={cn(
                            'group flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all',
                            isSelected
                              ? 'border-amber-400/50 bg-amber-500/[0.08] shadow-[0_0_16px_rgba(251,191,36,0.12)]'
                              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-white">
                              {recipe.name}
                            </span>
                            <span className="rounded bg-white/[0.05] px-1 py-0.2 font-mono text-[8px] text-white/40">
                              {recipe.aspectRatio}
                            </span>
                          </div>
                          <span className="line-clamp-2 text-[9px] leading-relaxed text-white/50">
                            {recipe.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* STEP 3: PROOF ARTIFACT & DIRECTIONAL POINTER */}
                <div className="space-y-2.5 border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                    3. Proof Artifact & Directional Cue
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Proof Artifact Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-white/40">
                        Proof Artifact / Prop
                      </label>
                      <select
                        value={selectedProofArtifactId}
                        onChange={(e) => setSelectedProofArtifactId(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.1] bg-black/80 px-2 py-1.5 text-xs text-white focus:border-amber-400/50 focus:outline-none"
                      >
                        {Object.values(PROOF_ARTIFACT_SNIPPETS).map((snip) => (
                          <option key={snip.id} value={snip.id} className="bg-neutral-900 text-white">
                            {snip.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Directional Pointer Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-white/40">
                        Directional Pointer
                      </label>
                      <select
                        value={selectedDirectionalId}
                        onChange={(e) => setSelectedDirectionalId(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.1] bg-black/80 px-2 py-1.5 text-xs text-white focus:border-amber-400/50 focus:outline-none"
                      >
                        {Object.values(DIRECTIONAL_SNIPPETS).map((snip) => (
                          <option key={snip.id} value={snip.id} className="bg-neutral-900 text-white">
                            {snip.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* STEP 4: HERO NANO BANANA SYNTHESIZER */}
                <div className="space-y-2 border-t border-white/[0.06] pt-3">
                  <button
                    type="button"
                    onClick={handleGenerateNanoBanana}
                    disabled={isGeneratingNano || !candidates.length}
                    className="relative group flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-amber-500/25 py-3 text-xs font-bold text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.18)] transition-all hover:border-amber-400/70 hover:from-amber-500/35 hover:to-orange-500/35 hover:shadow-[0_0_32px_rgba(251,191,36,0.28)] disabled:opacity-50"
                  >
                    {isGeneratingNano ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-amber-300" />
                        <span>Synthesizing with Nano Banana…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 text-amber-300 animate-pulse" />
                        <span>SYNTHESIZE WITH NANO BANANA</span>
                      </>
                    )}
                  </button>

                  {nanoSuccessMessage ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] text-emerald-300"
                    >
                      <Check className="size-3.5 shrink-0 text-emerald-400" />
                      <span>{nanoSuccessMessage}</span>
                    </motion.div>
                  ) : null}

                  {nanoErrorMessage ? (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-300">
                      {nanoErrorMessage}
                    </div>
                  ) : null}

                  {/* Collapsible Channel References Drawer */}
                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                        Channel Style-Lock ({channelReferences.length} refs)
                      </span>
                      <label className="flex cursor-pointer items-center gap-1 font-mono text-[9px] text-amber-300 hover:text-amber-200 transition-colors">
                        <Plus className="size-3" />
                        <span>Add Ref</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAddReferenceImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {channelReferences.length > 0 ? (
                      <div className="flex gap-1.5 overflow-x-auto pt-2 [scrollbar-width:none]">
                        {channelReferences.map((refImg, idx) => (
                          <div
                            key={idx}
                            className="group relative size-10 shrink-0 overflow-hidden rounded border border-white/20 bg-black"
                          >
                            <img src={refImg} alt={`Ref ${idx}`} className="size-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveReferenceImage(idx)}
                              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Trash2 className="size-3 text-rose-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Bottom Action Row */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/85 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
                >
                  <Download className="size-3.5" />
                  Download PNG
                </button>

                <LiquidCarveButton
                  label={savedSuccess ? 'Cover Saved' : 'Save Project Cover'}
                  onClick={handleSaveCover}
                  disabled={isExporting}
                  colors={{
                    fill: '#ffffff',
                    textColor: '#000000',
                  }}
                  blob={{
                    color: '#7ff2d4',
                    size: 44,
                    smoothness: 60,
                  }}
                  padding="8px 16px"
                  rounded={12}
                  font={{
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: '0.02em',
                  }}
                  addIcon={true}
                  icon={{
                    type: 'symbol',
                    symbol: savedSuccess ? '✓' : '✦',
                    color: '#000000',
                    size: 13,
                    side: 'left',
                  }}
                  className="w-full shadow-md"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
