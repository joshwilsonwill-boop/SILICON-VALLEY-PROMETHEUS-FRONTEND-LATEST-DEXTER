'use client'

export interface InlineLoadingAnimationProps {
  className?: string
  label?: string
  size?: number
}

/**
 * Lightweight inline loader used inside compact UI (buttons, chips, drop zones).
 * Deliberately NOT the cinematic logo-video — that full treatment belongs to the
 * overlay `LoadingAnimation` / `CinematicLogoLoader`, not to inline surfaces
 * where a large looping WebM would crowd the layout.
 */
export function InlineLoadingAnimation({ className, label, size = 16 }: InlineLoadingAnimationProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={`inline-flex shrink-0 items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <span className="relative block h-full w-full">
        <span className="absolute inset-0 animate-spin rounded-full border-[2px] border-white/12 border-t-white/70" style={{ borderWidth: Math.max(1.5, size * 0.12) }} />
      </span>
    </span>
  )
}
