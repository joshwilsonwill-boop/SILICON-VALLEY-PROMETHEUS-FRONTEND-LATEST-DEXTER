'use client'

import { CinematicLogoLoader } from '@/components/loading-animation/cinematic-logo-loader'

export interface InlineLoadingAnimationProps {
  className?: string
  label?: string
  size?: number
}

/**
 * Inline cinematic Prometheus loader. Renders the alpha WebM logo at the
 * requested size inside the current layout without an overlay.
 */
export function InlineLoadingAnimation({ className, label, size }: InlineLoadingAnimationProps) {
  return (
    <CinematicLogoLoader
      variant="inline"
      size={size}
      label={label}
      className={className}
    />
  )
}
