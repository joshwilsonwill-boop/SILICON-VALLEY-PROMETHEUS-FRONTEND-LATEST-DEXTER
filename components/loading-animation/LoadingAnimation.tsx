'use client'

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
 * Loading artwork has been intentionally removed from the frontend.
 * The component remains as a compatibility boundary for existing async flows.
 */
export function LoadingAnimation(_props: LoadingAnimationProps) {
  return null
}

export function CanvasLoadingAnimation(_props: CanvasLoadingAnimationProps) {
  return null
}