'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, CircleHelp, Play, X } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { requestEditorialChatOpen } from '@/lib/editorial-chat-navigation'
import {
  ONBOARDING_OPEN_EVENT,
  completeSurfaceOnboarding,
  consumeOnboardingPending,
  hasPendingOnboarding,
  type OnboardingSurface,
  surfaceOnboardingHasBeenCompleted,
} from '@/lib/onboarding'
import { cn } from '@/lib/utils'

type OnboardingStep = {
  label: string
  title: string
  description: string
  detail: string
}

const WALKTHROUGHS: Record<OnboardingSurface, { label: string; title: string; steps: OnboardingStep[] }> = {
  studio: {
    label: 'Prometheus Studio',
    title: 'A first look at your studio.',
    steps: [
      { label: '01 / SOURCE', title: 'Bring in the rushes.', description: 'Start with footage, references, or an unfinished thought. Your source stays in view while the work takes shape.', detail: 'A quiet place for everything the cut will need.' },
      { label: '02 / DIRECTION', title: 'Set the direction.', description: 'Give the story a feeling, a rhythm, or a single instruction. Prometheus turns that impulse into an editable first pass.', detail: 'A few deliberate words can set the whole edit in motion.' },
      { label: '03 / FINISH', title: 'Make the cut yours.', description: 'Compare, refine, and leave only when the pacing feels exact. Every decision remains visible and reversible.', detail: 'The final frame stays under your hand.' },
    ],
  },
  editorial: {
    label: 'Editorial Chamber',
    title: 'A first look at the chamber.',
    steps: [
      { label: '01 / FRAME', title: 'Read the frame.', description: 'Keep the picture close. The chamber gives each editorial decision a clear visual anchor before the next move.', detail: 'See the moment before you change it.' },
      { label: '02 / DIRECTION', title: 'Describe the move.', description: 'Speak in plain editorial language. Ask for a tighter rhythm, a cleaner thought, or a shift in mood.', detail: 'The assistant works from the cut in front of you.' },
      { label: '03 / RHYTHM', title: 'Refine with intent.', description: 'Use the timeline to weigh each change. Preview, compare, and keep only what earns its place in the story.', detail: 'The work stays precise from first note to final export.' },
    ],
  },
}

type OpenEvent = CustomEvent<{ surface?: OnboardingSurface }>

export function openCinematicOnboarding(surface: OnboardingSurface = 'studio') {
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_EVENT, { detail: { surface } }))
}

