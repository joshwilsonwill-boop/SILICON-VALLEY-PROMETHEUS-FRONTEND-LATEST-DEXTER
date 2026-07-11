'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

import { AnimationController } from './AnimationController'
import { getCanvasPixelRatio, RingRenderer } from './RingRenderer'

interface CanvasLoadingAnimationProps {
  className?: string
  inline: boolean
  size?: number
}

export interface LoadingAnimationProps {
  className?: string
  message?: string
  onCancel?: () => void
  zIndex?: number
}

export function CanvasLoadingAnimation({
  className,
  inline,
  size,
}: CanvasLoadingAnimationProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const context = canvas.getContext('2d')
    if (!context) return

    const controller = new AnimationController(performance.now())
    let renderer: RingRenderer | null = null
    let animationFrame = 0
    let lastWidth = 0
    let lastHeight = 0
    let lastDpr = 0

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const fallbackInlineSize = size ?? 120
      const width = Math.max(
        1,
        size ?? (rect.width || (inline ? fallbackInlineSize : window.innerWidth)),
      )
      const height = Math.max(
        1,
        size ?? (rect.height || (inline ? fallbackInlineSize : window.innerHeight)),
      )
      const dpr = getCanvasPixelRatio(width, height, inline, window.devicePixelRatio)

      if (width === lastWidth && height === lastHeight && dpr === lastDpr) return
      lastWidth = width
      lastHeight = height
      lastDpr = dpr

      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (renderer) renderer.setSize(width, height, dpr)
      else renderer = new RingRenderer(context, width, height, { inline, dpr })

      renderer.render(controller.update(performance.now()))
    }

    const animate = (timestamp: number) => {
      if (!renderer || document.hidden) {
        animationFrame = 0
        return
      }

      renderer.render(controller.update(timestamp))
      animationFrame = requestAnimationFrame(animate)
    }

    const handleVisibilityChange = () => {
      const timestamp = performance.now()

      if (document.hidden) {
        controller.pause(timestamp)
        if (animationFrame) cancelAnimationFrame(animationFrame)
        animationFrame = 0
        return
      }

      controller.resume(timestamp)
      if (!animationFrame) animationFrame = requestAnimationFrame(animate)
    }

    if (document.hidden) controller.pause(performance.now())
    resize()
    if (!document.hidden) animationFrame = requestAnimationFrame(animate)

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resize)
    resizeObserver?.observe(container)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (animationFrame) cancelAnimationFrame(animationFrame)
      if (renderer) renderer.destroy()
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [inline, size])

  return (
    <span
      ref={containerRef}
      className={cn('relative flex shrink-0 items-center justify-center overflow-hidden', className)}
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        backgroundColor: 'transparent',
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block size-full" />
    </span>
  )
}

export function LoadingAnimation({
  className,
  message,
  onCancel,
  zIndex = 9999,
}: LoadingAnimationProps) {
  const ariaLabel = message || 'Loading'

  return (
    <section
      className={cn('fixed inset-0 flex items-center justify-center overflow-hidden', className)}
      style={{
        backgroundColor: '#000000',
        zIndex,
        cursor: onCancel ? 'pointer' : 'default',
      }}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <CanvasLoadingAnimation inline={false} className="absolute inset-0" />
      {onCancel ? (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          aria-label="Cancel loading"
          onClick={onCancel}
        />
      ) : null}
      {message ? (
        <p className="pointer-events-none absolute left-1/2 top-[calc(50%+min(37vw,37vh)+2rem)] z-20 -translate-x-1/2 text-center text-sm font-medium uppercase tracking-widest text-white/60">
          {message}
        </p>
      ) : null}
    </section>
  )
}
