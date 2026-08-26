'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Film, Play, Pause, Maximize2, Minimize2, X } from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { CinematicPreviewRuntime } from '@/components/editor/cinematic-preview-runtime'
import { ViralClipSplitPreview } from '@/components/editor/viral-clip-split-preview'
import { PreviewGenerationState } from '@/components/editor/preview-generation-state'
import { PreviewFeedbackShell } from '@/components/editor/preview-feedback-shell'
import { SourceStagePlaceholder } from '@/components/editor/source-stage-placeholder'
import { cn } from '@/lib/utils'
import type {
  Project,
  ProcessingJob,
  HeaderNavMode,
  PreviewMediaKind,
  AnimationPlan,
  TranscriptStatus
} from '@/lib/types'
import type { SplitPreviewAssetState } from '@/lib/hooks/useVideoEngine'

export interface PreviewCanvasProps {
  projectId: string
  project: Project | null
  job: ProcessingJob | null
  activeWorkspaceTab: HeaderNavMode
  hasSourceAsset: boolean
  hasPreviewMedia: boolean
  clipModeActive: boolean
  sourceAssetLabel: string | null
  previewOverlayPlan: AnimationPlan | null
  previewCurrentTimeSec: number
  transportCurrentTime: string
  transportTime: string
  showViralClipSplitPreview: boolean
  viralClipSplitAnimationKey: number
  previewUrl: string
  previewKind: PreviewMediaKind
  previewPlaying: boolean
  shouldUseLegacySessionPreviewSurface: boolean
  previewFrameTransformStyle: React.CSSProperties | undefined
  fitMode: 'fill' | 'fit'
  currentSplitPreviewAssets: SplitPreviewAssetState
  isLockedViralClipTriggerHovered: boolean
  isPreviewMuted: boolean
  isPreviewMediaReady: boolean
  isSourceStageActivelyLoading: boolean
  isPreviewBriefGenerating: boolean
  showPreviewFeedback: boolean
  showInlinePreviewStatus: boolean
  sourceStageError: string | null
  inlinePreviewStatusLabel: string | null
  isInlinePreviewStatusExpanded: boolean
  isInlineSourceDragOver: boolean
  visiblePreviewAspectRatio: number
  previewFrameWidth: string
  sourceFileInputRef: React.RefObject<HTMLInputElement | null>
  previewVideoRef: React.RefObject<HTMLVideoElement | null>
  onInlineSourceFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRestoreLandscape: () => void
  onPreviewImageLoaded: (event: React.SyntheticEvent<HTMLImageElement>) => void
  onPreviewMetadataLoaded: () => void
  onPreviewVideoReady: () => void
  onPreviewTimeUpdate: () => void
  onPreviewEnded: () => void
  onPreviewVideoPlay: () => void
  onPreviewVideoPause: () => void
  onPreviewVideoError: () => void
  onTogglePreviewPlayback: () => void
  onSeekPreview: (timeSec: number) => void
  onSetIsPreviewBriefGenerating: (visible: boolean) => void
  onSetShowPreviewFeedback: (show: boolean) => void
  onSetInlinePreviewStatusHovered: (hovered: boolean) => void
  onPickSource: () => void
  onInlineSourceDragOver: (event: React.DragEvent<HTMLButtonElement>) => void
  onInlineSourceDragLeave: () => void
  onInlineSourceDrop: (event: React.DragEvent<HTMLButtonElement>) => void
}

