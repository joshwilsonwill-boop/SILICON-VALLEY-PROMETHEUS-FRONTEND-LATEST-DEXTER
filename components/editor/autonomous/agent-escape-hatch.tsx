'use client'

/**
 * AgentEscapeHatch
 *
 * The mandatory "emergency disconnect" pill required by any complete UI takeover.
 * Any user with visual access to the screen must immediately understand how to
 * reclaim control — this component makes that affordance impossible to miss.
 *
 * Design intent:
 *   - Persistent bottom-centre floating pill: "Move mouse or press ESC to resume"
 *   - Appears with a soft upward spring entry when isTakeover becomes true
 *   - Dismisses immediately on: ESC keydown, pointer movement > velocity threshold (normalized for 60-240Hz),
 *     or any pointerdown event (handled by coordinator's barge-in logic)
 *   - Animated gradient border (defined in globals.css)
 *   - High contrast white text on backdrop-blurred pill
 *   - Suppressed during yielding/idle phase to prevent flicker
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'

// Velocity threshold in px/ms (approx 9px/frame at 60fps = 0.56 px/ms, uniform across 60Hz-240Hz monitors)
const VELOCITY_THRESHOLD_PX_PER_MS = 0.55

export function AgentEscapeHatch() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [isTakeover, setIsTakeover] = useState(false)
  const lastSampleRef = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const unsub = autonomousCoordinator.subscribe((s: GhostCursorState) => {
      // Only show during active takeover, not during the yielding fade-out
      setIsTakeover(s.isTakeover && s.phase !== 'yielding' && s.phase !== 'idle')
    })
    return unsub
  }, [])

  // Mouse velocity barge-in — normalized against time delta
  useEffect(() => {
    if (!isTakeover) return

    const handleMouseMove = (e: MouseEvent) => {
      const now = e.timeStamp || performance.now()
      if (!lastSampleRef.current) {
        lastSampleRef.current = { x: e.clientX, y: e.clientY, time: now }
        return
      }

      const dt = Math.max(now - lastSampleRef.current.time, 6) // avoid div by 0
      const dx = e.clientX - lastSampleRef.current.x
      const dy = e.clientY - lastSampleRef.current.y
      const dist = Math.hypot(dx, dy)
      const velocity = dist / dt

      lastSampleRef.current = { x: e.clientX, y: e.clientY, time: now }

      if (velocity > VELOCITY_THRESHOLD_PX_PER_MS) {
        autonomousCoordinator.abortAction('user_barge_in')
      }
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        autonomousCoordinator.abortAction('user_barge_in')
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('keydown', handleEsc, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleEsc)
      lastSampleRef.current = null
    }
  }, [isTakeover])

  return (
    <AnimatePresence>
      {isTakeover && (
        <motion.div
          key="escape-hatch"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[9998] -translate-x-1/2"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 8, scale: 0.96 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 340, damping: 32, mass: 0.6 }
          }
          aria-live="polite"
          aria-label="Jarvis is in control. Move mouse or press Escape to resume."
          role="status"
        >
          {/* Outer animated border ring */}
          <div
            className="relative rounded-full p-[1px]"
            style={{
              background: prefersReducedMotion
                ? 'rgba(255,255,255,0.12)'
                : 'linear-gradient(90deg, rgba(0,240,255,0.40) 0%, rgba(255,255,255,0.08) 50%, rgba(0,240,255,0.40) 100%)',
              backgroundSize: '200% 100%',
              backgroundPosition: '0% 0%',
              animation: prefersReducedMotion ? undefined : 'escape-hatch-border 3s linear infinite',
            }}
          >
            {/* Inner pill body */}
            <div className="flex items-center gap-2.5 rounded-full bg-black/[0.82] px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              {/* Pulsing cyan dot indicating live agent status */}
              {!prefersReducedMotion && (
                <span
                  className="relative flex h-2 w-2 shrink-0"
                  aria-hidden="true"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f0ff] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00f0ff]" />
                </span>
              )}

              {/* Label */}
              <span className="select-none whitespace-nowrap text-[11px] font-medium tracking-wide text-white/80">
                Move mouse or press{' '}
                <kbd className="rounded border border-white/20 bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                  ESC
                </kbd>{' '}
                to resume control
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
