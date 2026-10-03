'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CinematicSkeletalLoader } from '@/components/loading-animation'

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
  'Mapping creative intent with Jarvis...',
  'Analyzing transcript cues...',
  'Compiling kinetic typography on Modal...',
  'Preparing cinematic preview...'
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
        <CinematicSkeletalLoader
          variant="stage"
          label={title}
          sublabel={steps[currentStep]}
          className={className}
        />
      )}
    </AnimatePresence>
  )
}