export function PreviewCanvas({
  projectId,
  project,
  job,
  activeWorkspaceTab,
  hasSourceAsset,
  hasPreviewMedia,
  clipModeActive,
  sourceAssetLabel,
  previewOverlayPlan,
  previewCurrentTimeSec,
  transportCurrentTime,
  transportTime,
  showViralClipSplitPreview,
  viralClipSplitAnimationKey,
  previewUrl,
  previewKind,
  previewPlaying,
  shouldUseLegacySessionPreviewSurface,
  previewFrameTransformStyle,
  fitMode,
  currentSplitPreviewAssets,
  isLockedViralClipTriggerHovered,
  isPreviewMuted,
  isPreviewMediaReady,
  isSourceStageActivelyLoading,
  isPreviewBriefGenerating,
  showPreviewFeedback,
  showInlinePreviewStatus,
  sourceStageError,
  inlinePreviewStatusLabel,
  isInlinePreviewStatusExpanded,
  isInlineSourceDragOver,
  visiblePreviewAspectRatio,
  previewFrameWidth,
  sourceFileInputRef,
  previewVideoRef,
  onInlineSourceFileInputChange,
  onRestoreLandscape,
  onPreviewImageLoaded,
  onPreviewMetadataLoaded,
  onPreviewVideoReady,
  onPreviewTimeUpdate,
  onPreviewEnded,
  onPreviewVideoPlay,
  onPreviewVideoPause,
  onPreviewVideoError,
  onTogglePreviewPlayback,
  onSeekPreview,
  onSetIsPreviewBriefGenerating,
  onSetShowPreviewFeedback,
  onSetInlinePreviewStatusHovered,
  onPickSource,
  onInlineSourceDragOver,
  onInlineSourceDragLeave,
  onInlineSourceDrop,
}: PreviewCanvasProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const fullscreenVideoRef = React.useRef<HTMLVideoElement | null>(null)

  React.useEffect(() => {
    if (!isFullscreen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  React.useEffect(() => {
    if (!isFullscreen || previewKind !== 'video') return
    const video = fullscreenVideoRef.current
    if (!video) return
    if (Math.abs(video.currentTime - previewCurrentTimeSec) > 0.5) video.currentTime = previewCurrentTimeSec
    if (previewPlaying) void video.play().catch(() => undefined)
    else video.pause()
  }, [isFullscreen, previewCurrentTimeSec, previewKind, previewPlaying])

  if (activeWorkspaceTab === 'Music') return null

  return (
    <>
    <div className="flex flex-col items-center w-full">
      <div className="relative group w-full max-w-[min(100%,54rem)] self-center rounded-[24px] bg-black shadow-[0_32px_64px_-18px_rgba(0,0,0,0.92)]">
        {/* Glass Border Container */}
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-[18px] bg-black',
            hasPreviewMedia
              ? 'max-h-[clamp(250px,40vh,460px)] p-2'
              : 'h-[clamp(250px,40vh,460px)]',
          )}
          style={hasPreviewMedia ? { aspectRatio: visiblePreviewAspectRatio } : undefined}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <input
              ref={sourceFileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
              className="sr-only"
              onChange={onInlineSourceFileInputChange}
            />
            <motion.div
              layout
              className="relative overflow-hidden rounded-[8px] bg-black"
              style={{
                aspectRatio: visiblePreviewAspectRatio,
                width: previewFrameWidth,
                height: 'auto',
                willChange: 'width, height, transform',
              }}
              transition={{
                layout: {
                  duration: 0.72,
                  ease: [0.645, 0.045, 0.355, 1],
                },
              }}
            >
              <div className="relative h-full w-full">
                <BriefPipelineProgress
                  status={job?.transcriptStatus}
                  steps={job?.previewProgressSteps}
                />

                {hasSourceAsset && hasPreviewMedia && !clipModeActive ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="pointer-events-none absolute bottom-3 left-3 z-20"
                  >
                    <div className="inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-white/10 bg-black/48 px-3 py-1.5 text-[11px] text-white/86 shadow-[0_18px_30px_-22px_rgba(0,0,0,0.95)] backdrop-blur-md">
                      <Film className="size-3.5 shrink-0 text-accent-cyan" />
                      <div className="min-w-0 truncate font-medium text-white/90">
                        {sourceAssetLabel ?? project?.title ?? 'Source video'}
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {hasPreviewMedia ? (
                  <>
                    <CinematicPreviewRuntime
                      animationPlan={previewOverlayPlan}
                      currentTimeMs={previewCurrentTimeSec * 1000}
                      aspectRatio={visiblePreviewAspectRatio}
                      showSafeZones={Boolean(previewOverlayPlan)}
                      className="absolute inset-0"
                    >
                      {showViralClipSplitPreview ? (
                        <ViralClipSplitPreview
                          key={`viral-split-${viralClipSplitAnimationKey}-${previewUrl}`}
                          active={showViralClipSplitPreview}
                          animationKey={viralClipSplitAnimationKey}
                          previewUrl={previewUrl}
                          previewKind={previewKind}
                          title={sourceAssetLabel ?? project?.title ?? 'Source video'}
                          isPlaying={previewPlaying}
                          currentTimeSec={previewCurrentTimeSec}
                          mediaTransformStyle={
                            shouldUseLegacySessionPreviewSurface ? undefined : previewFrameTransformStyle
                          }
                          objectFit={fitMode === 'fill' ? 'cover' : 'contain'}
                          splitVideoSources={currentSplitPreviewAssets}
                          highlightRestore={isLockedViralClipTriggerHovered}
                          onRestoreLandscape={onRestoreLandscape}
                        />
                      ) : previewKind === 'image' ? (
                        <div className="absolute inset-0 overflow-hidden bg-black">
                          <div
                            className="absolute inset-0"
                            style={shouldUseLegacySessionPreviewSurface ? undefined : previewFrameTransformStyle}
                          >
                            <img
                              src={previewUrl}
                              alt={project?.title ?? 'Project preview'}
                              className="block h-full w-full bg-black"
                              onLoad={onPreviewImageLoaded}
                              style={{
                                objectFit: fitMode === 'fill' ? 'cover' : 'contain',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
                          <div
                            className="absolute inset-0 cursor-pointer"
                            onPointerDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              onTogglePreviewPlayback()
                            }}
                            style={shouldUseLegacySessionPreviewSurface ? undefined : previewFrameTransformStyle}
                          >
                            <video
                              key={previewUrl}
                              ref={previewVideoRef}
                              src={previewUrl}
                              muted={isPreviewMuted}
                              playsInline
                              controls={false}
                              preload="auto"
                              onLoadedMetadata={onPreviewMetadataLoaded}
                              onLoadedData={onPreviewVideoReady}
                              onCanPlay={onPreviewVideoReady}
                              onTimeUpdate={onPreviewTimeUpdate}
                              onEnded={onPreviewEnded}
                              onPlay={onPreviewVideoPlay}
                              onPause={onPreviewVideoPause}
                              onError={onPreviewVideoError}
                              className="pointer-events-none block h-full w-full select-none bg-black"
                              style={{
                                objectFit: fitMode === 'fill' ? 'cover' : 'contain',
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CinematicPreviewRuntime>

                    <PreviewGenerationState
                      isVisible={isPreviewBriefGenerating}
                      onComplete={() => {
                        onSetIsPreviewBriefGenerating(false)
                        onSetShowPreviewFeedback(true)
                      }}
                    />

                    <PreviewFeedbackShell
                      previewId={undefined}
                      projectId={projectId}
                      show={showPreviewFeedback}
                      onDismiss={() => onSetShowPreviewFeedback(false)}
                      onSubmitPayload={(payload) => {
                        console.debug('Preview Feedback Submitted:', payload)
                        if (payload.sentiment === 'try_again') {
                          // Local only, no backend mutation
                          console.debug('Try again requested')
                        }
                      }}
                    />
                  </>
                ) : (
                  <SourceStagePlaceholder
                    status={sourceStageError ? 'error' : isSourceStageActivelyLoading ? 'loading' : 'empty'}
                    isDragActive={isInlineSourceDragOver}
                    onPickSource={onPickSource}
                    onDragOver={onInlineSourceDragOver}
                    onDragLeave={onInlineSourceDragLeave}
                    onDrop={onInlineSourceDrop}
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* Floating Controls Overlay */}
          <AnimatePresence>
            {hasPreviewMedia && (
              <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex translate-y-2 items-center justify-center px-6 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <div className="glass-panel flex items-center gap-4 rounded-full bg-void/60 px-2 py-2 backdrop-blur-2xl">
                  <div className="flex items-center gap-3 px-3 py-1">
                    <span className="font-mono text-[11px] font-medium tracking-wide text-white/80">
                      {transportCurrentTime}
                    </span>
                    <span className="font-mono text-[11px] font-medium tracking-wide text-chrome-dim">
                      / {transportTime}
                    </span>
                  </div>

                  <button
                    onClick={onTogglePreviewPlayback}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-cyan text-void transition-transform active:scale-95"
                  >
                    {previewPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                    aria-label="Expand preview"
                    title="Expand preview"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Status Badge */}
          {showInlinePreviewStatus && (
            <div className="pointer-events-none absolute left-6 top-6 z-20 flex justify-center">
              <motion.button
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'pointer-events-auto inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-black/44 px-3 py-1.5 backdrop-blur-md',
                  isInlinePreviewStatusExpanded ? 'gap-2 text-[11px] text-white/72' : 'size-9 justify-center text-white/84'
                )}
              >
                {sourceStageError ? (
                  <motion.span
                    animate={{ scale: [0.92, 1.02, 0.92] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                  >
                    <AlertCircle className="size-4 text-rose-400" />
                  </motion.span>
                ) : (
                  <InlineLoadingAnimation size={16} label={inlinePreviewStatusLabel ?? 'Preparing preview'} />
                )}
                {isInlinePreviewStatusExpanded && inlinePreviewStatusLabel && (
                  <span>{inlinePreviewStatusLabel}</span>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
    {isFullscreen && typeof document !== 'undefined' ? createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/88 p-4 backdrop-blur-xl sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsFullscreen(false)
          }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="relative flex h-full w-full items-center justify-center">
            <button type="button" onClick={() => setIsFullscreen(false)} className="absolute right-0 top-0 z-10 grid size-11 place-items-center rounded-full border border-white/15 bg-black/62 text-white/76 backdrop-blur-xl transition-colors hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Exit expanded preview" title="Exit expanded preview"><Minimize2 className="size-4" /></button>
            <div className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-lg bg-black shadow-[0_36px_100px_rgba(0,0,0,0.7)]">
              {previewKind === 'image' ? <img src={previewUrl} alt={project?.title ?? 'Project preview'} className="max-h-[calc(100svh-4rem)] max-w-[calc(100vw-2rem)] object-contain" /> : <video ref={fullscreenVideoRef} src={previewUrl} muted={isPreviewMuted} controls playsInline className="max-h-[calc(100svh-4rem)] max-w-[calc(100vw-2rem)] object-contain" onPlay={onPreviewVideoPlay} onPause={onPreviewVideoPause} onTimeUpdate={(event) => onSeekPreview(event.currentTarget.currentTime)} />}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body,
    ) : null}
    </>
  )
}

function BriefPipelineProgress({
  steps,
  status,
}: {
  steps?: string[]
  status?: TranscriptStatus
}) {
  const isTranscribing = status === 'transcribing' || status === 'queued'
  const hasSteps = steps && steps.length > 0

  if (!isTranscribing && !hasSteps) return null

  const statusLabel = isTranscribing ? null : 'Analyzing cinematic brief'

  return (
    <div className="absolute inset-x-4 bottom-4 z-30 flex flex-col items-center gap-3 px-4">
      <InlineLoadingAnimation
        size={32}
        label={isTranscribing ? 'Transcribing source video' : 'Analyzing cinematic brief'}
      />
      {statusLabel ? (
        <div className="rounded-full border border-white/10 bg-black/48 px-3 py-1.5 text-[11px] font-medium text-white/70 shadow-[0_18px_30px_-22px_rgba(0,0,0,0.95)] backdrop-blur-md">
          {statusLabel}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        {(steps ?? []).map((item) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full border border-white/8 bg-black/44 px-3 py-1.5 text-[11px] text-white/62 backdrop-blur-sm"
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
