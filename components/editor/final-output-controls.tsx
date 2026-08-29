'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, Film, LoaderCircle } from 'lucide-react'

import type { FinalOutputLifecycle, FinalOutputView } from '@/lib/final-output'
import { cn } from '@/lib/utils'

export interface FinalOutputControlsProps {
  lifecycle: FinalOutputLifecycle
  view: FinalOutputView
  hasFinal: boolean
  revealId: string | null
  error: string | null
  onSelect: (view: FinalOutputView) => void
}

export function FinalOutputControls({
  lifecycle,
  view,
  hasFinal,
  revealId,
  error,
  onSelect,
}: FinalOutputControlsProps) {
  const shouldReduceMotion = useReducedMotion()
  const showSelector = lifecycle === 'completed' && hasFinal

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showSelector) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    onSelect(event.key === 'ArrowLeft' ? 'original' : 'final')
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      data-final-output-state={lifecycle}
      data-final-output-reveal-id={revealId ?? undefined}
    >
      <AnimatePresence initial={false}>
        {showSelector ? (
          <motion.div
            key="final-output-selector"
            role="tablist"
            aria-label="Preview source"
            onKeyDown={handleKeyDown}
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto absolute left-1/2 top-3 inline-flex h-9 -translate-x-1/2 items-center gap-0.5 border border-white/14 bg-black/68 p-0.5 shadow-[0_14px_36px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          >
            <OutputTab
              view="original"
              activeView={view}
              label="Original"
              icon={<Film className="size-3.5" aria-hidden="true" />}
              onSelect={onSelect}
            />
            <OutputTab
              view="final"
              activeView={view}
              label="Final"
              icon={<Check className="size-3.5" aria-hidden="true" />}
              onSelect={onSelect}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {lifecycle === 'processing' || lifecycle === 'queued' ? (
        <motion.div
          key="final-output-processing"
          role="status"
          aria-live="polite"
          initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto absolute left-1/2 top-3 inline-flex h-9 -translate-x-1/2 items-center gap-2 border border-cyan-200/20 bg-black/68 px-3 text-[11px] font-medium text-cyan-50 shadow-[0_14px_36px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          <span className="relative grid size-4 place-items-center" aria-hidden="true">
            <span className="absolute inset-0 animate-ping border border-cyan-200/45" />
            <LoaderCircle className="relative size-3.5 animate-spin text-cyan-200" />
          </span>
          <span>{lifecycle === 'queued' ? 'Queued final' : 'Rendering final'}</span>
        </motion.div>
      ) : null}

      {lifecycle === 'failed' ? (
        <motion.div
          key="final-output-failed"
          role="status"
          aria-live="polite"
          initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto absolute left-1/2 top-3 flex h-9 max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 border border-rose-200/22 bg-black/72 px-3 text-[11px] font-medium text-rose-50 shadow-[0_14px_36px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          title={error ?? 'Final output failed'}
        >
          <AlertTriangle className="size-3.5 shrink-0 text-rose-200" aria-hidden="true" />
          <span className="truncate">{error ?? 'Final output failed'}</span>
        </motion.div>
      ) : null}

      <AnimatePresence>
        {!shouldReduceMotion && revealId ? (
          <motion.div
            key={revealId}
            aria-hidden="true"
            initial={{ opacity: 0, x: '-120%' }}
            animate={{ opacity: [0, 0.8, 0], x: '120%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], times: [0, 0.48, 1] }}
            className="absolute inset-y-0 left-0 w-[38%] skew-x-[-14deg] bg-[linear-gradient(90deg,transparent,rgba(190,255,246,0.18),rgba(255,255,255,0.72),rgba(190,255,246,0.18),transparent)] mix-blend-screen"
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function OutputTab({
  view,
  activeView,
  label,
  icon,
  onSelect,
}: {
  view: FinalOutputView
  activeView: FinalOutputView
  label: string
  icon: React.ReactNode
  onSelect: (view: FinalOutputView) => void
}) {
  const active = view === activeView

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(view)}
      className={cn(
        'relative inline-flex h-8 min-w-[5.25rem] items-center justify-center gap-1.5 px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
        active ? 'text-white' : 'text-white/48 hover:text-white/78',
      )}
    >
      {active ? (
        <motion.span
          layoutId="editor-final-output-active-view"
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          className="absolute inset-0 border border-white/16 bg-white/[0.11]"
          aria-hidden="true"
        />
      ) : null}
      <span className="relative inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  )
}
