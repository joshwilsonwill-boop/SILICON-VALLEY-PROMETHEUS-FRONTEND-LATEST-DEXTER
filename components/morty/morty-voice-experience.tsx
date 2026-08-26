'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUp,
  Check,
  CircleAlert,
  LoaderCircle,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useMortyConversation } from '@/hooks/use-morty-conversation'
import type { MortyMessage, MortyStatus } from '@/lib/morty/conversation'
import { cn } from '@/lib/utils'

import { MortySignalCanvas } from './morty-signal-canvas'

const statusCopy: Record<MortyStatus, string> = {
  idle: 'Ready when you are',
  requesting_permission: 'Requesting microphone',
  listening: 'Listening',
  transcribing: 'Finding the words',
  thinking: 'Working through it',
  speaking: 'Morty is speaking',
  error: 'Needs another try',
}

function toolSummary(message: MortyMessage) {
  const calls = message.toolCalls ?? []
  return calls
    .map((call) => {
      if (!call || typeof call !== 'object') return null
      const value = call as Record<string, unknown>
      const label = typeof value.label === 'string' ? value.label : typeof value.name === 'string' ? value.name : null
      const summary = typeof value.summary === 'string' ? value.summary : null
      return label ? (summary ? `${label} · ${summary}` : label) : null
    })
    .filter((value): value is string => Boolean(value))
}

export function MortyVoiceExperience() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const reduceMotion = useReducedMotion()
  const conversation = useMortyConversation()
  const { state, status } = conversation
  const closeConversation = conversation.close
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      closeConversation()
      previousFocusRef.current?.focus()
    }
  }, [closeConversation, open])

  const close = () => setOpen(false)
  const canSubmit = draft.trim().length > 0 && status !== 'thinking' && status !== 'transcribing'
  const isListening = status === 'listening' || status === 'requesting_permission'
  const latestMessage = state.messages[state.messages.length - 1]

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    conversation.submitText(draft)
    setDraft('')
  }

  const toggleListening = () => {
    if (isListening) conversation.stopListening()
    else void conversation.startListening()
  }

  return mounted ? createPortal((
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-[80] grid size-12 place-items-center rounded-full border border-cyan-200/30 bg-[#071014]/90 text-cyan-100 shadow-[0_0_0_1px_rgba(0,240,255,0.08),0_14px_40px_rgba(0,0,0,0.48)] backdrop-blur-xl transition-colors hover:border-cyan-100/60 hover:bg-[#0b1a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          open && 'pointer-events-none opacity-0',
        )}
        whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: 3 }}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        aria-label="Open Morty voice agent"
        title="Open Morty voice agent"
      >
        <Sparkles className="size-5" strokeWidth={1.5} />
        <span className="absolute inset-0 rounded-full border border-cyan-200/20" aria-hidden="true" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close Morty voice agent backdrop"
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] md:pointer-events-none md:bg-transparent md:backdrop-blur-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="morty-stage-title"
              className="fixed inset-0 z-[110] flex h-[100dvh] flex-col overflow-hidden border border-white/15 bg-[#050607] text-white shadow-[0_30px_100px_rgba(0,0,0,0.7)] md:inset-auto md:bottom-5 md:right-5 md:h-[min(720px,calc(100dvh-2.5rem))] md:w-[min(620px,calc(100vw-2.5rem))] md:rounded-[32px]"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }}
              transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.72 }}
            >
              <div className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-full border border-cyan-200/30 bg-cyan-200/10 text-cyan-100">
                    <Sparkles className="size-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 id="morty-stage-title" className="text-sm font-medium tracking-[0.02em] text-white">Morty</h2>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/40">Prometheus voice agent</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 hidden text-[10px] uppercase tracking-[0.18em] text-cyan-100/65 sm:inline" aria-live="polite">{statusCopy[status]}</span>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={close}
                    className="grid size-9 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                    aria-label="Close Morty voice agent"
                    title="Close Morty voice agent"
                  >
                    <X className="size-4" strokeWidth={1.6} />
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <MortySignalCanvas status={status} active={open} />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,7,0.05)_0%,rgba(5,6,7,0.18)_48%,rgba(5,6,7,0.96)_100%)]" aria-hidden="true" />
                <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-5 md:px-6 md:pb-6">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/55">Signal / {status}</p>
                      <p className="mt-2 max-w-[34ch] text-3xl leading-[1.05] tracking-normal text-white/90 md:text-4xl">
                        {latestMessage?.role === 'assistant' ? latestMessage.content : 'Tell me what needs to move.'}
                      </p>
                    </div>
                    {status === 'thinking' ? <LoaderCircle className="mb-1 size-5 shrink-0 animate-spin text-cyan-100/75" aria-label="Morty is thinking" /> : null}
                    {status === 'speaking' ? <Volume2 className="mb-1 size-5 shrink-0 text-cyan-100/75" aria-label="Morty is speaking" /> : null}
                  </div>

                  <div className="max-h-32 space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]" aria-live="polite" aria-label="Morty conversation">
                    {state.messages.slice(-4, -1).map((message, index) => (
                      <p key={`${message.role}-${index}`} className={cn('text-xs leading-relaxed', message.role === 'user' ? 'text-white/40' : 'text-white/58')}>
                        <span className="mr-2 text-[9px] uppercase tracking-[0.18em] text-white/25">{message.role === 'user' ? 'You' : 'Morty'}</span>
                        {message.content}
                      </p>
                    ))}
                  </div>

                  {latestMessage?.role === 'assistant' && toolSummary(latestMessage).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-cyan-100/55">
                      {toolSummary(latestMessage).map((summary) => (
                        <span key={summary} className="inline-flex items-center gap-1"><Check className="size-3" />{summary}</span>
                      ))}
                    </div>
                  ) : null}

                  {state.error ? (
                    <div className="mt-3 flex items-center justify-between gap-3 border-l border-red-300/50 pl-3 text-xs text-red-100/75">
                      <span className="inline-flex items-center gap-2"><CircleAlert className="size-3.5" />{state.error}</span>
                      <button type="button" onClick={conversation.retry} className="inline-flex shrink-0 items-center gap-1 text-white/70 hover:text-white" title="Retry Morty request"><RotateCcw className="size-3" />Retry</button>
                    </div>
                  ) : null}
                </div>
              </div>

              <form onSubmit={submitDraft} className="relative z-10 flex items-center gap-2 border-t border-white/10 bg-[#07090a]/95 p-3 md:p-4">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200',
                    isListening ? 'border-red-200/60 bg-red-200/10 text-red-100' : 'border-white/15 bg-white/[0.04] text-white/65 hover:border-cyan-100/50 hover:text-cyan-100',
                  )}
                  aria-label={isListening ? 'Stop listening to Morty' : 'Start listening to Morty'}
                  aria-pressed={isListening}
                  title={isListening ? 'Stop listening' : 'Start listening'}
                >
                  {isListening ? <Square className="size-4" fill="currentColor" /> : <Mic className="size-4" strokeWidth={1.6} />}
                </button>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={isListening ? 'Listening for your direction…' : 'Type a direction for Morty…'}
                  aria-label="Message Morty"
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white outline-none placeholder:text-white/30"
                  disabled={status === 'thinking' || status === 'transcribing'}
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-cyan-100 text-[#061013] transition-transform hover:bg-white disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090a]"
                  aria-label="Send message to Morty"
                  title="Send message"
                >
                  <ArrowUp className="size-4" strokeWidth={2} />
                </button>
              </form>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  ), document.body) : null
}
