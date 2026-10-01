'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, AudioLines, Circle, Command, MousePointer2 } from 'lucide-react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'

const PHASE_LABELS: Record<GhostCursorState['phase'], string> = {
  idle: 'Ready for next action',
  moving: 'Moving through the edit',
  hovering: 'Holding position between actions',
  clicking: 'Applying an edit',
  yielding: 'Returning control',
}

export function AgentSessionHud() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [state, setState] = useState<GhostCursorState | null>(null)

  useEffect(() => autonomousCoordinator.subscribe((next) => setState({ ...next })), [])

  const active = state?.isTakeover ?? false
  const busy = active && state?.pillMode !== 'idle'
  const currentAction = (state?.statusText ?? 'Preparing the edit')
    .replace(/^Jarvis(?: is in control| taking control[^:]*|:)?\s*/i, '')
    .trim()

  return (
    <AnimatePresence>
      {active && (
        <motion.aside
          key="agent-session-hud"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8, scale: 0.99 }}
          transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 240, damping: 28 }}
          className="pointer-events-auto fixed right-5 top-5 z-[9999] w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-[18px] border border-white/[0.12] bg-[#090b0d]/90 text-white shadow-[0_20px_80px_rgba(0,0,0,0.55),0_0_35px_rgba(0,240,255,0.07)] backdrop-blur-2xl"
          aria-label="Autonomous editing session"
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00f0ff]/70 to-transparent" />
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  {busy && !prefersReducedMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00f0ff]/55" />}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.8)]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">Prometheus · autonomous session</p>
                  <p className="mt-1 truncate text-[13px] font-medium tracking-[-0.02em] text-white/90">{busy ? 'Editing in progress' : 'Editing access enabled'}</p>
                </div>
              </div>
              <span className="rounded-full border border-[#00f0ff]/20 bg-[#00f0ff]/[0.07] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[#8cf6ff]">{busy ? 'Live' : 'Ready'}</span>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.075] bg-white/[0.035] px-3.5 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
                <AudioLines className="h-3.5 w-3.5 text-[#76eaf4]" strokeWidth={1.7} />
                <span>{state?.pillMode === 'waiting' ? 'Waiting for an editor result' : PHASE_LABELS[state?.phase ?? 'idle']}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-white/85">{busy ? currentAction || 'Continuing the edit' : 'Ready for your next instruction'}</p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] text-white/42">
                <MousePointer2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                <span>Workspace movement and edit controls remain active</span>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[9px] text-white/35" aria-hidden="true">
                <Circle className="h-1.5 w-1.5 fill-[#00f0ff] text-[#00f0ff]" />
                <span>Session held</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-white/40"><Command className="h-3 w-3" /> ESC to return control</span>
              <button
                type="button"
                onClick={() => autonomousCoordinator.endTakeover()}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.13] bg-white/[0.07] px-2.5 py-1.5 text-[10px] font-medium text-white/80 transition-colors hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/70"
              >
                Return control <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
