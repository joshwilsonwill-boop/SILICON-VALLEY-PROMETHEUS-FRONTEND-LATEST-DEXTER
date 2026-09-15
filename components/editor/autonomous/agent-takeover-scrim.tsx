'use client'

/**
 * AgentTakeoverScrim
 *
 * Ambient scrim + radial spotlight masking for the Jarvis autonomous takeover UX.
 *
 * Design intent:
 *   - When isTakeover is true, a translucent dark veil covers the full viewport
 *     at 20–28% opacity, suppressing visual competition from idle sidebar items.
 *   - A soft radial "spotlight" cutout breathes around the active interaction zone
 *     (spotlightRect), achieved via a CSS radial-gradient hole in the scrim layer.
 *   - A secondary glow ring (box-shadow) sits over the spotlight zone for a subtle
 *     luminosity lift — GPU accelerated via transform (x/y) with spring physics.
 *   - backdrop-filter saturation drop is applied to the scrim for focus pull.
 *   - Respects prefers-reduced-motion — falls back to a simple opacity scrim only.
 *   - Recomputes on viewport resize smoothly.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'

// ─── Spring config ──────────────────────────────────────────────────────────
const SPRING_SCRIM = { type: 'spring', stiffness: 280, damping: 36, mass: 0.8 } as const

// Padding added around the spotlight rect (breathing space)
const SPOTLIGHT_PAD = 32

interface SpotlightBox {
  left: number
  top: number
  width: number
  height: number
  cx: number // centre x
  cy: number // centre y
  rx: number // half-width of ellipse for gradient
  ry: number // half-height
  // Stable identity keys for memoization
  _key: string
}

function rectToSpotlight(rect: DOMRect | null, pad = SPOTLIGHT_PAD): SpotlightBox | null {
  if (!rect) return null
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return {
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    cx,
    cy,
    rx: rect.width / 2 + pad * 1.8,
    ry: rect.height / 2 + pad * 1.8,
    _key: `${Math.round(cx)}_${Math.round(cy)}`,
  }
}

export function AgentTakeoverScrim() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [state, setState] = useState<GhostCursorState | null>(null)
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  })

  useEffect(() => {
    const unsub = autonomousCoordinator.subscribe((s) => setState({ ...s }))
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      unsub()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const isTakeover = state?.isTakeover ?? false

  const sr = state?.spotlightRect
  const spot = useMemo(
    () => rectToSpotlight(sr ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sr?.left, sr?.top, sr?.width, sr?.height]
  )

  // Build the CSS radial-gradient that creates the spotlight "hole" in the scrim.
  const scrimGradient = useMemo(() => {
    if (!spot || prefersReducedMotion) return 'rgba(0,0,0,0.22)'
    const vw = viewport.width || 1440
    const vh = viewport.height || 900
    const cpx = ((spot.cx / vw) * 100).toFixed(2)
    const cpy = ((spot.cy / vh) * 100).toFixed(2)
    const erx = ((spot.rx / vw) * 100).toFixed(2)
    const ery = ((spot.ry / vh) * 100).toFixed(2)
    return `radial-gradient(ellipse ${erx}vw ${ery}vh at ${cpx}% ${cpy}%, transparent 0%, rgba(0,0,0,0.20) 65%, rgba(0,0,0,0.26) 100%)`
  }, [spot, prefersReducedMotion, viewport])

  return (
    <>
      {/* ── Layer 1: Ambient Scrim ────────────────────────────────────────── */}
      <AnimatePresence>
        {isTakeover && (
          <motion.div
            key="takeover-scrim"
            className="pointer-events-none fixed inset-0 z-[9990]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.38, ease: 'easeOut' }}
            style={{
              background: scrimGradient,
              backdropFilter: prefersReducedMotion ? undefined : 'saturate(0.55)',
              WebkitBackdropFilter: prefersReducedMotion ? undefined : 'saturate(0.55)',
              willChange: 'opacity',
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Layer 2: Spotlight Glow Ring (GPU accelerated via translate3d) ─ */}
      <AnimatePresence>
        {isTakeover && spot && !prefersReducedMotion && (
          <motion.div
            key="takeover-spotlight-ring"
            className="pointer-events-none fixed left-0 top-0 z-[9991] rounded-xl will-change-transform"
            initial={{
              opacity: 0,
              scale: 0.94,
              x: spot.left,
              y: spot.top,
              width: spot.width,
              height: spot.height,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: spot.left,
              y: spot.top,
              width: spot.width,
              height: spot.height,
            }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={SPRING_SCRIM}
            style={{
              boxShadow:
                '0 0 0 1px rgba(0,240,255,0.12), ' +
                '0 0 40px 8px rgba(0,240,255,0.08), ' +
                '0 0 80px 24px rgba(0,200,220,0.05)',
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
