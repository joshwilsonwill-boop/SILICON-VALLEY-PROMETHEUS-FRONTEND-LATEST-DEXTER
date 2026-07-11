'use client'

import { cn } from '@/lib/utils'

import { CanvasLoadingAnimation } from './LoadingAnimation'

export interface InlineLoadingAnimationProps {
  className?: string
  label?: string
  size?: number
}

export function InlineLoadingAnimation({
  className,
  label = 'Loading',
  size,
}: InlineLoadingAnimationProps) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center', className)}
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        backgroundColor: 'transparent',
      }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <CanvasLoadingAnimation inline size={size} className="size-full" />
    </span>
  )
}
