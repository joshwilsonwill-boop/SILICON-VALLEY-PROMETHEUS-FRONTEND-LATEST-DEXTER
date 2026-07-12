'use client'

import * as React from 'react'
import { motion, AnimatePresence, useSpring, useTransform, useMotionValueEvent } from 'framer-motion'
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import type { DurableJobStatus, DurableJobType } from '@/lib/types/jobs'

interface DurableJobProgressProps {
  status: DurableJobStatus | 'idle'
  progress: number
  type?: DurableJobType | string
  errorMessage?: string | null
  className?: string
}

const JOB_LABELS: Record<string, string> = {
  render: 'Rendering Cinematic Output',
  scene_detection: 'Mapping Visual Sequences',
  export: 'Finalizing Media Assets',
  video_analysis: 'Analyzing Frame Composition',
  audio_processing: 'Refining Audio Signal',
  ai_enhancement: 'Sharpening Edit DNA',
}

export function DurableJobProgress({
  status,
  progress,
  type,
  errorMessage,
  className,
}: DurableJobProgressProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [roundedProgress, setRoundedProgress] = React.useState(0)

  // Spring-based progress for cinematic smoothness
  const springProgress = useSpring(0, {
    stiffness: 40,
    damping: 30,
    restDelta: 0.001
  })

  React.useEffect(() => {
    springProgress.set(progress)
  }, [progress, springProgress])

  useMotionValueEvent(springProgress, "change", (latest) => {
    setRoundedProgress(Math.round(latest))
  })

  React.useEffect(() => {
    if (status === 'processing' || status === 'pending') {
      setIsVisible(true)
    } else if (status === 'completed') {
      // Keep visible for a moment to show success state
      const timer = setTimeout(() => setIsVisible(false), 3000)
      return () => clearTimeout(timer)
    } else if (status === 'failed') {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [status])

  if (!isVisible && status !== 'completed' && status !== 'failed') return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 w-full max-w-sm px-6",
            className
          )}
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]">
            {/* Liquid Background Glow */}
            <div className="absolute -left-12 -top-12 size-32 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-white/5 border border-white/5">
                    {status === 'completed' ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      </motion.div>
                    ) : status === 'failed' ? (
                      <AlertCircle className="size-4 text-rose-400" />
                    ) : (
                      <InlineLoadingAnimation
                        size={24}
                        label={
                          status === 'pending'
                            ? `Queued ${type ? (JOB_LABELS[type] || type) : 'job'}`
                            : `Processing ${type ? (JOB_LABELS[type] || type) : 'active job'}`
                        }
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold tracking-tight text-white/90">
                      {status === 'completed' ? 'Processing Complete' : (type ? (JOB_LABELS[type] || type) : 'Processing...')}
                    </h4>
                    <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest">
                      {status === 'pending' ? 'Queued in pipeline' : status === 'completed' ? 'Assets Ready' : status === 'failed' ? 'Error encountered' : 'Active Task'}
                    </p>
                  </div>
                </div>

                <span className="text-sm font-mono font-medium text-white/60">
                  {status === 'completed' ? '100%' : `${roundedProgress}%`}
                </span>
              </div>

              {status === 'failed' && errorMessage ? (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-[11px] text-rose-300">
                  {errorMessage}
                </div>
              ) : null}

              {status === 'completed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 pt-1"
                >
                  <Sparkles className="size-3 text-emerald-400" />
                  <span className="text-[11px] font-medium text-emerald-400/80">View finalized output in editor</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
