'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type MinimalTypographicLoaderProps = {
  ambient?: boolean
  className?: string
  label?: string
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'screen' | 'panel' | 'inline'
}

const ROOT_VARIANT_CLASS_NAMES = {
  screen: 'min-h-dvh px-6 py-12',
  panel: 'min-h-[clamp(14rem,34vh,26rem)] px-6 py-8',
  inline: 'min-h-[clamp(9rem,24vh,15rem)] px-4 py-5',
} as const

const LOADER_SIZE_CLASS_NAMES = {
  sm: 'w-[min(8.5rem,54vw)]',
  md: 'w-[min(13rem,60vw)]',
  lg: 'w-[min(18rem,68vw)]',
} as const

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined

  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)

  return () => query.removeEventListener('change', callback)
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return true

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getReducedMotionServerSnapshot() {
  return true
}

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  )
}

function PrometheusApertureLoader({
  reducedMotion,
}: {
  reducedMotion: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('prometheus-aperture-loader', reducedMotion && 'is-reduced-motion')}
    >
      <span className="prometheus-aperture-loader__halo" />
      <span className="prometheus-aperture-loader__ring" />
      <span className="prometheus-aperture-loader__mark" />
      <span className="prometheus-aperture-loader__scan" />
    </div>
  )
}

export function MinimalTypographicLoader({
  ambient = true,
  className,
  label = 'Loading...',
  message = 'Preparing the workspace.',
  size = 'lg',
  variant = 'screen',
}: MinimalTypographicLoaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const ariaLabel = message ? `${label} ${message}` : label

  return (
    <section
      className={cn(
        'pointer-events-none relative flex w-full items-center justify-center overflow-visible bg-transparent',
        ROOT_VARIANT_CLASS_NAMES[variant],
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {ambient ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.07)_0%,rgba(118,92,255,0.045)_30%,rgba(0,0,0,0)_66%)]"
        />
      ) : null}
      <div
        className={cn(
          'prometheus-logo-loader relative aspect-square select-none overflow-visible',
          LOADER_SIZE_CLASS_NAMES[size],
          prefersReducedMotion && 'opacity-90',
        )}
      >
        <PrometheusApertureLoader reducedMotion={prefersReducedMotion} />
      </div>
      <span className="sr-only">{ariaLabel}</span>
    </section>
  )
}