'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Film, Sparkles, Play, Pause, Maximize2 } from 'lucide-react'
import { CinematicPreviewRuntime } from '@/components/editor/cinematic-preview-runtime'
import { ViralClipSplitPreview } from '@/components/editor/viral-clip-split-preview'
import { PreviewGenerationState } from '@/components/editor/preview-generation-state'
import { PreviewFeedbackShell } from '@/components/editor/preview-feedback-shell'
import { VideoWorkspace } from '@/components/editor/VideoWorkspace'
import { cn } from '@/lib/utils'
import type {
  Project,
  ProcessingJob,
  HeaderNavMode,
  PreviewMediaKind,
  AnimationPlan,
  TranscriptStatus,
  PreviewFramePreset,
  PreviewFitMode,
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
  fitMode: PreviewFitMode
  previewFramePreset: PreviewFramePreset
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
  musicSpotlightPortalRef: (node: HTMLDivElement | null) => void
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
  onPreviewFramePresetChange: (preset: PreviewFramePreset) => void
  onFitModeChange: (mode: PreviewFitMode) => void
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
  previewFramePreset,
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
  musicSpotlightPortalRef,
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
  onPreviewFramePresetChange,
  onFitModeChange,
  onSetIsPreviewBriefGenerating,
  onSetShowPreviewFeedback,
  onSetInlinePreviewStatusHovered,
  onPickSource,
  onInlineSourceDragOver,
  onInlineSourceDragLeave,
  onInlineSourceDrop,
}: PreviewCanvasProps) {
  if (activeWorkspaceTab === 'Music') return null

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative group w-full max-w-[min(100%,54rem)] self-center rounded-[24px] border border-white/8 bg-[#0A0A0C] p-2 shadow-[0_20px_32px_-18px_rgba(0,0,0,0.55)]">
        <input
          ref={sourceFileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
          className="sr-only"
          onChange={onInlineSourceFileInputChange}
        />

        <VideoWorkspace
          hasMedia={hasPreviewMedia}
          loading={isSourceStageActivelyLoading}
          aspectPreset={previewFramePreset}
          fitMode={fitMode}
          isDragActive={isInlineSourceDragOver}
          onAspectPresetChange={onPreviewFramePresetChange}
          onFitModeChange={onFitModeChange}
          onImport={onPickSource}
          onEmptyClick={onPickSource}
          onEmptyDragOver={onInlineSourceDragOver}
          onEmptyDragLeave={onInlineSourceDragLeave}
          onEmptyDrop={onInlineSourceDrop}
          className="rounded-[18px]"
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              ref={musicSpotlightPortalRef}
              className="pointer-events-none absolute right-2 top-2 z-20"
            />

            {hasPreviewMedia ? (
              <motion.div
                layout
                className="relative overflow-hidden rounded-[8px] border border-white/5 bg-[rgba(255,255,255,0.02)]"
                style={{
                  aspectRatio: visiblePreviewAspectRatio,
                  width: previewFrameWidth,
                  height: 'auto',
                  willChange: 'width, height, transform',
                  transition:
                    'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                transition={{
                  layout: {
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  },
                }}
              >
                <div className="relative h-full w-full">
                  <BriefPipelineProgress
                    status={job?.transcriptStatus}
                    steps={job?.previewProgressSteps}
                  />

                  {hasSourceAsset && !clipModeActive ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none absolute bottom-3 left-3 z-20"
                    >
                      <div className="inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-white/10 bg-[rgba(10,10,12,0.62)] px-3 py-1.5 text-[11px] text-white/86 shadow-[0_12px_24px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md">
                        <Film className="size-3.5 shrink-0 text-[#EAEAEA]" />
                        <div className="min-w-0 truncate font-medium text-white/90">
                          {sourceAssetLabel ?? project?.title ?? 'Source video'}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

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
                      <div className="absolute inset-0 overflow-hidden bg-[#0A0A0C]">
                        <div
                          className="absolute inset-0"
                          style={shouldUseLegacySessionPreviewSurface ? undefined : previewFrameTransformStyle}
                        >
                          <img
                            src={previewUrl}
                            alt={project?.title ?? 'Project preview'}
                            className="block h-full w-full"
                            onLoad={onPreviewImageLoaded}
                            style={{
                              objectFit: fitMode === 'fill' ? 'cover' : 'contain',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0A0A0C]">
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
                            className="pointer-events-none block h-full w-full select-none"
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
                </div>
              </motion.div>
            ) : null}
          </div>

          {/* Floating Controls Overlay */}
          <AnimatePresence>
            {hasPreviewMedia && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 bottom-[6.5rem] z-30 flex items-center justify-center px-6"
              >
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
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAEAEA] text-[#0A0A0C] transition-transform active:scale-95"
                  >
                    {previewPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-1" />}
                  </button>

                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </div>
              </motion.div>
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
                  'pointer-events-auto inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-[rgba(10,10,12,0.58)] px-3 py-1.5 backdrop-blur-md',
                  isInlinePreviewStatusExpanded ? 'gap-2 text-[11px] text-white/72' : 'size-9 justify-center text-white/84'
                )}
              >
                <motion.span
                  animate={sourceStageError ? { scale: [0.92, 1.02, 0.92] } : { rotate: 360 }}
                  transition={{ duration: sourceStageError ? 1.1 : 1, repeat: Infinity, ease: 'linear' }}
                >
                  {sourceStageError ? <AlertCircle className="size-4 text-rose-400" /> : <Sparkles className="size-4 text-accent-cyan" />}
                </motion.span>
                {isInlinePreviewStatusExpanded && inlinePreviewStatusLabel && (
                  <span>{inlinePreviewStatusLabel}</span>
                )}
              </motion.button>
            </div>
          )}
        </VideoWorkspace>
      </div>
    </div>
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
      {statusLabel ? (
        <div className="rounded-full border border-white/10 bg-[rgba(10,10,12,0.62)] px-3 py-1.5 text-[11px] font-medium text-white/70 shadow-[0_12px_24px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md">
          {statusLabel}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        {(steps ?? []).map((item) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full border border-white/8 bg-[rgba(10,10,12,0.58)] px-3 py-1.5 text-[11px] text-white/62 backdrop-blur-sm"
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

