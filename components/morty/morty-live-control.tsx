'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus, RotateCcw, Volume2, X } from 'lucide-react'

import { useMortyLiveConversation } from '@/hooks/use-morty-live-conversation'
import { cn } from '@/lib/utils'

const stateCopy = {
  connecting: 'Connecting',
  listening: 'Listening',
  speaking: 'Morty is speaking',
  reconnecting: 'Reconnecting',
  error: 'Connection unavailable',
} as const

export function MortyLiveControl() {
  const reduceMotion = useReducedMotion()
  const { state, open, close, retry } = useMortyLiveConversation()
  const active = state.phase !== 'idle'
  const status = state.phase === 'idle' ? null : stateCopy[state.phase as keyof typeof stateCopy]
  const level = Math.max(0.14, state.inputLevel)

  return (
    <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-5 z-[110] flex items-end gap-3 text-white">
      <AnimatePresence>
        {active ? (
          <motion.aside
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="pointer-events-auto mb-2 hidden w-36 border-l border-white/20 pl-3 sm:block"
            aria-live="polite"
          >
            <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-100/70">{status}</p>
            {state.liveUserTranscript ? <p className="mt-2 text-xs leading-snug text-white/55">{state.liveUserTranscript}</p> : null}
            {state.liveAssistantTranscript ? <p className="mt-1 text-xs leading-snug text-cyan-50">{state.liveAssistantTranscript}</p> : null}
            {state.previousExchange.at(-1) ? <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-white/35">{state.previousExchange.at(-1)?.text}</p> : null}
          </motion.aside>
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
