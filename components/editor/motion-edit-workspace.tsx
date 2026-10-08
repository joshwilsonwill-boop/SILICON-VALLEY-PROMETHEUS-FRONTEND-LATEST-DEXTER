'use client'

import * as React from 'react'
import {
  Captions,
  Check,
  CircleDot,
  Contrast,
  Crop,
  Download,
  Edit3,
  Film,
  Filter,
  Flame,
  Frame,
  GripHorizontal,
  Grid2X2,
  Info,
  Layers,
  Loader2,
  Maximize2,
  Monitor,
  Music,
  Pause,
  PanelBottomClose,
  PanelBottomOpen,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Scissors,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { motionCropTransform } from '@/lib/editor/motion-framing'
import { StyleCloneCard } from '@/components/editor/style-clone-card'
import { ReferenceCaptionOverlay } from '@/components/editor/reference-caption-overlay'
import { referencePreviewAt, type AppliedReferenceStyle } from '@/lib/editor/reference-style'
import { editorialMovementScaleAt } from '@/lib/editor/editorial-timeline-state'
import { applyReferenceStyleToController } from '@/lib/voice-companion/reference-controls'
import { getEditorialTimelineController } from '@/lib/editor/editorial-timeline-client'
import { useAutonomousStore } from '@/lib/autonomous-ui/autonomous-store'
import type { EditorCaptionStyle } from '@/lib/editor-actions'
import type {EditorialReadiness} from '@/lib/editor/editorial-readiness'
import type {EditorialCleanupRun} from '@/lib/editor/editorial-run'
import { MotionSoundtrackTrack } from '@/components/editor/motion/motion-soundtrack-track'
import { EditorialTimelineTracks } from '@/components/editor/editorial-timeline-tracks'
import { EditorialTimelineViewport } from '@/components/editor/editorial-timeline-viewport'
import { EditorialAudioPreview } from '@/components/editor/editorial-audio-preview'
import { EditorialSyncStatus } from '@/components/editor/editorial-sync-status'
import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'
import type { MusicRecommendation } from '@/lib/types'

type PreviewMediaKind = 'video' | 'image'
type MotionToolId = 'enhance' | 'captions' | 'media' | 'layout'
type PreviewTreatment = 'clean' | 'contrast' | 'warm' | 'mono'
type CropRect = { left: number; top: number; width: number; height: number }

export type MotionTranscriptWord = {
  text: string
  start: number
  end: number
  isCut?: boolean
}

export type MotionTranscriptSegment = {
  id: string
  start: number
  end: number
  text: string
  emphasis?: string[]
  isCut?: boolean
  words?: MotionTranscriptWord[]
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
  captionStyle?: EditorCaptionStyle
  onUpdateTranscriptSegment?: (segmentId: string, nextText: string) => void
  onToggleCutSegment?: (segmentId: string) => void
  onToggleCutWord?: (segmentId: string, wordIndex: number) => void
  cutRanges?: { start: number; end: number }[]
  onCutRangesChange?: (ranges: { start: number; end: number }[]) => void
  editorialReadiness?: EditorialReadiness | null
  editorialCleanupRun?: EditorialCleanupRun | null
  onApplySuggestedSilenceCuts?: (ranges: { start: number; end: number }[]) => void
  onRequestTranscribe?: () => void
  isTranscribing?: boolean
  transcriptError?: string | null
  isSourceUploading?: boolean
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
  selectedMusicTrack?: MusicRecommendation | null
  onSelectMusicTrack?: (track: MusicRecommendation) => void
  onOpenMusicCatalog?: () => void
  soundtrackVolume?: number
  onSoundtrackVolumeChange?: (volume: number) => void
  soundtrackMuted?: boolean
  onSoundtrackMutedChange?: (muted: boolean) => void
  soundtrackDucking?: boolean
  onSoundtrackDuckingChange?: (enabled: boolean) => void
  onRemoveMusicTrack?: () => void
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

const TREATMENTS: { id: PreviewTreatment; label: string; filter: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'clean', label: 'Clean', filter: 'none', icon: Sparkles },
  { id: 'contrast', label: 'Contrast', filter: 'contrast(1.12) saturate(1.08)', icon: Contrast },
  { id: 'warm', label: 'Warm', filter: 'sepia(.15) saturate(1.12) contrast(1.04)', icon: Flame },
  { id: 'mono', label: 'Mono', filter: 'grayscale(1) contrast(1.12)', icon: CircleDot },
]

const DEFAULT_CROP_RECT: CropRect = { left: 0, top: 0, width: 100, height: 100 }
const DEFAULT_TIMELINE_HEIGHT = 252
const MIN_TIMELINE_HEIGHT = 112
const MAX_TIMELINE_HEIGHT_ARIA = 1000
const TIMELINE_HEADER_COLLAPSE_DISTANCE = 64
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

function HighlightedTranscript({
  segment,
  active,
  onToggleCutWord,
}: {
  segment: MotionTranscriptSegment
  active: boolean
  onToggleCutWord?: (wordIndex: number, e: React.MouseEvent) => void
}) {
  const emphasis = segment.emphasis ?? []
  const isSegmentCut = Boolean(segment.isCut)

  if (segment.words && segment.words.length > 0) {
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-x-1 gap-y-0.5', isSegmentCut && 'opacity-55')}>
        {segment.words.map((w, index) => {
          const isWordCut = isSegmentCut || Boolean(w.isCut)
          const normalized = w.text.trim().replace(/[.,!?]/g, '').toLowerCase()
          const emphasized = emphasis.some((item) => item.toLowerCase().includes(normalized) && normalized.length > 2)

          return (
            <span
              key={`${w.text}-${index}`}
              data-word-index={index}
              data-word-text={w.text}
              onClick={(e) => {
                if (onToggleCutWord) {
                  e.stopPropagation()
                  onToggleCutWord(index, e)
                }
              }}
              title={isWordCut ? 'Word cut from video (click to restore)' : 'Click to cut this word from the video'}
              className={cn(
                'relative inline-block rounded px-1 py-0.5 transition-all text-[15px]',
                isWordCut
                  ? 'line-through text-red-400/60 bg-red-950/30 decoration-red-400/80 decoration-2 cursor-pointer hover:text-red-300 hover:bg-red-900/40'
                  : emphasized && active
                    ? 'text-[#b4fb60] font-semibold bg-[#98f237]/10'
                    : active
                      ? 'text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5 cursor-pointer',
              )}
            >
              {w.text}
            </span>
          )
        })}
      </span>
    )
  }

  const words = segment.text.split(/(\s+)/)
  return (
    <span className={cn(isSegmentCut && 'line-through text-red-400/60 decoration-red-400/80')}>
      {words.map((word, index) => {
        const normalized = word.trim().replace(/[.,!?]/g, '').toLowerCase()
        const emphasized = emphasis.some((item) => item.toLowerCase().includes(normalized) && normalized.length > 2)
        return (
          <span
            key={`${word}-${index}`}
            className={cn(
              emphasized && active ? 'text-[#b4fb60]' : active ? 'text-white' : 'text-white/52',
            )}
          >
            {word}
          </span>
        )
      })}
    </span>
  )
}