export function CinematicOnboarding({ pathname }: { pathname: string }) {
  const { session, isLoading } = useAuth()
  const reducedMotion = useReducedMotion() ?? false
  const [open, setOpen] = React.useState(false)
  const [surface, setSurface] = React.useState<OnboardingSurface>('studio')
  const [stepIndex, setStepIndex] = React.useState(0)
  const openedAutomatically = React.useRef(false)
  const firstActionRef = React.useRef<HTMLButtonElement | null>(null)
  const userId = session?.user?.id ?? null
  const activeSurface = pathname.startsWith('/editor/') ? 'editorial' : pathname.startsWith('/studio') ? 'studio' : null
  const walkthrough = WALKTHROUGHS[surface]
  const step = walkthrough.steps[stepIndex]

  const close = React.useCallback((complete = false) => {
    if (complete && userId) completeSurfaceOnboarding(userId, surface)
    setOpen(false)
  }, [surface, userId])

  React.useEffect(() => {
    const handleOpen = (event: Event) => {
      const requestedSurface = (event as OpenEvent).detail?.surface ?? (pathname.startsWith('/editor/') ? 'editorial' : 'studio')
      openedAutomatically.current = false
      setSurface(requestedSurface)
      setStepIndex(0)
      setOpen(true)
    }

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
  }, [pathname])

  React.useEffect(() => {
    if (isLoading || !activeSurface || !userId || !session?.user?.email || openedAutomatically.current) return
    if (surfaceOnboardingHasBeenCompleted(userId, activeSurface)) return

    const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0
    const isNewAccount = createdAt > 0 && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 14
    const shouldOpen = activeSurface === 'studio'
      ? hasPendingOnboarding(session.user.email, session.user.created_at)
      : isNewAccount
    if (!shouldOpen) return

    let hasOpened = false
    const timer = window.setTimeout(() => {
      if (activeSurface === 'studio' && !consumeOnboardingPending(session.user.email, session.user.created_at)) return
      hasOpened = true
      openedAutomatically.current = true
      setSurface(activeSurface)
      setStepIndex(0)
      setOpen(true)
    }, reducedMotion ? 80 : 460)
    return () => {
      window.clearTimeout(timer)
      if (!hasOpened) openedAutomatically.current = false
    }
  }, [activeSurface, isLoading, reducedMotion, session?.user?.created_at, session?.user?.email, userId])

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => firstActionRef.current?.focus(), reducedMotion ? 0 : 420)
    return () => window.clearTimeout(timer)
  }, [open, reducedMotion])

  const next = React.useCallback(() => {
    if (stepIndex < walkthrough.steps.length - 1) {
      setStepIndex((current) => current + 1)
      return
    }

    close(openedAutomatically.current)
    if (surface === 'editorial') window.setTimeout(requestEditorialChatOpen, reducedMotion ? 0 : 240)
  }, [close, reducedMotion, stepIndex, surface, walkthrough.steps.length])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : close(openedAutomatically.current)}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.28 }} className="fixed inset-0 z-[140] bg-black/92 backdrop-blur-md" />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount onOpenAutoFocus={(event) => event.preventDefault()}>
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: 10 }}
                transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-4 z-[141] mx-auto flex max-h-[48rem] w-[min(62rem,calc(100vw-2rem))] flex-col overflow-hidden border border-white/[0.16] bg-[#080808] text-white shadow-[0_40px_140px_-40px_rgba(0,0,0,1)] outline-none sm:inset-y-1/2 sm:-translate-y-1/2"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cinematic-onboarding-title"
                aria-describedby="cinematic-onboarding-description"
              >
                <div className="flex items-center justify-between border-b border-white/[0.1] px-4 py-3 sm:px-6">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">{walkthrough.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-medium tabular-nums text-white/38">{String(stepIndex + 1).padStart(2, '0')} / {String(walkthrough.steps.length).padStart(2, '0')}</span>
                    <DialogPrimitive.Close asChild>
                      <button type="button" onClick={() => close(openedAutomatically.current)} className="grid size-8 place-items-center text-white/48 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Close onboarding">
                        <X className="size-4" />
                      </button>
                    </DialogPrimitive.Close>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 lg:grid-cols-[1.05fr_0.95fr]">
                  <OnboardingScene kind={surface} stepIndex={stepIndex} reducedMotion={reducedMotion} />
                  <div className="flex min-h-0 flex-col border-t border-white/[0.1] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
                    <div className="flex gap-1.5" aria-label={`Step ${stepIndex + 1} of ${walkthrough.steps.length}`}>
                      {walkthrough.steps.map((entry, index) => <span key={entry.label} className={cn('h-px flex-1 transition-colors duration-500', index <= stepIndex ? 'bg-white' : 'bg-white/[0.15]')} />)}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={`${surface}-${stepIndex}`} initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reducedMotion ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }} className="flex min-h-0 flex-1 flex-col justify-center py-8 sm:py-10">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">{step.label}</p>
                        <h2 id="cinematic-onboarding-title" className="mt-4 max-w-[27rem] font-[var(--font-migra)] text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.92] text-white">{step.title}</h2>
                        <p id="cinematic-onboarding-description" className="mt-6 max-w-[31rem] text-sm leading-7 text-white/60 sm:text-base">{step.description}</p>
                        <p className="mt-6 border-l border-white/25 pl-3 text-xs leading-5 text-white/42">{step.detail}</p>
                      </motion.div>
                    </AnimatePresence>
                    <div className="flex items-center justify-between gap-4 border-t border-white/[0.1] pt-5">
                      <button ref={firstActionRef} type="button" onClick={() => close(openedAutomatically.current)} className="text-xs text-white/44 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">Skip</button>
                      <button type="button" onClick={next} className="group inline-flex h-10 shrink-0 items-center gap-3 bg-white px-4 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]">
                        {stepIndex === walkthrough.steps.length - 1 ? (surface === 'editorial' ? 'Enter chamber' : 'Enter studio') : 'Continue'}
                        {stepIndex === walkthrough.steps.length - 1 ? <Check className="size-4" /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function OnboardingScene({ kind, stepIndex, reducedMotion }: { kind: OnboardingSurface; stepIndex: number; reducedMotion: boolean }) {
  const isTimeline = stepIndex === 2
  const isDirection = stepIndex === 1

  return (
    <div className="relative flex min-h-[16rem] overflow-hidden border-b border-white/[0.1] bg-[#050505] p-5 sm:min-h-[20rem] sm:p-8 lg:border-b-0">
      <div className="pointer-events-none absolute inset-0 opacity-45" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.12]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.08]" />
        <motion.div animate={reducedMotion ? undefined : { x: ['-100%', '100%'] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }} className="absolute top-0 h-full w-24 bg-white/[0.05]" />
      </div>
      <div className="relative my-auto w-full border border-white/[0.18] p-3 sm:p-5">
        <div className="flex items-center justify-between border-b border-white/[0.13] pb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/42">
          <span>{kind === 'editorial' ? 'Edit view' : 'Source view'}</span><span>16:9</span>
        </div>
        <div className="relative mt-4 aspect-video overflow-hidden border border-white/[0.14] bg-white/[0.025]">
          <motion.div animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], x: [0, -5, 0] }} transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-[18%] border border-white/[0.18]" />
          <motion.div animate={reducedMotion || !isDirection ? undefined : { scale: [1, 1.28, 1] }} transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80" />
          <Play className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 fill-white text-white" aria-hidden="true" />
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-2 border border-white/[0.12] p-2.5">
            <span className="block h-1.5 w-3/4 bg-white/65" />
            <span className="block h-1.5 w-1/2 bg-white/25" />
          </div>
          <div className="flex w-16 items-center justify-center border border-white/[0.12] text-[9px] text-white/48">{isDirection ? 'NOTE' : 'CUT'}</div>
        </div>
        <div className="relative mt-4 flex h-8 items-center gap-1 overflow-hidden border border-white/[0.12] px-2">
          {[26, 15, 33, 18, 24, 12, 28].map((width, index) => <span key={index} className="h-2 bg-white/[0.22]" style={{ width: `${width}%` }} />)}
          {isTimeline ? <motion.span initial={reducedMotion ? false : { left: '2%' }} animate={{ left: '92%' }} transition={{ duration: reducedMotion ? 0 : 2.6, repeat: Infinity, ease: 'linear' }} className="absolute top-0 h-full w-px bg-white" /> : null}
        </div>
      </div>
    </div>
  )
}

export function EditorialOnboardingReplay({ pathname }: { pathname: string }) {
  if (!pathname.startsWith('/editor/')) return null

  return (
    <button type="button" onClick={() => openCinematicOnboarding('editorial')} className="fixed right-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[110] grid size-9 place-items-center border border-white/[0.16] bg-black/80 text-white/62 shadow-[0_12px_34px_-18px_rgba(0,0,0,0.95)] backdrop-blur transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Replay Editorial Chamber onboarding" title="Replay onboarding">
      <CircleHelp className="size-4" strokeWidth={1.7} />
    </button>
  )
}
