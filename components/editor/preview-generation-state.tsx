'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { InlineLoadingAnimation } from '@/components/loading-animation'

interface PreviewGenerationStateProps {
  isVisible: boolean
  title?: string
  steps?: string[]
  durationMs?: number
  onComplete?: () => void
  className?: string
}

const DEFAULT_STEPS = [
  'Reading your creative brief...',
  'Mapping creative intent...',
  'Analyzing transcript cues...',
  'Applying cinematic direction...',
  'Preparing sample preview...'
]

export function PreviewGenerationState({
  isVisible,
  title = 'Sharpening your Edit DNA',
  steps = DEFAULT_STEPS,
  durationMs = 10000,
  onComplete,
  className,
}: PreviewGenerationStateProps) {
  const [currentStep, setCurrentStep] = React.useState(0)

  React.useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0)
      return
    }

    const stepDuration = durationMs / steps.length

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1
        return prev
      })
    }, stepDuration)

    const timeout = setTimeout(() => {
      onComplete?.()
    }, durationMs)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isVisible, steps.length, durationMs, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-black/80',
            className
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex w-full max-w-[320px] flex-col items-center justify-center px-6 py-8 text-center"
          >
            <InlineLoadingAnimation size={120} label={title} />

            <h3 className="mb-2 mt-5 text-base font-semibold text-white/90">
              {title}
            </h3>

            <div className="relative flex h-6 w-full items-center justify-center overflow-hidden">
              <p className="w-full text-sm text-white/50">{steps[currentStep]}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