export function MotionEditWorkspace({
  projectTitle, previewUrl, previewKind, hasPreviewMedia, sourceLabel, previewAspectRatio, fitMode,
  onFitModeChange, objectFit, mediaTransformStyle, currentTimeLabel, durationLabel, currentTimeSec,
  durationSec, previewPlaying, previewMuted, onPreviewMutedChange, videoRef, transcriptSegments, captionStyle,
  onUpdateTranscriptSegment, onToggleCutSegment, onToggleCutWord, cutRanges, onCutRangesChange, editorialReadiness, editorialCleanupRun, onApplySuggestedSilenceCuts, onRequestTranscribe, isTranscribing = false, transcriptError = null, isSourceUploading = false, videoMetadata,
  onTogglePlayback, onPickSource, onSourceDrop, onSourceDragOver, onSourceDragLeave, isSourceDragOver = false,
  textPlacements, onSeek, onVideoLoadedMetadata, onVideoLoadedData, onVideoCanPlay,
  onVideoTimeUpdate, onVideoEnded, onVideoPlay, onVideoPause, onVideoError, onImageLoaded, onApplyPrompt,
  selectedMusicTrack: parentSelectedMusicTrack = null, onSelectMusicTrack, onOpenMusicCatalog, soundtrackVolume: parentSoundtrackVolume = 0.5, onSoundtrackVolumeChange: parentVolumeChange, soundtrackMuted: parentSoundtrackMuted = false, onSoundtrackMutedChange: parentMutedChange, soundtrackDucking: parentSoundtrackDucking = true, onSoundtrackDuckingChange: parentDuckingChange, onRemoveMusicTrack,
}: MotionEditWorkspaceProps) {
  const editorial = useEditorialTimeline()
  const patchEditorial = editorial.patch
  const selectedMusicTrack = editorial.timeline?.music?.track ?? parentSelectedMusicTrack
  const soundtrackVolume = editorial.timeline?.music?.volume ?? parentSoundtrackVolume
  const soundtrackMuted = editorial.timeline?.music?.muted ?? parentSoundtrackMuted
  const soundtrackDucking = editorial.timeline?.music?.ducking ?? parentSoundtrackDucking
  const [audioError, setAudioError] = React.useState<string | null>(null)
  const onSoundtrackVolumeChange = React.useCallback((volume: number) => {
    parentVolumeChange?.(volume)
    editorial.patch({ type: 'mix', volume })
  }, [editorial.patch, parentVolumeChange])
  const onSoundtrackMutedChange = React.useCallback((muted: boolean) => {
    parentMutedChange?.(muted)
    editorial.patch({ type: 'mix', muted })
  }, [editorial.patch, parentMutedChange])
  const onSoundtrackDuckingChange = React.useCallback((enabled: boolean) => {
    parentDuckingChange?.(enabled)
    editorial.patch({ type: 'mix', ducking: enabled })
  }, [editorial.patch, parentDuckingChange])
  React.useEffect(() => {
    if (editorial.timeline?.music) {
      if (parentSoundtrackVolume !== soundtrackVolume) parentVolumeChange?.(soundtrackVolume)
      if (parentSoundtrackMuted !== soundtrackMuted) parentMutedChange?.(soundtrackMuted)
      if (parentSoundtrackDucking !== soundtrackDucking) parentDuckingChange?.(soundtrackDucking)
    }
  }, [editorial.timeline?.music, parentSoundtrackVolume, parentSoundtrackMuted, parentSoundtrackDucking, soundtrackVolume, soundtrackMuted, soundtrackDucking, parentVolumeChange, parentMutedChange, parentDuckingChange])
  const audioEffects = React.useMemo(() => editorial.timeline?.effects ?? [], [editorial.timeline?.effects])
  const referenceStyle = editorial.timeline?.referenceStyle
  const referencePreview = referencePreviewAt(referenceStyle, currentTimeSec)
  const editorialCues = React.useMemo(() => [...(editorial.timeline?.cues ?? []), ...(referenceStyle?.zooms ?? []).map(cue => ({
    id: cue.id, type: 'movement' as const, start: cue.start, end: cue.end,
    title: `Reference ${cue.kind} zoom (${cue.scale.toFixed(2)}x)`, origin: 'editor' as const,
  }))], [editorial.timeline?.cues, referenceStyle])
  const updateEditorialCues = React.useCallback((cues: typeof editorialCues) => {
    patchEditorial({ type: 'cues', cues: cues.filter(cue => !referenceStyle?.zooms.some(zoom => zoom.id === cue.id)) })
    if (referenceStyle) {
      const zooms = referenceStyle.zooms.flatMap(zoom => {
        const updated = cues.find(cue => cue.id === zoom.id)
        return updated ? [{ ...zoom, start: updated.start, end: updated.end }] : []
      })
      patchEditorial({ type: 'reference_style', style: { ...referenceStyle, zooms } })
    }
  }, [patchEditorial, referenceStyle])
  const resolvedSegments = React.useMemo(() => {
    return Array.isArray(transcriptSegments) ? transcriptSegments : []
  }, [transcriptSegments])

  const [activeTool, setActiveTool] = React.useState<MotionToolId>('layout')
  const [zoom, setZoom] = React.useState(1)
  const [showTimeline, setShowTimeline] = React.useState(true)
  const [timelineHeight, setTimelineHeight] = React.useState(DEFAULT_TIMELINE_HEIGHT)
  const [cropEnabled, setCropEnabled] = React.useState(true)
  const [cropRect, setCropRect] = React.useState<CropRect>(DEFAULT_CROP_RECT)
  const [frameAspectRatio, setFrameAspectRatio] = React.useState<number | null>(null)
  React.useEffect(() => {
    setFrameAspectRatio(null)
    setCropRect(DEFAULT_CROP_RECT)
  }, [previewUrl])
  const [captionsVisible, setCaptionsVisible] = React.useState(false)
  const [captionsOverride, setCaptionsOverride] = React.useState<boolean | null>(null)
  const [treatment, setTreatment] = React.useState<PreviewTreatment>('clean')
  const [transcriptQuery, setTranscriptQuery] = React.useState('')
  const [activeOnly, setActiveOnly] = React.useState(false)
  const [showMetadata, setShowMetadata] = React.useState(false)
  const [transcriptActionMessage, setTranscriptActionMessage] = React.useState<string | null>(null)
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
  const safeAspectRatio = frameAspectRatio ?? (Number.isFinite(previewAspectRatio) && previewAspectRatio > 0 ? previewAspectRatio : 16 / 9)
  const visibleSegments = resolvedSegments.filter((segment) => {
    const query = transcriptQuery.trim().toLowerCase()
    const matchesQuery = query === '' || segment.text.toLowerCase().includes(query)
    return matchesQuery && (!activeOnly || isActiveSegment(segment, currentTimeSec))
  })
  const activeTreatment = TREATMENTS.find((item) => item.id === (referenceStyle?.treatment ?? treatment)) ?? TREATMENTS[0]
  const timelineCaptionStyle = editorial.timeline?.captionStyle
  const effectiveCaptionsVisible = referenceStyle
    ? referenceStyle.captionStyle !== 'none'
    : captionsOverride ?? (captionsVisible || Boolean(timelineCaptionStyle))
  const effectiveCaptionStyle = referenceStyle?.captionStyle === 'none' ? undefined : referenceStyle?.captionStyle ?? timelineCaptionStyle ?? captionStyle ?? 'clean_bold'
  const planMovementScale = editorialMovementScaleAt(editorial.timeline?.cues, currentTimeSec)
  const previewScale = referencePreview.scale * planMovementScale
  const referenceMediaStyle = {
    ...mediaTransformStyle,
    ...(referenceStyle || planMovementScale !== 1 ? { transform: `${mediaTransformStyle?.transform ?? ''} scale(${previewScale})`.trim() } : {}),
    filter: referenceStyle ? referencePreview.filter : activeTreatment.filter,
    objectFit: fitMode === 'fill' ? 'cover' as const : 'contain' as const,
  }
  const applyReference = React.useCallback(async (style: AppliedReferenceStyle) => {
    const store = useAutonomousStore.getState()
    const action = store.beginAction({ label: 'Applying reference look', targetLabel: 'Motion preview' })
    const rect = workspaceRef.current?.getBoundingClientRect()
    if (rect) store.setActionTarget(action, rect)
    const result = await applyReferenceStyleToController(getEditorialTimelineController(editorial.projectId), style)
    useAutonomousStore.getState().finishAction(action, { status: result.success ? 'succeeded' : 'failed', summary: result.summary, affectedCount: result.affectedCount })
    return result
  }, [editorial.projectId])
  React.useEffect(() => {
    const hasPlanMovement = editorial.timeline?.cues.some((cue) => cue.type === 'movement' && cue.context?.source === 'jarvis_editorial_plan')
    if ((!referenceStyle?.zooms.length && !hasPlanMovement) || !previewPlaying) return
    let frame = 0
    const update = () => {
      const video = (videoRef as React.RefObject<HTMLVideoElement>)?.current
      if (video) {
        const referenceScale = referencePreviewAt(referenceStyle, video.currentTime).scale
        const movementScale = editorialMovementScaleAt(editorial.timeline?.cues, video.currentTime)
        video.style.transform = `${mediaTransformStyle?.transform ?? ''} scale(${referenceScale * movementScale})`.trim()
      }
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [editorial.timeline?.cues, referenceStyle, previewPlaying, videoRef, mediaTransformStyle?.transform])

  const effectiveCutRanges = React.useMemo(() => {
    const ranges: { start: number; end: number }[] = [...(cutRanges ?? [])]
    for (const segment of resolvedSegments) {
      if (segment.isCut) {
        ranges.push({ start: segment.start, end: segment.end })
      } else if (segment.words && segment.words.length > 0) {
        for (const word of segment.words) {
          if (word.isCut) {
            ranges.push({ start: word.start, end: word.end })
          }
        }
      }
    }
    if (ranges.length <= 1) return ranges
    ranges.sort((a, b) => a.start - b.start)
    const merged: { start: number; end: number }[] = [ranges[0]!]
    for (let i = 1; i < ranges.length; i++) {
      const prev = merged[merged.length - 1]!
      const curr = ranges[i]!
      if (curr.start <= prev.end + 0.05) {
        prev.end = Math.max(prev.end, curr.end)
      } else {
        merged.push(curr)
      }
    }
    return merged
  }, [cutRanges, resolvedSegments])

  const totalCutSeconds = React.useMemo(() => {
    return effectiveCutRanges.reduce((sum, r) => sum + (r.end - r.start), 0)
  }, [effectiveCutRanges])

  React.useEffect(() => {
    if (!previewPlaying || effectiveCutRanges.length === 0) return
    let animId: number
    const checkSkip = () => {
      const video = (videoRef as React.RefObject<HTMLVideoElement>)?.current
      if (video && !video.paused) {
        const ct = video.currentTime
        for (const range of effectiveCutRanges) {
          if (ct >= range.start - 0.04 && ct < range.end - 0.02) {
            video.currentTime = range.end + 0.01
            break
          }
        }
      }
      animId = requestAnimationFrame(checkSkip)
    }
    animId = requestAnimationFrame(checkSkip)
    return () => cancelAnimationFrame(animId)
  }, [effectiveCutRanges, previewPlaying, videoRef])

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
    if (event.target instanceof Element && event.target.closest('button, input')) return
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

  // Spend the first part of an upward timeline resize on making room for the
  // preview. Once the framing row has folded away, the timeline can cover it.
  const headerCollapseProgress = showTimeline
    ? Math.min(1, Math.max(0, (timelineHeight - DEFAULT_TIMELINE_HEIGHT) / TIMELINE_HEADER_COLLAPSE_DISTANCE))
    : 0
  const framingCollapseProgress = activeTool === 'layout' ? headerCollapseProgress : 0

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
  const handlePickSource = React.useCallback(() => {
    if (typeof onPickSource === 'function') {
      onPickSource()
    } else if (typeof document !== 'undefined') {
      const fallbackInput = document.getElementById('editor-source-file-input') as HTMLInputElement | null
      if (fallbackInput) {
        fallbackInput.value = ''
        fallbackInput.click()
      }
    }
  }, [onPickSource])

  const selectTool = (tool: MotionToolId) => {
    setActiveTool(tool)
    if (tool === 'media') handlePickSource()
    if (tool === 'captions') { setCaptionsVisible(true); setCaptionsOverride(true) }
  }

  const applyTreatment = (nextTreatment: PreviewTreatment) => {
    setTreatment(nextTreatment)
    if (referenceStyle) editorial.patch({ type: 'reference_style', style: { ...referenceStyle, treatment: nextTreatment } })
  }

  const renderMedia = () => hasPreviewMedia ? (
    previewKind === 'image' ? (
      <div className="h-full w-full" style={{ transform: motionCropTransform(cropRect) }}><img src={previewUrl} alt={projectTitle} onLoad={onImageLoaded} className="h-full w-full bg-black object-center" style={referenceMediaStyle} /></div>
    ) : (
      <div className="h-full w-full" style={{ transform: motionCropTransform(cropRect) }}><video key={previewUrl} ref={videoRef} src={previewUrl} className="h-full w-full bg-black object-center" muted={previewMuted} playsInline controls={false} preload="metadata" onLoadedMetadata={onVideoLoadedMetadata} onLoadedData={onVideoLoadedData} onCanPlay={onVideoCanPlay} onTimeUpdate={onVideoTimeUpdate} onEnded={onVideoEnded} onPlay={onVideoPlay} onPause={onVideoPause} onError={onVideoError} style={referenceMediaStyle} /></div>
    )
  ) : (
    <button type="button" onClick={handlePickSource} className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(152,242,55,0.1),transparent_38%)] text-sm text-white/66 transition-colors hover:text-white"><span className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-black/45 px-4 py-2.5"><Upload className="size-4" /> Choose source media</span></button>
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.035)_0_1px,transparent_1.2px)] bg-[length:7px_7px] opacity-[0.28]" aria-hidden="true" />
      {isSourceDragOver ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm" aria-hidden="true">
          <span className="inline-flex items-center gap-2 rounded-md border border-[#98f237]/45 bg-[#0a0d08] px-5 py-3 text-sm text-[#b4fb60] shadow-[0_0_40px_rgba(152,242,55,0.22)]"><Upload className="size-4" /> Drop source video to replace media</span>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside data-motion-panel="transcript" className="hidden w-[clamp(250px,24vw,340px)] shrink-0 flex-col border-r border-white/10 xl:flex">
          <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-white/8 px-4">
            <span className="text-sm font-medium">Transcript</span>
            <span className="rounded bg-[#98f237]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#b4fb60]">Prometheus AI</span>
            {totalCutSeconds > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-medium text-red-400" title="Video duration trimmed via transcript cuts">
                <Scissors className="size-2.5" /> -{totalCutSeconds.toFixed(1)}s
              </span>
            ) : null}
            {onRequestTranscribe ? (
              <button
                type="button"
                onClick={onRequestTranscribe}
                disabled={isTranscribing || isSourceUploading}
                className="inline-flex items-center gap-1 rounded bg-white/[0.08] px-2 py-1 text-[10px] text-white/70 hover:bg-white/[0.14] hover:text-white disabled:opacity-40"
                title={isSourceUploading ? 'Source media is saving' : 'Create a new transcript from the source video'}
              >
                {isTranscribing || isSourceUploading ? <Loader2 className="size-3 animate-spin text-[#98f237]" /> : <RefreshCw className="size-3" />}
                <span>Retranscribe</span>
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
            {transcriptError && !isTranscribing && visibleSegments.length === 0 ? (
              <div className="mb-4 rounded-md border border-amber-300/25 bg-amber-300/[0.07] p-3 text-xs" role="alert">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Transcript paused</p>
                    <p className="mt-1 leading-5 text-white/58">{transcriptError}</p>
                  </div>
                  {onRequestTranscribe ? (
                    <button
                      type="button"
                      onClick={onRequestTranscribe}
                      className="shrink-0 rounded-md border border-white/12 px-2.5 py-1.5 font-medium text-white/76 transition-colors hover:bg-white/8 hover:text-white"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isTranscribing ? (
              <div className="mb-4 rounded-lg border border-[#98f237]/30 bg-[#98f237]/10 p-3.5 text-xs shadow-[0_0_20px_rgba(152,242,55,0.15)]">
                <div className="flex items-center gap-2 text-[#b4fb60]">
                  <Loader2 className="size-4 animate-spin shrink-0 text-[#98f237]" />
                  <span className="font-semibold text-white">Transcribing with Prometheus AI...</span>
                </div>
                <div className="mt-1 text-[11px] text-white/65">Streaming speech analysis and aligning word timestamps.</div>
                <div className="mt-2.5 flex items-center gap-1">
                  <span className="h-1 flex-1 animate-pulse rounded-full bg-[#98f237]/40" />
                  <span className="h-1 flex-1 animate-pulse rounded-full bg-[#98f237]/70 [animation-delay:150ms]" />
                  <span className="h-1 flex-1 animate-pulse rounded-full bg-[#98f237] [animation-delay:300ms]" />
                  <span className="h-1 flex-1 animate-pulse rounded-full bg-[#98f237]/60 [animation-delay:450ms]" />
                </div>
              </div>
            ) : null}

            {editorialReadiness ? (
              <section className="mb-4 border border-[#98f237]/25 bg-[#98f237]/[0.06] p-3 text-xs" aria-label="Source assessment">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">Source assessment</p>
                    <p className="mt-1 leading-5 text-white/64">
                      {editorialReadiness.summary ?? `${editorialReadiness.transcriptSegmentCount} aligned transcript segments and ${editorialReadiness.motionSegmentCount} motion regions are ready for review.`}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[#b4fb60]">READY</span>
                </div>
                {editorialReadiness.recommendations.slice(0, 2).map((recommendation) => (
                  <button
                    key={recommendation.id}
                    type="button"
                    onClick={() => recommendation.startSec !== null && onSeek(recommendation.startSec)}
                    disabled={recommendation.startSec === null}
                    className="mt-2 block w-full border-l-2 border-[#98f237]/60 bg-black/20 px-2 py-1.5 text-left text-white/76 transition-colors hover:bg-white/[0.06] disabled:cursor-default disabled:hover:bg-black/20"
                    title={recommendation.startSec === null ? recommendation.title : `Review at ${formatTime(recommendation.startSec)}`}
                  >
                    <span className="font-medium text-white">{recommendation.title}</span>
                    {recommendation.rationale ? <span className="mt-0.5 block text-white/54">{recommendation.rationale}</span> : null}
                  </button>
                ))}
                {editorialReadiness.silenceAssessment === 'suggested' ? (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                    <p className="leading-5 text-amber-200/90">{editorialReadiness.silenceCuts.length} transcript-aligned pause{editorialReadiness.silenceCuts.length === 1 ? '' : 's'} highlighted on the timeline.</p>
                    <button
                      type="button"
                      onClick={() => onApplySuggestedSilenceCuts?.(editorialReadiness.silenceCuts)}
                      className="inline-flex shrink-0 items-center gap-1.5 border border-amber-400/45 bg-amber-400/10 px-2.5 py-1.5 font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
                    >
                      <Scissors className="size-3.5" /> Apply cuts
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-white/10 pt-2.5 leading-5 text-white/58">
                    {editorialReadiness.silenceAssessment === 'none'
                      ? 'No transcript-aligned pauses meet the cut threshold. No timeline cuts were proposed.'
                      : 'Transcript timing was not available, so no silence cuts were proposed.'}
                  </p>
                )}
              </section>
            ) : null}

            {editorialCleanupRun ? (
              <section className="mb-4 border border-cyan-300/25 bg-cyan-300/[0.05] p-3 text-xs" aria-label="Autonomous cleanup run">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">Autonomous cleanup</p>
                  <span className="font-mono text-[10px] text-cyan-200">{editorialCleanupRun.status === 'ready' ? 'COMPLETE' : 'WAITING'}</span>
                </div>
                <p className="mt-1 leading-5 text-white/60">{editorialCleanupRun.reason ?? 'Applied only the timeline changes supported by transcript timing.'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {editorialCleanupRun.steps.map((step) => (
                    <span key={step.id} className={cn('border px-1.5 py-1 text-[10px]', step.state === 'complete' ? 'border-cyan-200/25 bg-cyan-200/[0.08] text-cyan-100' : 'border-white/10 text-white/42')}>
                      {step.label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <div role="group" aria-label="Transcript actions" className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  const targetSegment = activeSegment ?? visibleSegments.find((s) => !s.isCut) ?? visibleSegments[0]
                  if (targetSegment) onToggleCutSegment?.(targetSegment.id)
                }}
                disabled={!onToggleCutSegment || visibleSegments.length === 0}
                className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[10px] font-medium text-white/58 transition-colors hover:border-white/[0.13] hover:bg-white/[0.075] hover:text-white/82 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35"
                title="Remove the next visible transcript segment"
              >
                <Volume2 aria-hidden="true" className="size-4 text-white/72" />
                <span>Cut speech</span>
              </button>
              <button
                type="button"
                data-action="cut-silence"
                data-autonomous-target="cut-silence"
                onClick={() => {
                  const spans: Array<{ start: number; end: number }> = []
                  if (resolvedSegments.length > 1) {
                    for (let i = 0; i < resolvedSegments.length - 1; i++) {
                      const gap = resolvedSegments[i + 1]!.start - resolvedSegments[i]!.end
                      if (gap >= 0.35) {
                        spans.push({ start: resolvedSegments[i]!.end, end: resolvedSegments[i + 1]!.start })
                      }
                    }
                  }
                  const resolvedSpans = editorialReadiness?.silenceCuts ?? spans
                  if (resolvedSpans.length === 0) {
                    setTranscriptActionMessage('No transcript-aligned pauses meet the silence cut threshold.')
                  } else if (onApplySuggestedSilenceCuts) {
                    onApplySuggestedSilenceCuts(resolvedSpans)
                  } else if (onCutRangesChange && resolvedSpans.length > 0) {
                    onCutRangesChange([...(cutRanges ?? []), ...resolvedSpans])
                  }
                }}
                disabled={resolvedSegments.length === 0 || (!onApplySuggestedSilenceCuts && !onCutRangesChange)}
                className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[10px] font-medium text-white/58 transition-colors hover:border-white/[0.13] hover:bg-white/[0.075] hover:text-white/82 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35"
                title="Apply transcript-aligned silence cuts directly to the editable timeline"
              >
                <Scissors aria-hidden="true" className="size-4 text-white/72" />
                <span>Cut Silences</span>
              </button>
              <button
                type="button"
                onClick={() => onApplyPrompt?.('Clean up the selected speech in the current edit.')}
                disabled={!onApplyPrompt || resolvedSegments.length === 0}
                className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[10px] font-medium text-white/58 transition-colors hover:border-white/[0.13] hover:bg-white/[0.075] hover:text-white/82 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35"
              >
                <Wand2 aria-hidden="true" className="size-4 text-white/72" /> <span>Speech cleanup</span>
              </button>
              {onRequestTranscribe && !isTranscribing ? (
                <button
                  type="button"
                  onClick={onRequestTranscribe}
                  disabled={isSourceUploading}
                  className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-2 text-[10px] font-medium text-white/58 transition-colors hover:border-white/[0.13] hover:bg-white/[0.075] hover:text-white/82 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Transcribe source video with Prometheus AI"
                >
                  <Captions aria-hidden="true" className="size-4 text-white/72" /> <span>Transcribe</span>
                </button>
              ) : null}
            </div>

            {transcriptActionMessage ? <p role="status" className="mb-3 text-xs text-white/60">{transcriptActionMessage}</p> : null}

            {isTranscribing && visibleSegments.length === 0 ? (
              <div className="space-y-3 py-2">
                <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-full animate-pulse rounded bg-white/10 [animation-delay:150ms]" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-white/10 [animation-delay:300ms]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/10 [animation-delay:450ms]" />
              </div>
            ) : null}

            {visibleSegments.length === 0 && !isTranscribing ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50">
                  <Sparkles className="size-5 text-[#98f237]" />
                </div>
                <h4 className="text-sm font-semibold text-white/90">
                  {transcriptQuery ? 'No matching segments' : 'No transcript generated yet'}
                </h4>
                <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-white/50">
                  {transcriptQuery
                    ? `No transcript lines match "${transcriptQuery}". Try another search term.`
                    : 'Transcribe this video with Prometheus AI to view synchronized word captions, highlight key speech, and edit by sentence.'}
                </p>
                {!transcriptQuery && onRequestTranscribe ? (
                  <button
                    type="button"
                    onClick={onRequestTranscribe}
                    disabled={isSourceUploading}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#98f237] px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#b4fb60] disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5" />
                    {isSourceUploading ? 'Saving source media...' : 'Transcribe video'}
                  </button>
                ) : null}
              </div>
            ) : null}


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
                    data-transcript-segment-id={segment.id}
                    data-active-transcript={active}
                    onClick={() => onSeek(segment.start)}
                    className={cn(
                      'group relative block w-full cursor-pointer rounded-md p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98f237]/55',
                      active ? 'bg-white/[0.045] ring-1 ring-[#98f237]/25' : 'hover:bg-white/[0.025]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <HighlightedTranscript
                          segment={segment}
                          active={active}
                          onToggleCutWord={onToggleCutWord ? (wIdx, e) => {
                            e.stopPropagation()
                            onToggleCutWord(segment.id, wIdx)
                          } : undefined}
                        />
                        <span className={cn('ml-2 inline-flex translate-y-[-1px] rounded px-1.5 py-0.5 text-[10px] tabular-nums leading-none', active ? 'bg-[#98f237]/16 font-semibold text-[#b4fb60]' : 'bg-white/[0.08] text-white/38')}>
                          {formatTime(segment.start).slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {onToggleCutSegment ? (
                          <button
                            type="button"
                            data-action="cut-segment"
                            data-autonomous-target="transcript-segment-cut"
                            data-segment-id={segment.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleCutSegment(segment.id)
                            }}
                            title={segment.isCut ? 'Restore sentence to video' : 'Cut sentence from video'}
                            className={cn(
                              'rounded p-1 transition-all',
                              segment.isCut
                                ? 'text-[#98f237] hover:bg-[#98f237]/20 opacity-100'
                                : 'text-white/35 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100',
                            )}
                          >
                            {segment.isCut ? <RotateCcw className="size-3.5" /> : <Scissors className="size-3.5" />}
                          </button>
                        ) : null}
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
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative shrink-0 border-b border-white/8 bg-black/40 px-3 py-2 sm:px-5">
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
              <div
                data-motion-header-details
                className="flex min-w-0 items-center gap-2 text-xs text-white/62 transition-[opacity,transform] duration-150 motion-reduce:transition-none"
                style={{ opacity: 1 - headerCollapseProgress, transform: `translateY(-${headerCollapseProgress * 16}px)` }}
                aria-hidden={headerCollapseProgress >= 1}
                inert={headerCollapseProgress >= 1}
              >
                {selectedMusicTrack ? (
                  <button
                    type="button"
                    onClick={onOpenMusicCatalog}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#98f237]/30 bg-[#98f237]/10 px-2.5 py-1 text-[11px] font-medium text-[#b4fb60] transition-colors hover:bg-[#98f237]/20"
                    title={`Soundtrack: ${selectedMusicTrack.title} (${selectedMusicTrack.bpm || 120} BPM) — click to browse`}
                  >
                    <Music className="size-3 shrink-0" />
                    <span className="max-w-[120px] truncate">{selectedMusicTrack.title}</span>
                    <span className="text-[10px] text-[#b4fb60]/70">({selectedMusicTrack.bpm || 120} BPM)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenMusicCatalog}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50 transition-colors hover:border-white/20 hover:text-white"
                    title="Select soundtrack for this motion edit"
                  >
                    <Music className="size-3 shrink-0 text-white/40" />
                    <span className="hidden sm:inline">Add Soundtrack</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => onApplyPrompt?.(`Add a motion marker at ${formatTime(currentTimeSec)} in ${projectTitle}.`)} className="grid size-9 place-items-center rounded-md border border-white/10 bg-white/[0.045] text-white/72 transition-colors hover:bg-white/[0.1] hover:text-white" aria-label="Add motion marker"><Plus className="size-4" /></button><button type="button" onClick={() => onApplyPrompt?.('Prepare the current motion edit for export.')} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/85"><Download className="size-3.5" /> <span className="hidden sm:inline">Export</span></button></div>
            </div>
            <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 lg:hidden" aria-label="Motion tools">{TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTool(id)} className={cn('inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors', activeTool === id ? 'border-[#98f237]/35 bg-[#98f237]/10 text-[#c9ff7d]' : 'border-white/10 text-white/58 hover:text-white')}><Icon className="size-3.5" />{label}</button>)}</div>
            <div
              data-motion-framing-controls
              className="grid transition-[grid-template-rows,opacity] duration-150 motion-reduce:transition-none"
              style={{ gridTemplateRows: `${1 - framingCollapseProgress}fr`, opacity: 1 - framingCollapseProgress }}
              aria-hidden={framingCollapseProgress >= 1}
              inert={framingCollapseProgress >= 1}
            >
              <div className="min-h-0 overflow-hidden">
                <ToolPanel aspectRatio={safeAspectRatio} onAspectRatioChange={(ratio) => { setFrameAspectRatio(ratio); setCropRect(DEFAULT_CROP_RECT) }} onResetCrop={() => setCropRect(DEFAULT_CROP_RECT)} activeTool={activeTool} treatment={referenceStyle?.treatment ?? treatment} captionsVisible={effectiveCaptionsVisible} cropEnabled={cropEnabled} fitMode={fitMode} onTreatment={applyTreatment} onToggleCaptions={() => {
                  if (referenceStyle) editorial.patch({ type: 'reference_style', style: { ...referenceStyle, captionStyle: effectiveCaptionsVisible ? 'none' : captionStyle ?? 'clean_bold' } })
                  else setCaptionsOverride(!effectiveCaptionsVisible)
                }} onToggleCrop={() => setCropEnabled((value) => !value)} onToggleFit={() => onFitModeChange(fitMode === 'fill' ? 'fit' : 'fill')} onPickSource={handlePickSource} />
              </div>
            </div>
            <details className="mt-2 max-h-[40vh] overflow-y-auto rounded-lg border border-white/10 bg-[#101214] text-xs">
              <summary className="cursor-pointer px-3 py-2 text-white/80">Reference look{referenceStyle ? ' · Preview only' : ''}</summary>
              <StyleCloneCard key={previewUrl} sourceKey={previewUrl} durationSec={hasPreviewMedia && previewKind === 'video' ? durationSec : 0} onApplyStyle={applyReference} />
              {referenceStyle && <button type="button" onClick={() => editorial.patch({ type: 'reference_style', style: null })} className="m-3 min-h-9 rounded border border-white/20 px-3 text-white/80">Remove reference look</button>}
            </details>
          </header>

          <div data-motion-preview-stage className="relative min-h-[220px] flex-1 overflow-hidden bg-black/18 p-2 sm:min-h-[280px] sm:p-3 lg:min-h-0 lg:p-3">
            <div className="grid h-full w-full place-items-center [container-type:size]">
              <div
                className="relative aspect-[var(--motion-preview-aspect)] w-[min(100cqw,calc(100cqh*var(--motion-preview-aspect)))] max-h-full max-w-full"
                style={{ '--motion-preview-aspect': safeAspectRatio } as React.CSSProperties}
              >
                <div data-theme-independent="media" className="relative h-full w-full overflow-hidden border border-white/18 bg-black shadow-[0_28px_80px_rgba(0,0,0,0.56)]">
                  {renderMedia()}
                  {effectiveCaptionsVisible && effectiveCaptionStyle && <ReferenceCaptionOverlay segment={activeSegment} timeSec={currentTimeSec} style={effectiveCaptionStyle} />}
                  <div className="pointer-events-none absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded bg-black/60 px-2.5 py-1.5 text-[10px] text-white/72 backdrop-blur-sm"><Frame className="size-3 shrink-0 text-[#98f237]" /><span className="truncate">{sourceLabel ?? 'Source video'}</span></div>
                  <button type="button" onClick={onTogglePlayback} disabled={previewKind !== 'video' || !previewUrl} className="absolute bottom-3 left-3 grid size-10 place-items-center rounded-full border border-white/12 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/82 disabled:cursor-not-allowed disabled:opacity-35" aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}>{previewPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button>
                  {previewKind === 'video' ? (
                    <button
                      type="button"
                      onClick={() => onPreviewMutedChange(!previewMuted)}
                      className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b4fb60]"
                      aria-label={previewMuted ? 'Turn video sound on' : 'Mute video sound'}
                      aria-pressed={!previewMuted}
                      title={previewMuted ? 'Turn video sound on' : 'Mute video sound'}
                    >
                      {previewMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      <span className="text-[11px] font-medium">{previewMuted ? 'Sound off' : 'Sound on'}</span>
                    </button>
                  ) : null}
                </div>
                {cropEnabled ? <CropFrame rect={cropRect} onChange={setCropRect} /> : null}
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[72px] shrink-0 border-l border-white/8 bg-black/28 lg:flex lg:flex-col lg:items-center lg:gap-2 lg:pt-3">{TOOLS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTool(id)} className={cn('group flex min-h-12 w-full flex-col items-center gap-1 border-l-2 px-1 py-1.5 text-[9px] font-medium transition-colors', activeTool === id ? 'border-[#98f237] text-white' : 'border-transparent text-white/46 hover:text-white/82')}><span className={cn('grid size-7 place-items-center rounded-md transition-colors', activeTool === id ? 'bg-[#98f237]/12 text-[#b4fb60]' : 'text-white/65 group-hover:bg-white/[0.06]')}><Icon className="size-3.5" /></span>{label}</button>)}<div className="mt-auto mb-3 text-[8px] uppercase tracking-[0.12em] text-white/28">{activeTool}</div></aside>
      </div>

      <EditorialAudioPreview track={parentSelectedMusicTrack?.id === selectedMusicTrack?.id ? null : selectedMusicTrack} volume={soundtrackVolume} muted={soundtrackMuted} effects={audioEffects} videoRef={videoRef} playing={previewPlaying} currentTime={currentTimeSec} ducking={soundtrackDucking} voiceActive={resolvedSegments.some((segment) => !segment.isCut && Boolean(segment.text.trim()) && currentTimeSec >= segment.start && currentTimeSec < segment.end)} onError={setAudioError} />
      {audioError ? <p role="status" className="shrink-0 border-t border-amber-200/15 bg-[#15130d] px-4 py-1 text-[10px] text-amber-100">{audioError}</p> : null}
      {showTimeline ? (
        <section
          className="absolute inset-x-0 bottom-0 z-20 flex min-h-0 flex-col border-t border-white/10 bg-[#070809]/95"
          style={{ height: timelineHeight }}
          aria-label="Video timeline"
        >
          {timelineResizeHandle}
          <div className="flex items-center justify-between border-b border-white/8 bg-black/60 px-3 py-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-white/88">Editorial timeline</span>
              <EditorialSyncStatus />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCropEnabled((value) => !value)}
                className={cn(
                  'flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] transition-colors',
                  cropEnabled
                    ? 'border-[#9df65a]/50 bg-[#9df65a]/10 text-[#c5ff96]'
                    : 'border-white/10 text-white/56 hover:text-white',
                )}
                aria-label="Toggle crop frame"
              >
                <Crop className="size-3" />
                <span>Crop</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTimeline(false)}
                className="grid size-7 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-white/62 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                aria-label="Collapse timeline"
                title="Collapse timeline"
              >
                <PanelBottomClose className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <EditorialTimelineViewport
              previewUrl={previewKind === 'video' ? previewUrl : ''}
              playing={previewPlaying}
              onTogglePlayback={onTogglePlayback}
              zoom={zoom}
              onZoomChange={setZoom}
              effectiveDuration={effectiveDuration}
              sourceLabel={sourceLabel ?? projectTitle}
              transcriptSegments={resolvedSegments}
              captionsVisible={effectiveCaptionsVisible}
              currentTime={currentTimeSec}
              textPlacements={textPlacements}
              cutRanges={effectiveCutRanges}
              onCutRangesChange={onCutRangesChange}
              selectedMusicTrack={selectedMusicTrack}
              editorialCues={editorialCues}
              onEditorialCuesChange={updateEditorialCues}
              soundtrackVolume={soundtrackVolume}
              soundtrackMuted={soundtrackMuted}
              soundtrackDucking={soundtrackDucking}
              onSoundtrackVolumeChange={onSoundtrackVolumeChange}
              onSoundtrackMutedChange={onSoundtrackMutedChange}
              onSoundtrackDuckingChange={onSoundtrackDuckingChange}
              onRemoveSoundtrack={() => { editorial.patch({ type: 'music', track: null }); onRemoveMusicTrack?.() }}
              onOpenMusicCatalog={onOpenMusicCatalog}
              onSeek={onSeek}
              isFullscreen={timelineHeight > 320}
              onToggleFullscreen={() =>
                setTimelineHeight((h) => (h > 320 ? DEFAULT_TIMELINE_HEIGHT : 420))
              }
            />
          </div>
        </section>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-20 h-10 border-t border-white/10 bg-[#070809]">
          {timelineResizeHandle}
          <button
            type="button"
            onClick={() => setShowTimeline(true)}
            className="group flex h-full w-full items-center justify-center gap-2 text-xs text-white/58 transition-colors hover:bg-white/[0.025] hover:text-white"
          >
            <PanelBottomOpen className="size-3.5 transition-transform group-hover:-translate-y-0.5" /> Show timeline
          </button>
        </div>
      )}
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

function ToolPanel({ aspectRatio, onAspectRatioChange, onResetCrop, activeTool, treatment, captionsVisible, cropEnabled, fitMode, onTreatment, onToggleCaptions, onToggleCrop, onToggleFit, onPickSource }: { aspectRatio: number; onAspectRatioChange: (ratio: number) => void; onResetCrop: () => void; activeTool: MotionToolId; treatment: PreviewTreatment; captionsVisible: boolean; cropEnabled: boolean; fitMode: 'fill' | 'fit'; onTreatment: (value: PreviewTreatment) => void; onToggleCaptions: () => void; onToggleCrop: () => void; onToggleFit: () => void; onPickSource: () => void }) {
  const content = activeTool === 'enhance' ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-white/40 mr-1">Look & Grade:</span>
      {TREATMENTS.map((item) => {
        const Icon = item.icon
        const isSelected = treatment === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTreatment(item.id)}
            className={cn(
              'inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all shadow-sm',
              isSelected
                ? 'border-[#98f237]/50 bg-[#98f237]/15 text-[#c9ff7d] shadow-[0_0_12px_rgba(152,242,55,0.18)]'
                : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
            )}
          >
            <Icon className="size-3.5" />
            <span>{item.label}</span>
            {isSelected ? <Check className="size-3 ml-0.5 text-[#98f237]" /> : null}
          </button>
        )
      })}
    </div>
  ) : activeTool === 'captions' ? (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleCaptions}
        className={cn(
          'inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium transition-all shadow-sm',
          captionsVisible
            ? 'border-[#98f237]/50 bg-[#98f237]/15 text-[#c9ff7d] shadow-[0_0_12px_rgba(152,242,55,0.18)]'
            : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
        )}
      >
        <Captions className="size-3.5" />
        <span>{captionsVisible ? 'Captions On' : 'Show Captions'}</span>
      </button>
    </div>
  ) : activeTool === 'media' ? (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (typeof onPickSource === 'function') onPickSource()
          else if (typeof document !== 'undefined') {
            const fallbackInput = document.getElementById('editor-source-file-input') as HTMLInputElement | null
            if (fallbackInput) {
              fallbackInput.value = ''
              fallbackInput.click()
            }
          }
        }}
        className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/80 hover:border-white/20 hover:bg-white/[0.07] hover:text-white transition-all shadow-sm"
      >
        <Upload className="size-3.5 text-[#98f237]" />
        <span>Replace source media</span>
      </button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-white/40 mr-1">Framing:</span>
      <button
        type="button"
        onClick={onToggleFit}
        className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/80 hover:border-white/20 hover:bg-white/[0.07] hover:text-white transition-all shadow-sm"
      >
        <Maximize2 className="size-3.5 text-[#98f237]" />
        <span>{fitMode === 'fill' ? 'Fill frame' : 'Fit frame'}</span>
      </button>
      <button
        type="button"
        onClick={onToggleCrop}
        className={cn(
          'inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium transition-all shadow-sm',
          cropEnabled
            ? 'border-[#98f237]/50 bg-[#98f237]/15 text-[#c9ff7d] shadow-[0_0_12px_rgba(152,242,55,0.18)]'
            : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
        )}
      >
        <Crop className="size-3.5" />
        <span>{cropEnabled ? 'Crop guides on' : 'Crop guides off'}</span>
      </button>
      <div className="h-4 w-px bg-white/10 mx-1" />
      <span className="text-[10px] uppercase tracking-wider text-white/40">Presets:</span>
      <button
        type="button"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70 hover:border-white/20 hover:text-white transition-all"
        title="16:9 Landscape"
        onClick={() => onAspectRatioChange(16 / 9)}
        aria-pressed={Math.abs(aspectRatio - 16 / 9) < 0.001}
      >
        <Monitor className="size-3.5 text-blue-400" />
        <span>16:9</span>
      </button>
      <button
        type="button"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70 hover:border-white/20 hover:text-white transition-all"
        title="9:16 Portrait"
        onClick={() => onAspectRatioChange(9 / 16)}
        aria-pressed={Math.abs(aspectRatio - 9 / 16) < 0.001}
      >
        <Smartphone className="size-3.5 text-emerald-400" />
        <span>9:16</span>
      </button>
      <button
        type="button"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70 hover:border-white/20 hover:text-white transition-all"
        title="1:1 Square"
        onClick={() => onAspectRatioChange(1)}
        aria-pressed={Math.abs(aspectRatio - 1) < 0.001}
      >
        <Square className="size-3.5 text-purple-400" />
        <span>1:1</span>
      </button>
      <button type="button" onClick={onResetCrop} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-white/70" aria-label="Reset crop"><RotateCcw className="size-3.5" /> Reset crop</button>
    </div>
  )
  return <div className="mt-2.5 border-t border-white/[0.08] pt-2.5">{content}</div>
}

function TimelineTracks({
  previewUrl,
  previewKind,
  zoom,
  effectiveDuration,
  sourceLabel,
  transcriptSegments,
  captionsVisible,
  currentTime,
  textPlacements,
  cutRanges,
  selectedMusicTrack,
  soundtrackVolume,
  soundtrackMuted,
  onSoundtrackVolumeChange,
  onSoundtrackMutedChange,
  onOpenMusicCatalog,
  onSeek,
}: {
  previewUrl?: string
  previewKind?: PreviewMediaKind
  zoom: number
  effectiveDuration: number
  sourceLabel: string
  transcriptSegments: MotionTranscriptSegment[]
  captionsVisible: boolean
  currentTime: number
  textPlacements?: MotionTextPlacement[]
  cutRanges?: { start: number; end: number }[]
  selectedMusicTrack?: MusicRecommendation | null
  soundtrackVolume?: number
  soundtrackMuted?: boolean
  onSoundtrackVolumeChange?: (vol: number) => void
  onSoundtrackMutedChange?: (muted: boolean) => void
  onOpenMusicCatalog?: () => void
  onSeek?: (timeSec: number) => void
}) {
  if (previewKind === 'video' && previewUrl) {
    return <EditorialTimelineTracks previewUrl={previewUrl} zoom={zoom} effectiveDuration={effectiveDuration} sourceLabel={sourceLabel} transcriptSegments={transcriptSegments} captionsVisible={captionsVisible} currentTime={currentTime} textPlacements={textPlacements} cutRanges={cutRanges} selectedMusicTrack={selectedMusicTrack} soundtrackVolume={soundtrackVolume} soundtrackMuted={soundtrackMuted} onSoundtrackVolumeChange={onSoundtrackVolumeChange} onSoundtrackMutedChange={onSoundtrackMutedChange} onOpenMusicCatalog={onOpenMusicCatalog} onSeek={onSeek} />
  }
  const width = `${zoom * 100}%`
  const activeSegment = transcriptSegments.find((segment) => isActiveSegment(segment, currentTime))
  const resolvedTextPlacements = textPlacements ?? transcriptSegments.slice(0, 3).map((segment, index) => ({
    id: `text-${segment.id}`,
    start: segment.start,
    end: segment.end,
    text: segment.text.split(' ').slice(0, 4).join(' '),
    region: index === 1 ? 'bottom' : index === 2 ? 'top' : 'center',
  } as MotionTextPlacement))
  return <><div className="relative h-5 border-b border-white/10" style={{ width, minWidth: '100%' }}>{Array.from({ length: 8 }).map((_, index) => <span key={index} className="absolute top-0 h-2 border-l border-white/28 text-[10px] text-white/42" style={{ left: `${(index / 7) * 100}%` }}><span className="absolute left-1 top-2 whitespace-nowrap">{formatTime((effectiveDuration * index) / 7).slice(0, 5)}</span></span>)}</div><div className="relative mt-2 h-11 overflow-hidden rounded border border-white/14 bg-[linear-gradient(120deg,#6b4332_0%,#d99768_13%,#5c3427_21%,#d89b71_34%,#273d48_53%,#bd825d_68%,#5b3728_82%,#d99c6d_100%)]" style={{ width, minWidth: '100%' }}><div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_36px,rgba(0,0,0,.46)_37px,transparent_39px)]" />{cutRanges && cutRanges.length > 0 ? <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">{cutRanges.map((range, idx) => <div key={`cut-v-${idx}`} className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.35),rgba(239,68,68,0.35)_4px,rgba(0,0,0,0.6)_4px,rgba(0,0,0,0.6)_8px)] border-x border-red-500/70" style={{ left: `${(range.start / effectiveDuration) * 100}%`, width: `${Math.max(0.5, ((range.end - range.start) / effectiveDuration) * 100)}%` }} title={`Cut section: ${formatTime(range.start)} - ${formatTime(range.end)}`} />)}</div> : null}{activeSegment ? <div className="absolute inset-y-0 border-x border-white/30 bg-white/[0.07]" style={{ left: `${(activeSegment.start / effectiveDuration) * 100}%`, width: `${Math.max(1.5, ((activeSegment.end - activeSegment.start) / effectiveDuration) * 100)}%` }} /> : null}<span className="absolute bottom-1 left-2 max-w-[calc(100%-1rem)] truncate rounded bg-black/62 px-1.5 py-0.5 text-[9px] text-white/82">{sourceLabel}</span></div><div className="relative mt-2 h-8 overflow-hidden rounded bg-white/[0.08]" style={{ width, minWidth: '100%' }}><div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,transparent_0%,rgba(255,255,255,.7)_1%,transparent_2%,transparent_5%,rgba(255,255,255,.4)_6%,transparent_8%)] [background-size:42px_100%]" />{cutRanges && cutRanges.length > 0 ? <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">{cutRanges.map((range, idx) => <div key={`cut-a-${idx}`} className="absolute inset-y-0 bg-red-950/60 border-x border-red-500/50" style={{ left: `${(range.start / effectiveDuration) * 100}%`, width: `${Math.max(0.5, ((range.end - range.start) / effectiveDuration) * 100)}%` }} />)}</div> : null}{transcriptSegments.length > 0 ? transcriptSegments.map((segment, index) => { const centerPct = (((segment.start + segment.end) / 2) / effectiveDuration) * 100; const energy = 30 + ((segment.text.length + index * 3) % 7) * 8; return <span key={segment.id} className={cn('absolute bottom-1 w-[3px] -translate-x-1/2 rounded-full transition-colors duration-150', isActiveSegment(segment, currentTime) ? 'bg-[#b4fb60] shadow-[0_0_8px_rgba(180,251,96,.6)]' : segment.isCut ? 'bg-red-500/35' : 'bg-white/42')} style={{ left: `${centerPct}%`, height: `${energy}%` }} /> }) : null}</div>{captionsVisible ? <div className="relative mt-2 h-7 overflow-hidden" style={{ width, minWidth: '100%' }}>{transcriptSegments.map((segment) => <span key={segment.id} className={cn('absolute top-1 truncate rounded px-1.5 py-1 text-[9px] transition-colors', segment.isCut ? 'line-through bg-red-500/20 text-red-300/60' : isActiveSegment(segment, currentTime) ? 'bg-[#98f237]/38 text-white' : 'bg-[#98f237]/18 text-white/72')} style={{ left: `${(segment.start / effectiveDuration) * 100}%`, width: `${Math.max(8, ((segment.end - segment.start) / effectiveDuration) * 100)}%` }}>{segment.text.split(' ').slice(0, 3).join(' ')}</span>)}</div> : null}<div className="relative mt-2 h-7 overflow-hidden rounded bg-white/[0.035]" style={{ width, minWidth: '100%' }}>{resolvedTextPlacements.map((placement) => <button type="button" key={placement.id} className="absolute top-1 truncate rounded border border-dashed border-[#98f237]/40 bg-[#98f237]/8 px-1.5 py-1 text-left text-[9px] text-white/70 transition-colors hover:border-[#98f237] hover:bg-[#98f237]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#98f237]/60" style={{ left: `${(placement.start / effectiveDuration) * 100}%`, width: `${Math.max(10, ((placement.end - placement.start) / effectiveDuration) * 100)}%` }} title={`Text placement (${placement.region ?? 'center'}) from ${formatTime(placement.start)}`}>{placement.text}</button>)}</div><MotionSoundtrackTrack track={selectedMusicTrack} effectiveDuration={effectiveDuration} currentTime={currentTime} zoom={zoom} volume={soundtrackVolume} isMuted={soundtrackMuted} onVolumeChange={onSoundtrackVolumeChange} onToggleMute={onSoundtrackMutedChange ? () => onSoundtrackMutedChange(!soundtrackMuted) : undefined} onOpenMusicCatalog={onOpenMusicCatalog} onSeek={onSeek} /></>
}
