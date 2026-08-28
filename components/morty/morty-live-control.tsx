'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Plus, RotateCcw, Volume2, X } from 'lucide-react'
import { memo, useCallback, useState } from 'react'

import { useMortyLiveConversation } from '@/hooks/use-morty-live-conversation'
import { cn } from '@/lib/utils'

const stateCopy = {
  connecting: 'Connecting',
  listening: 'Listening',
  speaking: 'Morty is speaking',
  reconnecting: 'Reconnecting',
  error: 'Connection unavailable',
} as const

type MortyLiveExchange = { role: 'user' | 'assistant'; text: string }

/**
 * The live transcript rail. It floats freely beside the circle — no bounding
 * box, no hard edge — and lets the transcript blend into the workspace through
 * a soft glass blur and per-line glow. Memoized so the rail only re-renders
 * when transcript text actually changes instead of on every incoming audio
 * chunk (which kept the whole surface re-rendering and made typing lag).
 */
const TranscriptRail = memo(function TranscriptRail({
  status,
  liveUserTranscript,
  liveAssistantTranscript,
  previousExchange,
  collapsed,
  onToggleCollapse,
}: {
  status: string | null
  liveUserTranscript: string
  liveAssistantTranscript: string
  previousExchange: MortyLiveExchange[]
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const reduceMotion = useReducedMotion()
  const lastExchange = previousExchange.at(-1)

  return (
    <motion.aside
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(4px)' }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="pointer-events-auto mb-2 max-w-56 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-100/70">{status}</p>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="-mr-1 grid size-5 place-items-center rounded-full text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
          aria-label={collapsed ? 'Expand transcript' : 'Collapse transcript'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand transcript' : 'Collapse transcript'}
        >
          <ChevronDown className={cn('size-3.5 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="transcript-body"
            initial={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
            animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
            exit={{ height: 0, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {liveUserTranscript ? (
              <p className="mt-2 text-xs leading-snug text-white/60 [text-shadow:0_0_14px_rgba(255,255,255,0.10)]">{liveUserTranscript}</p>
            ) : null}
            {liveAssistantTranscript ? (
              <p className="mt-1 text-xs leading-snug text-cyan-50 [text-shadow:0_0_14px_rgba(137,244,239,0.14)]">{liveAssistantTranscript}</p>
            ) : null}
            {lastExchange ? (
              <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-white/35 [text-shadow:0_0_10px_rgba(255,255,255,0.05)]">{lastExchange.text}</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.aside>
  )
})

export function MortyLiveControl() {
  const reduceMotion = useReducedMotion()
  const { state, open, close, retry } = useMortyLiveConversation()
  const [collapsed, setCollapsed] = useState(false)
  const active = state.phase !== 'idle'
  const status = state.phase === 'idle' ? null : stateCopy[state.phase as keyof typeof stateCopy]
  const level = Math.max(0.14, state.inputLevel)

  const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), [])

  return (
    <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-5 z-[110] flex items-end gap-3 text-white">
      <AnimatePresence>
        {active ? (
          <TranscriptRail
            status={status}
            liveUserTranscript={state.liveUserTranscript}
            liveAssistantTranscript={state.liveAssistantTranscript}
            previousExchange={state.previousExchange}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        data-morty-live-circle
        className={cn(
          'pointer-events-auto relative grid aspect-square place-items-center overflow-hidden rounded-full border border-white/20 bg-[#0a0d0e]/95 shadow-[0_18px_60px_rgba(0,0,0,0.48)] backdrop-blur-xl',
          active ? 'size-[min(19rem,calc(100vw-2.5rem))] sm:size-80' : 'size-12',
        )}
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.7 }}
      >
        {active ? (
          <>
            <div className="absolute inset-[14%] rounded-full border border-cyan-100/15" />
            <div className="absolute inset-[28%] rounded-full border border-cyan-100/10" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(137,244,239,0.15),transparent_58%)]" />
            <div className="relative flex h-16 items-end gap-1" aria-hidden="true">
              {Array.from({ length: 11 }, (_, index) => (
                <span
                  key={index}
                  className={cn('w-1 rounded-full bg-cyan-100/85 transition-[height] duration-100', state.phase === 'speaking' && 'animate-pulse')}
                  style={{ height: `${14 + ((index * 17) % 42) * (state.phase === 'listening' ? level : 0.72)}px` }}
                />
              ))}
            </div>
            {state.phase === 'speaking' ? <Volume2 className="absolute top-[31%] size-4 text-cyan-50" aria-label="Morty is speaking" /> : null}
            {state.phase === 'error' ? (
              <button type="button" onClick={() => void retry()} className="absolute bottom-[23%] inline-flex items-center gap-1 text-[10px] text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100" title="Reconnect Morty">
                <RotateCcw className="size-3" />Retry
              </button>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          onClick={() => active ? void close() : void open()}
          className={cn('absolute grid place-items-center rounded-full border border-white/20 bg-[#0b1011] text-cyan-50 transition-colors hover:border-cyan-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100', active ? 'right-[16%] top-[16%] size-9' : 'inset-0')}
          aria-label={active ? 'End live conversation with Morty' : 'Start live conversation with Morty'}
          aria-pressed={active}
          title={active ? 'End live conversation' : 'Start live conversation'}
        >
          {active ? <X className="size-4" /> : <Plus className="size-5" />}
        </button>
      </motion.div>
    </div>
  )
}
