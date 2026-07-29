'use client'

import * as React from 'react'

const VIDEO_SRC = '/branding/prometheus-logo-cinematic.webm'
const FALLBACK_IMAGE_SRC = '/branding/prometheus-logo-no-bg.png'
const EXIT_DURATION_MS = 650

export interface CinematicLogoLoaderProps {
  caption?: string
  className?: string
  label?: string
  onExited?: () => void
  ready?: boolean
  size?: number
  variant?: 'overlay' | 'inline'
}

/**
 * Cinematic logo-video loader. The overlay variant covers the viewport with a
 * near-black vignette while the Prometheus logo loops behind a screen blend;
 * the inline variant is a compact glowing logo loop for pagination spinners.
 * The overlay plays a single fade/blur exit when `ready` flips true, then
 * unmounts itself.
 */
export function CinematicLogoLoader({
  caption = 'Preparing your soundtrack',
  className,
  label,
  onExited,
  ready = false,
  size,
  variant = 'overlay',
}: CinematicLogoLoaderProps) {
  const [videoReady, setVideoReady] = React.useState(false)
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
      {/* PNG fallback keeps the glow visible until the video stream is ready,
          so there is never a black flash or empty rectangle. */}
      <img
        src={FALLBACK_IMAGE_SRC}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain mix-blend-screen transition-opacity duration-500"
        style={{ opacity: videoReady ? 0 : 1 }}
      />
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src={VIDEO_SRC}
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain mix-blend-screen transition-opacity duration-500"
        style={{ opacity: videoReady ? 1 : 0 }}
        onLoadedData={() => setVideoReady(true)}
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
      {logo}
      {caption ? <p className="prom-cine-caption">{caption}</p> : null}
    </div>
  )
}

const PROM_CINE_STYLES = `
  .prom-cine-overlay {
    background: radial-gradient(115% 90% at 50% 44%, #0a0a0e 0%, #070708 46%, #050506 78%, #030304 100%);
  }
  .prom-cine-overlay .prom-cine-logo {
    width: 44vmin;
    height: 44vmin;
  }
  .prom-cine-logo {
    filter: drop-shadow(0 0 34px rgba(196, 208, 255, 0.22)) drop-shadow(0 0 9px rgba(255, 244, 224, 0.12));
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
    from { opacity: 1; transform: scale(1); filter: blur(0); }
    to { opacity: 0; transform: scale(1.04); filter: blur(6px); }
  }
`
