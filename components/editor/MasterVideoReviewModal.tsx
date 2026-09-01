'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Pause,
  Download,
  Share2,
  Sparkles,
  Scissors,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
  Volume2,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface MasterVideoReviewModalProps {
  isOpen: boolean
  onClose: () => void
  originalVideoUrl?: string | null
  renderedVideoUrl?: string | null
  projectTitle: string
  cutSecondsSaved?: number
  treatmentName?: string
  onOpenThumbnailStudio: () => void
  onPublishSocial: () => void
}

export function MasterVideoReviewModal({
  isOpen,
  onClose,
  originalVideoUrl,
  renderedVideoUrl,
  projectTitle,
  cutSecondsSaved = 0,
  treatmentName = 'Prometheus Cinematic Master',
  onOpenThumbnailStudio,
  onPublishSocial,
}: MasterVideoReviewModalProps) {
  const [activeView, setActiveView] = React.useState<'rendered' | 'original' | 'split'>('rendered')
  const [isPlaying, setIsPlaying] = React.useState(false)

  const renderedVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const originalVideoRef = React.useRef<HTMLVideoElement | null>(null)

  const effectiveRenderedUrl = renderedVideoUrl || originalVideoUrl

  // Synchronized playback controls
  const togglePlayPause = () => {
    if (isPlaying) {
      renderedVideoRef.current?.pause()
      originalVideoRef.current?.pause()
      setIsPlaying(false)
    } else {
      renderedVideoRef.current?.play()
      originalVideoRef.current?.play()
      setIsPlaying(true)
    }
  }

  const handleDownload = () => {
    if (!effectiveRenderedUrl) return
    const a = document.createElement('a')
    a.href = effectiveRenderedUrl
    a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '_')}_master.mp4`
    a.click()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex h-[90vh] max-h-[880px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0C] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[#7ff2d4]/10 text-[#7ff2d4]">
                <CheckCircle2 className="size-4" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium tracking-tight text-white/90">Master Video Review</h2>
                  <span className="rounded-full bg-[#7ff2d4]/15 px-2 py-0.5 text-[10px] font-semibold text-[#7ff2d4]">
                    Render Complete
                  </span>
                </div>
                <p className="text-xs text-white/40">{projectTitle} — Final Master Quality Check</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Selector */}
              <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs text-white/60">
                <button
                  type="button"
                  onClick={() => setActiveView('rendered')}
                  className={cn(
                    'rounded-full px-3 py-1 transition-all',
                    activeView === 'rendered' ? 'bg-[#7ff2d4] text-black font-semibold' : 'hover:text-white',
                  )}
                >
                  Prometheus Master
                </button>
                {originalVideoUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveView('original')}
                      className={cn(
                        'rounded-full px-3 py-1 transition-all',
                        activeView === 'original' ? 'bg-white text-black font-semibold' : 'hover:text-white',
                      )}
                    >
                      Original Source
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('split')}
                      className={cn(
                        'rounded-full px-3 py-1 transition-all',
                        activeView === 'split' ? 'bg-white text-black font-semibold' : 'hover:text-white',
                      )}
                    >
                      Split Compare
                    </button>
                  </>
                ) : null}
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

          {/* Main Video Stage */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black p-6 lg:flex-row lg:gap-6">
            {/* Player Container */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/80">
              {activeView === 'split' && originalVideoUrl ? (
                <div className="grid size-full grid-cols-2 gap-2 p-2">
                  <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
                    <span className="absolute left-3 top-3 z-10 rounded bg-black/75 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                      Original Raw
                    </span>
                    <video
                      ref={originalVideoRef}
                      src={originalVideoUrl}
                      playsInline
                      muted
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-[#7ff2d4]/30 bg-black">
                    <span className="absolute left-3 top-3 z-10 rounded bg-[#7ff2d4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                      Prometheus Master
                    </span>
                    <video
                      ref={renderedVideoRef}
                      src={effectiveRenderedUrl || undefined}
                      playsInline
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative flex size-full items-center justify-center p-2">
                  <span className="absolute left-4 top-4 z-10 rounded-full border border-white/15 bg-black/80 px-3 py-1 text-xs text-white/80 backdrop-blur-md">
                    {activeView === 'rendered' ? '✨ Prometheus Master Render' : '📹 Raw Unedited Source'}
                  </span>
                  <video
                    ref={renderedVideoRef}
                    src={activeView === 'rendered' ? effectiveRenderedUrl || undefined : originalVideoUrl || undefined}
                    controls
                    playsInline
                    className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Quality & Action Rail */}
            <div className="mt-4 flex w-full flex-col gap-4 lg:mt-0 lg:w-80">
              {/* Quality Badges Card */}
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <span className="text-xs uppercase tracking-[0.14em] text-white/40">Editorial Enhancements</span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Scissors className="size-3.5 text-[#7ff2d4]" />
                      Pauses Trimmed
                    </span>
                    <span className="font-mono font-semibold text-[#7ff2d4]">
                      {cutSecondsSaved > 0 ? `-${cutSecondsSaved.toFixed(1)}s` : 'Clean Cut'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-300" />
                      Visual Grade
                    </span>
                    <span className="font-medium text-white/90">{treatmentName}</span>
                  </div>

                  <div className="flex items-center justify-between text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="size-3.5 text-blue-400" />
                      Audio Processing
                    </span>
                    <span className="font-medium text-white/90">Mastered & Ducked</span>
                  </div>
                </div>
              </div>

              {/* Next Steps: Thumbnail & Distribution */}
              <div className="mt-auto flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onOpenThumbnailStudio}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-200 transition-all hover:bg-amber-400/20"
                >
                  <ImageIcon className="size-4 text-amber-300" />
                  Craft Viral Thumbnail
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-xs font-semibold text-white transition-all hover:bg-white/[0.1]"
                >
                  <Download className="size-4" />
                  Download Master MP4
                </button>

                <button
                  type="button"
                  onClick={onPublishSocial}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7ff2d4] px-4 py-3 text-xs font-semibold text-black transition-all hover:bg-[#9ff6e3]"
                >
                  <Share2 className="size-4" />
                  Publish to Socials
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
