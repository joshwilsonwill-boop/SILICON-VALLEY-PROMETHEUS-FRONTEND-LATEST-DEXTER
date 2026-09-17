'use client'

/**
 * AgenticCursorLayer  (v2 — Cinematic Takeover)
 *
 * The root orchestration shell for the Jarvis autonomous takeover UX.
 * Renders ALL cinematic layers in a single z-indexed fixed overlay:
 *
 *   z-[9990]  AgentTakeoverScrim      — ambient scrim (darkening + saturation pull)
 *   z-[9991]  (spotlight glow ring)   — rendered inside scrim component
 *   z-[9995]  AgentBoundingReticle    — pre-intent corner-tick target box & marching ants
 *   z-[9997]  Ghost cursor shell      — pointer SVG + velocity squish + shockwaves + pill
 *   z-[9998]  AgentEscapeHatch        — bottom-centre ESC & velocity emergency hatch
 *
 * Ghost cursor upgrades from v1:
 *   - Velocity-based squish deformation (X squish on fast horizontal moves)
 *   - Click shockwave: two concentric expanding rings (damped opacity fade)
 *   - Target micro-compression: scale(0.97) on click phase for tactile feel
 *   - Dynamic action pill with three visual modes:
 *       'action'  → Sparkles icon + declarative label ("Opening Music Studio")
 *       'waiting' → Spinning loader icon (indeterminate)
 *       'typing'  → Animated caret/pencil icon (text insertion phase)
 *       'idle'    → pill hidden
 *   - Pill has spring delay tether (feels physically attached to cursor)
 *   - All event listeners (transcript cut, music select, seek, preview control,
 *     tab switch) are preserved from v1, with beginTakeover/endTakeover wiring added
 *   - prefers-reduced-motion respected at every layer
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { LoaderCircle, Pencil, Sparkles } from 'lucide-react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState, PillMode } from '@/lib/autonomous-ui/types'

import { AgentViewportMovingBorder } from './agent-viewport-moving-border'
import { Agent3DCursor } from './agent-3d-cursor'
import { AgentTakeoverScrim } from './agent-takeover-scrim'
import { AgentBoundingReticle } from './agent-bounding-reticle'
import { AgentEscapeHatch } from './agent-escape-hatch'

// ─── Pill icon mapping ───────────────────────────────────────────────────────

function PillIcon({ mode }: { mode: PillMode }) {
  if (mode === 'waiting') {
    return (
      <LoaderCircle
        className="h-3 w-3 animate-spin text-[#00f0ff]"
        aria-label="Processing"
      />
    )
  }
  if (mode === 'typing') {
    return (
      <Pencil
        className="h-3 w-3 text-[#7ff2d4]"
        aria-label="Typing"
        strokeWidth={2}
      />
    )
  }
  // 'action' (default)
  return (
    <Sparkles className="h-3 w-3 animate-pulse text-[#00f0ff]" aria-label="Acting" />
  )
}

// ─── Click Shockwave ─────────────────────────────────────────────────────────

interface ShockwaveProps {
  x: number
  y: number
}

/**
 * Two-ring radial impulse: inner ring is faster and more opaque,
 * outer ring is slower and dimmer — simulating damped physical inertia.
 */
