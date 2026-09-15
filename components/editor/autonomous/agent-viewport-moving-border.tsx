'use client'

/**
 * AgentViewportMovingBorder
 *
 * Continuous cinematic moving gradient traveling along the perimeter of the viewport.
 * Built using the Aceternity MovingBorder pattern with SVG getPointAtLength and useAnimationFrame.
 *
 * Design intent:
 *   - When isTakeover is active, the entire viewport frame is outlined with an automated
 *     takeover indicator shade.
 *   - A luminous radial gradient comet (cyan / mint / electric glow) streams continuously
 *     around the outer edge of the screen.
 *   - Uses a 3px border mask so the beam is strictly clipped to the perimeter frame.
 *   - Ambient inner shade (subtle vignette) along the viewport edges.
 *   - Hardware-accelerated and respects prefers-reduced-motion.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  motion,
  AnimatePresence,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from 'framer-motion'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'

interface MovingBorderProps {
  duration?: number
  rx?: number
  ry?: number
}

function ViewportMovingBorderBeam({ duration = 3800, rx = 16, ry = 16 }: MovingBorderProps) {
  const pathRef = useRef<SVGRectElement | null>(null)
  const progress = useMotionValue<number>(0)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  })

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength()
    if (length) {
      const pxPerMillisecond = length / duration
      progress.set((time * pxPerMillisecond) % length)
    }
  })

  const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val)?.x ?? 0)
  const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val)?.y ?? 0)
  const transform = useMotionTemplate`translate3d(${x}px, ${y}px, 0) translate3d(-50%, -50%, 0)`

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 h-full w-full"
        width={dimensions.width}
        height={dimensions.height}
        aria-hidden="true"
      >
        <rect
          ref={pathRef}
          fill="none"
          x={2}
          y={2}
          width={Math.max(0, dimensions.width - 4)}
          height={Math.max(0, dimensions.height - 4)}
          rx={rx}
          ry={ry}
        />
      </svg>
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'inline-block',
          transform,
          willChange: 'transform',
        }}
        aria-hidden="true"
      >
        {/* Luminous multi-stage radial comet beam */}
        <div className="h-72 w-72 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.95)_0%,rgba(0,240,255,0.45)_25%,rgba(127,242,212,0.20)_45%,transparent_70%)] filter blur-[6px] md:h-96 md:w-96" />
      </motion.div>
    </>
  )
}

export function AgentViewportMovingBorder() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [isTakeover, setIsTakeover] = useState(false)

  useEffect(() => {
    const unsub = autonomousCoordinator.subscribe((s: GhostCursorState) => {
      setIsTakeover(s.isTakeover && s.phase !== 'idle')
    })
    return unsub
  }, [])

  return (
    <AnimatePresence>
      {isTakeover && (
        <motion.div
          key="viewport-moving-border-shell"
          className="pointer-events-none fixed inset-0 z-[9989] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.15 : 0.45, ease: 'easeOut' }}
          aria-hidden="true"
        >
          {/* Ambient perimeter vignette / automated type shade */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow:
                'inset 0 0 32px 2px rgba(0,240,255,0.12), ' +
                'inset 0 0 90px 16px rgba(0,0,0,0.55), ' +
                'inset 0 0 0 1px rgba(0,240,255,0.22)',
            }}
          />

          {/* Masked 3px perimeter track through which the radiant moving beam travels */}
          {!prefersReducedMotion && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                WebkitMaskImage:
                  'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                WebkitMaskClip: 'content-box, border-box',
                WebkitMaskComposite: 'xor',
                maskImage:
                  'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
                maskClip: 'content-box, border-box',
                maskComposite: 'exclude',
                padding: '3px',
                border: '3px solid transparent',
              }}
            >
              <ViewportMovingBorderBeam duration={4200} rx={16} ry={16} />
            </div>
          )}

          {/* Static fallback border when reduced motion is preferred */}
          {prefersReducedMotion && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#00f0ff]/40 shadow-[0_0_24px_rgba(0,240,255,0.25)_inset]" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
