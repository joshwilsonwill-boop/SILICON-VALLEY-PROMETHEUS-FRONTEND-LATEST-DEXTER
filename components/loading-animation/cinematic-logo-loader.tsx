'use client'

import * as React from 'react'

const VIDEO_SRC = '/branding/prometheus-logo-cinematic.webm'
const EXIT_DURATION_MS = 650

export interface CinematicLogoLoaderProps {
  caption?: string
  children?: React.ReactNode
  className?: string
  label?: string
  onExited?: () => void
  ready?: boolean
  size?: number
  variant?: 'overlay' | 'inline'
}

/**
 * Transparent logo-video loader. The alpha-enabled WebM is rendered directly,
 * without a fallback frame, blend mode, backdrop, or synthetic glow.
 * The overlay plays a single fade/scale exit when `ready` flips true, then
 * unmounts itself.
 */
export function CinematicLogoLoader({
  caption,
  children,
  className,
  label,
  onExited,
  ready = false,
  size,
  variant = 'overlay',
}: CinematicLogoLoaderProps) {
  const [exiting, setExiting] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(ready)
  const exitStartedRef = React.useRef(false)

  React.useEffect(() => {
    if (!ready || exitStartedRef.current) return
    exitStartedRef.current = true
    setExiting(true)
    const timeout = window.setTimeout(() => {
      setDismissed(true)
      onExited?.()
    }, EXIT_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [ready, onExited])

  const logo = (
    <div
      className="prom-cine-logo relative"
      style={variant === 'inline' ? { width: size ?? 24, height: size ?? 24 } : undefined}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src={VIDEO_SRC}
        aria-hidden
        className="absolute inset-0 h-full w-full bg-transparent object-contain"
      />
    </div>
  )

  if (variant === 'inline') {
    return (
      <span
        role="status"
        aria-label={label ?? 'Loading'}
        className={`prom-cine-inline inline-flex shrink-0 items-center justify-center ${className ?? ''}`}
      >
        <style>{PROM_CINE_STYLES}</style>
        {logo}
      </span>
    )
  }

  if (dismissed) return null

  return (
    <div
      role="status"
      aria-label={label ?? caption}
      className={`prom-cine-overlay fixed inset-0 z-[110] flex flex-col items-center justify-center ${exiting ? 'prom-cine-exit' : 'prom-cine-enter'} ${className ?? ''}`}
    >
      <style>{PROM_CINE_STYLES}</style>
      <div className="prom-cine-backdrop" aria-hidden="true" />
      {logo}
      {caption ? <p className="prom-cine-caption">{caption}</p> : null}
      {children}
    </div>
  )
}

const PROM_CINE_STYLES = `
  .prom-cine-overlay {
    background: transparent;
  }
  .prom-cine-backdrop {
    position: fixed;
    inset: 0;
    z-index: -1;
    background: linear-gradient(180deg, rgba(4,4,6,0.86) 0%, rgba(6,6,8,0.9) 55%, rgba(3,3,5,0.92) 100%);
    backdrop-filter: blur(18px) saturate(0.72);
    -webkit-backdrop-filter: blur(18px) saturate(0.72);
  }
  .prom-cine-overlay .prom-cine-logo {
    width: 44vmin;
    height: 44vmin;
    filter: drop-shadow(0 0 36px rgba(255,255,255,0.10));
  }
  .prom-cine-logo,
  .prom-cine-logo video {
    background: transparent;
  }
  .prom-cine-caption {
    margin-top: 3.5vmin;
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.38em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.42);
  }
  .prom-cine-enter {
    animation: prom-cine-enter 700ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  .prom-cine-exit {
    animation: prom-cine-exit 650ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
  @keyframes prom-cine-enter {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes prom-cine-exit {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(1.04); }
  }
`