function ClickShockwave({ x, y }: ShockwaveProps) {
  return (
    <>
      {/* Inner ring — fast, more visible */}
      <motion.span
        key="shockwave-inner"
        className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00f0ff]"
        style={{ left: x, top: y, width: 16, height: 16 }}
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{ scale: 3.2, opacity: 0 }}
        transition={{ duration: 0.38, ease: [0.1, 0.6, 0.4, 1] }}
        aria-hidden="true"
      />
      {/* Outer ring — slow, wide, almost transparent */}
      <motion.span
        key="shockwave-outer"
        className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00f0ff]/40 bg-[#00f0ff]/10"
        style={{ left: x, top: y, width: 32, height: 32 }}
        initial={{ scale: 0.6, opacity: 0.45 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      />
    </>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AgenticCursorLayer() {
  const prefersReducedMotion = useReducedMotion() ?? false

  const [cursorState, setCursorState] = useState<GhostCursorState>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    visible: false,
    isClicking: false,
    statusText: null,
    activeTargetRect: null,
    phase: 'idle',
    // Cinematic Takeover fields
    isTakeover: false,
    pillMode: 'idle',
    anticipatedTargetRect: null,
    spotlightRect: null,
  })

  // Track previous click state to know when a new click just fired
  const [clickFlash, setClickFlash] = useState(false)
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 })
  const clickCountRef = useRef(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Expose coordinator to window for debugging/dev tools
      ;(window as unknown as { autonomousCoordinator?: typeof autonomousCoordinator })
        .autonomousCoordinator = autonomousCoordinator

      // ── Custom event bridges (all preserved from v1) ───────────────────────

      const handleTranscriptCut = (e: Event) => {
        const detail = (e as CustomEvent<{ phrase?: string }>).detail
        if (detail?.phrase) {
          autonomousCoordinator.executeTranscriptCut(detail.phrase)
        }
      }

      const handleMusicSelect = (e: Event) => {
        const detail = (e as CustomEvent<{ genreOrMood?: string; trackId?: string }>).detail
        autonomousCoordinator.executeMusicSelection(detail)
      }

      const handleSeekTimeline = (e: Event) => {
        const detail = (e as CustomEvent<{ timeSec?: number }>).detail
        if (typeof detail?.timeSec === 'number') {
          autonomousCoordinator.executeSeekTimeline(detail.timeSec)
        }
      }

      const handlePreviewControl = (e: Event) => {
        const detail = (e as CustomEvent<{ command?: 'play' | 'pause' | 'mute' | 'unmute' }>).detail
        if (detail?.command) {
          autonomousCoordinator.executePreviewControl(detail.command)
        }
      }

      const handleTabSwitch = (e: Event) => {
        const detail = (e as CustomEvent<{ tab?: 'Editor' | 'Music' | 'Motion' }>).detail
        if (detail?.tab) {
          autonomousCoordinator.executeTabSwitch(detail.tab)
        }
      }

      // ── New v2: beginTakeover / endTakeover bridges ────────────────────────

      const handleBeginTakeover = (e: Event) => {
        const detail = (e as CustomEvent<{ label?: string }>).detail
        autonomousCoordinator.beginTakeover(detail?.label)
      }

      const handleEndTakeover = () => {
        autonomousCoordinator.endTakeover()
      }

      const handleTakeover = (e: Event) => {
        const detail = (e as CustomEvent<{ tab?: any }>).detail
        autonomousCoordinator.executeAutonomousTakeover(detail?.tab ?? 'Motion')
      }

      window.addEventListener('prometheus:autonomous-transcript-cut', handleTranscriptCut)
      window.addEventListener('prometheus:autonomous-music-select', handleMusicSelect)
      window.addEventListener('prometheus:autonomous-seek-timeline', handleSeekTimeline)
      window.addEventListener('prometheus:autonomous-preview-control', handlePreviewControl)
      window.addEventListener('prometheus:autonomous-tab-switch', handleTabSwitch)
      window.addEventListener('prometheus:autonomous-begin-takeover', handleBeginTakeover)
      window.addEventListener('prometheus:autonomous-end-takeover', handleEndTakeover)
      window.addEventListener('prometheus:autonomous-takeover', handleTakeover)

      const unsubscribe = autonomousCoordinator.subscribe((nextState) => {
        setCursorState((prev) => {
          // Detect new click events to trigger shockwave
          if (!prev.isClicking && nextState.isClicking) {
            clickCountRef.current += 1
            setClickFlash(true)
            setClickPos({ x: nextState.x, y: nextState.y })
            setTimeout(() => setClickFlash(false), 600)
          }
          return nextState
        })
      })

      return () => {
        window.removeEventListener('prometheus:autonomous-transcript-cut', handleTranscriptCut)
        window.removeEventListener('prometheus:autonomous-music-select', handleMusicSelect)
        window.removeEventListener('prometheus:autonomous-seek-timeline', handleSeekTimeline)
        window.removeEventListener('prometheus:autonomous-preview-control', handlePreviewControl)
        window.removeEventListener('prometheus:autonomous-tab-switch', handleTabSwitch)
        window.removeEventListener('prometheus:autonomous-begin-takeover', handleBeginTakeover)
        window.removeEventListener('prometheus:autonomous-end-takeover', handleEndTakeover)
        window.removeEventListener('prometheus:autonomous-takeover', handleTakeover)
        unsubscribe()
      }
    }
    // NOTE: the subscriber is registered INSIDE the if(window) block above.
    // Do NOT add a second subscriber here — it would create a duplicate.
  }, [])

  const { x, y, visible, isClicking, statusText, pillMode, phase, tiltAngleDeg } = cursorState

  // Derive velocity-squish transforms from phase
  const isMovingFast = phase === 'moving'
  const isActuallyClicking = phase === 'clicking'

  const scaleX = isActuallyClicking ? 1.18 : isMovingFast ? 0.86 : 1
  const scaleY = isActuallyClicking ? 0.80 : isMovingFast ? 1.16 : 1
  // Spec: scale(0.97) micro-compression — tactile, not dramatic
  const cursorScale = isActuallyClicking ? 0.97 : 1
  const cursorRotate = prefersReducedMotion ? 0 : (tiltAngleDeg ?? 0)

  // Show pill only when there is a label and not in idle mode
  const showPill = !!statusText && pillMode !== 'idle' && visible

  // Don't render anything if fully idle
  if (!cursorState.visible && cursorState.phase === 'idle' && !cursorState.isTakeover) {
    return null
  }

  return (
    <>
      {/* ── Cinematic Layers (ordered by z-index) ───────────────────────── */}

      {/* z-[9989] Viewport Perimeter Moving Border (Aceternity continuous moving gradient) */}
      <AgentViewportMovingBorder />

      {/* z-[9990-9991] Ambient scrim + spotlight */}
      <AgentTakeoverScrim />

      {/* z-[9995] Bounding reticle */}
      <AgentBoundingReticle />

      {/* ── Ghost Cursor Shell ──────────────────────────────────────────── */}
      {/* Note: overflow-hidden removed — has no effect on position:fixed children */}
      <div
        className="pointer-events-none fixed inset-0 z-[9997] select-none"
        aria-hidden="true"
      >
        {/* Click shockwave — rendered behind cursor */}
        <AnimatePresence>
          {clickFlash && !prefersReducedMotion && (
            <ClickShockwave
              key={`sw-${clickCountRef.current}`}
              x={clickPos.x}
              y={clickPos.y}
            />
          )}
        </AnimatePresence>

        {/* Ghost cursor + action pill */}
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.65 }}
              animate={{
                opacity: 1,
                scale: cursorScale,
                scaleX: prefersReducedMotion ? 1 : scaleX,
                scaleY: prefersReducedMotion ? 1 : scaleY,
                rotate: cursorRotate,
                x: x,
                y: y,
              }}
              exit={{ opacity: 0, scale: 0.65 }}
              transition={{
                x: { duration: 0 },
                y: { duration: 0 },
                scale: { type: 'spring', stiffness: 680, damping: 36 },
                scaleX: { type: 'spring', stiffness: 480, damping: 26 },
                scaleY: { type: 'spring', stiffness: 480, damping: 26 },
                rotate: { type: 'spring', stiffness: 450, damping: 28 },
                opacity: { duration: 0.14 },
              }}
              className="pointer-events-none fixed left-0 top-0 will-change-transform"
            >
              <div className="relative">
                {/* ── 3D Pillowy Claymorphic Arrow Cursor (Matches user reference) ── */}
                <Agent3DCursor isClicking={isActuallyClicking} />

                {/* ── Outer glow halo around cursor ──────────────────── */}
                {!prefersReducedMotion && (
                  <motion.span
                    className="pointer-events-none absolute -left-3 -top-3 h-10 w-10 rounded-full"
                    animate={{
                      opacity: isActuallyClicking ? 0.6 : 0.28,
                      scale: isActuallyClicking ? 1.3 : 1,
                    }}
                    transition={{ duration: 0.18 }}
                    style={{
                      background:
                        'radial-gradient(circle, rgba(0,240,255,0.35) 0%, transparent 70%)',
                      // Compositor-only animation — no paint
                      willChange: 'transform, opacity',
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* ── Dynamic Action Pill ─────────────────────────────── */}
                {/* aria-live so screen readers hear mode changes */}
                <AnimatePresence>
                  {showPill && (
                    <motion.div
                      key={`pill-${pillMode}`}
                      role="status"
                      aria-live="polite"
                      aria-label={`Jarvis: ${statusText}`}
                      initial={{ opacity: 0, y: 8, x: 14, scale: 0.88 }}
                      animate={{ opacity: 1, y: 2, x: 16, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.92 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.1 }
                          : {
                              type: 'spring',
                              stiffness: 380,
                              damping: 28,
                              // Spring delay = slight tether lag behind cursor
                              delay: 0.04,
                            }
                      }
                      className="absolute left-3 top-5 flex min-w-[80px] items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.14] bg-black/[0.84] px-2.5 py-[5px] shadow-[0_4px_20px_rgba(0,0,0,0.65),0_0_0_1px_rgba(0,240,255,0.08)] backdrop-blur-xl"
                    >
                      <PillIcon mode={pillMode} />
                      <span className="text-[11px] font-medium leading-none tracking-wide text-white/90">
                        {statusText}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* z-[9998] Escape hatch — always last so it's never occluded */}
      <AgentEscapeHatch />
    </>
  )
}
