'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

import {
  COMPLETION_EVENT_NAME,
  type CompletionEventDetail,
} from './completion-event'

type ActiveCompletion = CompletionEventDetail & { id: number }

const drawTransition = { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const }

export function CinematicCompletionOverlay() {
  const [completion, setCompletion] = React.useState<ActiveCompletion | null>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const dismiss = React.useCallback(() => setCompletion(null), [])

  React.useEffect(() => {
    const showCompletion = (event: Event) => {
      const detail = (event as CustomEvent<CompletionEventDetail>).detail
      if (!detail?.title || !detail?.message) return
      setCompletion({ ...detail, id: Date.now() })
    }

    window.addEventListener(COMPLETION_EVENT_NAME, showCompletion)
    return () => window.removeEventListener(COMPLETION_EVENT_NAME, showCompletion)
  }, [])

  React.useEffect(() => {
    if (!completion) return

    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [completion, dismiss])

  return (
    <AnimatePresence>
      {completion ? (
        <motion.section
          key={completion.id}
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
          aria-describedby="completion-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
          className="fixed inset-0 z-[500] isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#050505] px-6 py-8 text-white"
        >
          <div className="pointer-events-none absolute inset-5 border border-white/[0.08] sm:inset-8" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 top-[14%] h-px bg-white/12" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-[14%] h-px bg-white/12" aria-hidden="true" />

          <button
            ref={closeButtonRef}
            type="button"
            onClick={dismiss}
            className="absolute right-7 top-7 z-10 grid size-10 place-items-center border border-white/18 text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:right-10 sm:top-10"
            aria-label="Close completion message"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 42 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...drawTransition, delay: shouldReduceMotion ? 0 : 0.08 }}
              className="w-[min(18rem,74vw)]"
              aria-hidden="true"
            >
              <CompletionHand drawn={!shouldReduceMotion} />
            </motion.div>

            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...drawTransition, delay: shouldReduceMotion ? 0 : 0.76 }}
              className="mt-5 font-subtext text-[clamp(1rem,2.1vw,1.35rem)] text-white/72"
            >
              {completion.title}
            </motion.p>
            <motion.h2
              id="completion-title"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...drawTransition, delay: shouldReduceMotion ? 0 : 0.96 }}
              className="font-vogue mt-1 text-[clamp(3.2rem,10vw,8.5rem)] leading-[0.82] text-white"
            >
              ALL DONE!
            </motion.h2>
            <motion.p
              id="completion-message"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...drawTransition, delay: shouldReduceMotion ? 0 : 1.18 }}
              className="font-subtext mt-7 max-w-md text-[clamp(1rem,2vw,1.25rem)] leading-relaxed text-white/68"
            >
              {completion.message}
            </motion.p>
            <motion.button
              type="button"
              onClick={dismiss}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...drawTransition, delay: shouldReduceMotion ? 0 : 1.38 }}
              className="mt-9 min-h-11 border border-white bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-transparent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Continue
            </motion.button>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}

function CompletionHand({ drawn }: { drawn: boolean }) {
  const paths = [
    'M96 238 C92 205 89 170 88 129 C87 108 91 91 101 90 C111 89 115 103 116 120 L119 156',
    'M119 156 L119 58 C119 40 124 29 135 30 C146 31 149 43 149 59 L150 130',
    'M150 130 L151 39 C151 22 158 13 169 15 C180 17 182 30 181 45 L177 132',
    'M177 132 L183 72 C185 56 192 49 202 52 C211 55 213 66 211 80 L202 155',
    'M116 120 C127 127 138 139 150 151 C159 160 170 166 178 161 C188 155 188 143 185 129',
    'M88 129 C75 116 59 112 51 121 C42 132 50 150 61 165 L91 203',
    'M91 203 C100 218 108 231 111 254',
    'M111 254 C130 269 165 270 189 252 C207 239 213 215 208 189 L202 155',
  ]

  return (
    <svg viewBox="0 0 260 290" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full overflow-visible">
      {paths.map((path, index) => (
        <motion.path
          key={path}
          d={path}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={drawn ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={drawn ? { duration: 0.42, delay: index * 0.11, ease: 'easeInOut' } : { duration: 0 }}
        />
      ))}
    </svg>
  )
}
