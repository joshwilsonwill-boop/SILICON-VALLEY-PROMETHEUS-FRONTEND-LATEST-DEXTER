'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'

export function AgenticCursorLayer() {
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
  })

  useEffect(() => {
    const unsubscribe = autonomousCoordinator.subscribe((nextState) => {
      setCursorState(nextState)
    })
    return unsubscribe
  }, [])

  if (!cursorState.visible && cursorState.phase === 'idle') {
    return null
  }

  const { x, y, visible, isClicking, statusText, activeTargetRect } = cursorState

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Ambient Target Highlight Box */}
      <AnimatePresence>
        {activeTargetRect && visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none fixed rounded-md border-2 border-[#00f0ff]/60 bg-[#00f0ff]/[0.05] shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            style={{
              left: activeTargetRect.left - 4,
              top: activeTargetRect.top - 4,
              width: activeTargetRect.width + 8,
              height: activeTargetRect.height + 8,
            }}
          />
        )}
      </AnimatePresence>

      {/* 2. Ghost Cursor Element with smooth translate */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: isClicking ? 0.88 : 1,
              x: x,
              y: y,
            }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{
              type: 'spring',
              stiffness: 700,
              damping: 40,
              mass: 0.2,
              opacity: { duration: 0.14 },
            }}
            className="pointer-events-none fixed left-0 top-0 will-change-transform"
          >
            {/* Cyan Neon Mouse Pointer SVG */}
            <div className="relative">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_0_8px_rgba(0,240,255,0.85)] filter"
              >
                <path
                  d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                  fill="#00f0ff"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                <circle cx="2" cy="2" r="1.5" fill="#7ff2d4" />
              </svg>

              {/* Click Ripple Wave */}
              {isClicking && (
                <motion.span
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2.4, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="absolute -left-2 -top-2 size-8 rounded-full border-2 border-[#00f0ff] bg-[#00f0ff]/20"
                />
              )}

              {/* Status Badge / Micro-Pill */}
              {statusText && (
                <motion.div
                  initial={{ opacity: 0, y: 6, x: 12 }}
                  animate={{ opacity: 1, y: 0, x: 14 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-3 top-4 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-black/80 px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md"
                >
                  <Sparkles className="size-3 text-[#00f0ff] animate-pulse" />
                  <span>{statusText}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
