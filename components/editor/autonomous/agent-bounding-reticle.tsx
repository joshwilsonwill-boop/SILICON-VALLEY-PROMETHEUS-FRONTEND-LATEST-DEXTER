'use client'

/**
 * AgentBoundingReticle
 *
 * Pre-intent bounding box that springs to life around the anticipated target
 * ~200–300ms before the ghost cursor executes a click.
 *
 * Design intent:
 *   - Precision corner ticks (not a full border) communicate intent with military
 *     accuracy while staying visually lightweight
 *   - Outward breathing offset around the target element rect (clamped for small targets)
 *   - Accent-colored border morphs smoothly between elements via GPU-accelerated spring
 *   - Corner SVG marks are drawn in cyan with a secondary white stroke for depth
 *   - Continuous marching ants dashed border perimeter animation
 *   - On activeTargetRect (when click is imminent), the box scales slightly inward
 *     (0.97) to match the micro-compression of the click shockwave
 */

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'

// Offset padding (breathing space) in pixels
const RETICLE_PAD = 6
// Corner tick length in pixels
const TICK_LEN = 12
// Corner tick stroke width
const TICK_W = 1.5

interface ReticleBox {
  left: number
  top: number
  width: number
  height: number
  isImminent: boolean // true when cursor is already hovering / about to click
}

function buildReticleBox(
  rect: DOMRect | null,
  isImminent: boolean,
  pad = RETICLE_PAD
): ReticleBox | null {
  if (!rect) return null
  const paddedW = Math.max(rect.width + pad * 2, 36)
  const paddedH = Math.max(rect.height + pad * 2, 28)
  const left = rect.left + rect.width / 2 - paddedW / 2
  const top = rect.top + rect.height / 2 - paddedH / 2

  return {
    left,
    top,
    width: paddedW,
    height: paddedH,
    isImminent,
  }
}

/** Renders the four L-shaped corner ticks of the reticle as SVG */
function CornerTicks({
  width,
  height,
  color,
}: {
  width: number
  height: number
  color: string
}) {
  const L = TICK_LEN
  const W = TICK_W
  const corners = [
    // top-left
    `M ${L} 0 L 0 0 L 0 ${L}`,
    // top-right
    `M ${width - L} 0 L ${width} 0 L ${width} ${L}`,
    // bottom-left
    `M 0 ${height - L} L 0 ${height} L ${L} ${height}`,
    // bottom-right
    `M ${width - L} ${height} L ${width} ${height} L ${width} ${height - L}`,
  ]

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      {corners.map((d, i) => (
        <React.Fragment key={i}>
          {/* White backing stroke for depth */}
          <path d={d} stroke="rgba(255,255,255,0.4)" strokeWidth={W + 1} strokeLinecap="square" />
          {/* Accent stroke */}
          <path d={d} stroke={color} strokeWidth={W} strokeLinecap="square" />
        </React.Fragment>
      ))}
    </svg>
  )
}

export function AgentBoundingReticle() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [state, setState] = useState<GhostCursorState | null>(null)

  useEffect(() => {
    const unsub = autonomousCoordinator.subscribe((s) => setState({ ...s }))
    return unsub
  }, [])

  // Anticipated rect = pre-cursor signal (show reticle before cursor arrives)
  // Active rect = cursor is here (collapse slightly, click imminent)
  const anticipatedBox = useMemo(
    () => buildReticleBox(state?.anticipatedTargetRect ?? null, false),
    [state?.anticipatedTargetRect]
  )

  const activeBox = useMemo(
    () =>
      buildReticleBox(
        state?.activeTargetRect ?? null,
        state?.phase === 'hovering' || state?.phase === 'clicking'
      ),
    [state?.activeTargetRect, state?.phase]
  )

  // Prefer activeBox when hovering; use anticipatedBox for pre-signal
  const displayBox =
    state?.phase === 'hovering' || state?.phase === 'clicking' ? activeBox : anticipatedBox

  const isVisible = !!displayBox && (state?.visible || !!state?.anticipatedTargetRect)
  const isImminent = displayBox?.isImminent ?? false
  const accentColor = isImminent ? '#7ff2d4' : '#00f0ff'

  // User directive: completely remove the bounding box / marching-ants reticle artifacts around the mouse and elements.
  // We explicitly return null so that no dashed border or bounding box ever renders in the viewport.
  return null
}
