'use client'

import * as React from 'react'
import { CinematicLogoLoader } from '@/components/loading-animation/cinematic-logo-loader'

export interface LoadingAnimationProps {
  className?: string
  message?: string
  onCancel?: () => void
}

export interface CanvasLoadingAnimationProps {
  className?: string
  inline?: boolean
  size?: number
}

/**
 * Full-screen cinematic Prometheus loader. Renders the alpha WebM logo over a
 * blurred, desaturated backdrop so the animation stays the sole focus while
 * content prepares.
 */
export function LoadingAnimation({ className, message, onCancel }: LoadingAnimationProps) {
  return (
    <CinematicLogoLoader
      variant="overlay"
      label="Loading"
      caption={message}
      className={className}
    >
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="pointer-events-auto mt-6 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-xs text-white/70 transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          Cancel
        </button>
      ) : null}
    </CinematicLogoLoader>
  )
}

export function CanvasLoadingAnimation({ className, inline = false, size }: CanvasLoadingAnimationProps) {
  return (
    <CinematicLogoLoader
      variant={inline ? 'inline' : 'overlay'}
      label="Loading"
      size={size}
      className={className}
    />
  )
}
