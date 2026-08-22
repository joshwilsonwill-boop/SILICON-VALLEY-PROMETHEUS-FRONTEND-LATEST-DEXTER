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
      { label: '04 / CHAT', title: 'Talk to the chamber.', description: 'The assistant lives at the edge of the frame. Type or speak, and it turns your note into a concrete next pass.', detail: 'Every instruction stays grounded in the cut.' },
      { label: '05 / SOUND', title: 'Lay the sound.', description: 'Pick a music mood or pull a track into the room. Sound and picture are weighed together before you commit.', detail: 'Hear the scene before you finish it.' },
      { label: '06 / MOTION', title: 'Make it move.', description: 'Give the cut its motion language — fades, glides, and cuts that carry the rhythm you just set.', detail: 'The chamber moves the way your story does.' },
      { label: '07 / ACT', title: 'Cut and commit.', description: 'Use the scissors to mark the moments that stay. Every trim is instant and fully reversible.', detail: 'The final frame stays under your hand.' },
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
  const [phase, setPhase] = React.useState<'steps' | 'finish'>('steps')
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
      setPhase('steps')
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
      setPhase('steps')
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

    setPhase('finish')
  }, [stepIndex, walkthrough.steps.length])

  const enterChamber = React.useCallback(() => {
    close(openedAutomatically.current)
    if (surface === 'editorial') window.setTimeout(requestEditorialChatOpen, reducedMotion ? 0 : 240)
  }, [close, reducedMotion, surface])

  const resetWalkthrough = React.useCallback(() => {
    setPhase('steps')
    setStepIndex(0)
  }, [])

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
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-4 z-[141] mx-auto flex max-h-[48rem] w-[min(62rem,calc(100vw-2rem))] flex-col overflow-hidden border border-white/[0.16] bg-[#080808] text-white shadow-[0_40px_140px_-40px_rgba(0,0,0,1)] outline-none sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(62rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cinematic-onboarding-title"
                aria-describedby="cinematic-onboarding-description"
              >
                <div className="flex items-center justify-between border-b border-white/[0.1] px-4 py-3 sm:px-6">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">{walkthrough.label}</span>
                  <div className="flex items-center gap-4">
                    {phase === 'steps' ? (
                      <span className="text-[10px] font-medium tabular-nums text-white/38">{String(stepIndex + 1).padStart(2, '0')} / {String(walkthrough.steps.length).padStart(2, '0')}</span>
                    ) : null}
                    <DialogPrimitive.Close asChild>
                      <button type="button" onClick={() => close(openedAutomatically.current)} className="grid size-8 place-items-center text-white/48 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Close onboarding">
                        <X className="size-4" />
                      </button>
                    </DialogPrimitive.Close>
                  </div>
                </div>

                {phase === 'finish' ? (
                  <OnboardingFinishCard
                    surface={surface}
                    reducedMotion={reducedMotion}
                    onEnter={enterChamber}
                  />
                ) : (
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
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function OnboardingScene({ kind, stepIndex, reducedMotion }: { kind: OnboardingSurface; stepIndex: number; reducedMotion: boolean }) {
  const isDirection = stepIndex === 1
  const isTimeline = stepIndex === 2
  const isChat = stepIndex === 3
  const isSound = stepIndex === 4
  const isMotion = stepIndex === 5
  const isAct = stepIndex === 6

  return (
    <div className="relative flex min-h-[16rem] overflow-hidden border-b border-white/[0.1] bg-[#050505] p-5 sm:min-h-[20rem] sm:p-8 lg:border-b-0">
      <div className="pointer-events-none absolute inset-0 opacity-45" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.12]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.08]" />
        <motion.div animate={reducedMotion ? undefined : { x: ['-100%', '100%'] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }} className="absolute top-0 h-full w-24 bg-white/[0.05]" />
      </div>
      <div className="relative my-auto w-full border border-white/[0.18] p-3 sm:p-5">
        {isChat ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.13] pb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/42">
              <span>Chat</span><span>Active</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-md border border-white/15 bg-white/[0.08] px-3 py-2 text-[11px] text-white/80">Tighten the intro</div>
              </div>
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/12 bg-white/[0.03] px-3 py-2 text-[11px] text-white/60">I&#39;ll carve 2s from the opener.</div>
              </div>
              <motion.div animate={reducedMotion ? undefined : { opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }} className="flex items-center gap-1 pl-1">
                <span className="size-1.5 rounded-full bg-white/40" />
                <span className="size-1.5 rounded-full bg-white/25" />
                <span className="size-1.5 rounded-full bg-white/10" />
              </motion.div>
            </div>
          </>
        ) : isSound ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.13] pb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/42">
              <span>Sound</span><span>BPM 120</span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex h-10 items-center gap-1 overflow-hidden border border-white/[0.12] px-3">
                {Array.from({ length: 24 }, (_, i) => (
                  <motion.span
                    key={i}
                    animate={reducedMotion ? undefined : { height: [4, 6, 20, 12, 16, 8, 4][i % 7] }}
                    transition={{ duration: 0.9 + (i % 3) * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-[3px] shrink-0 rounded-full bg-white/60"
                    style={{ height: '8px' }}
                  />
                ))}
              </div>
              <div className="rounded border border-white/[0.12] bg-white/[0.03] px-3 py-2 text-[10px] text-white/50">Ambient string layer · cinematic sustain</div>
            </div>
          </>
        ) : isMotion ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.13] pb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/42">
              <span>Motion</span><span>Keyframes</span>
            </div>
            <div className="mt-4 flex aspect-video items-center justify-center overflow-hidden border border-white/[0.14] bg-white/[0.025]">
              <svg className="h-24 w-48" viewBox="0 0 200 100" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5">
                <motion.path
                  d="M10,80 C30,20 60,60 90,35 S130,70 160,30 S180,60 190,40"
                  animate={reducedMotion ? undefined : { strokeDashoffset: [0, -200] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </>
        ) : isAct ? (
          <>
            <div className="flex items-center justify-between border-b border-white/[0.13] pb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-white/42">
              <span>Trim</span><span>Reversible</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <motion.div animate={reducedMotion ? undefined : { rotate: [-8, 8, -8] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="flex size-14 items-center justify-center border border-white/[0.15] bg-white/[0.04] text-white/60">
                <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M6 4v16M18 4v16M8 4l8 16" />
                </svg>
              </motion.div>
              <div className="flex-1 space-y-2 border border-white/[0.12] p-2.5">
                <span className="block h-1.5 w-2/3 bg-white/55" />
                <span className="block h-1.5 w-1/3 bg-white/25" />
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}

function OnboardingFinishCard({
  surface,
  reducedMotion,
  onEnter,
}: {
  surface: OnboardingSurface
  reducedMotion: boolean
  onEnter: () => void
}) {
  const isEditorial = surface === 'editorial'
  const title = isEditorial ? 'The chamber is yours.' : 'The studio is yours.'
  const subtitle = isEditorial ? 'Every note, trim, and motion now answers to you.' : 'Every rushes, direction, and cut now answers to you.'

  return (
    <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden p-6 sm:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.1]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.06]" />
        <div className="absolute left-1/2 top-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm border border-white/[0.16] bg-[#0c0c0c] p-7 shadow-[0_40px_120px_-50px_rgba(0,0,0,1)] sm:p-9"
      >
        <div className="flex justify-center" aria-hidden="true">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 0.1, duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="grid size-16 place-items-center border border-white/[0.16] bg-white/[0.03] text-white/70"
          >
            <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-14deg)' }}>
              <path d="M4 11h4c.6 0 1 .4 1 1v2c0 1.5-1 2-1.5 2H4" />
              <path d="M8 12c2.5 0 3.5 1.5 3.5 3.5V18c0 .8-.6 1.4-1.4 1.4h-.6" />
              <path d="M10.5 12.5c1.8 0 2.8 1 2.8 2.8v.8" />
              <path d="M13 13.5c1.5 0 2.3.8 2.3 2.3v.5" />
              <path d="M15 14.5c1.2 0 1.8.7 1.8 2v.3" />
            </svg>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={title} initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : 0.24, duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }} className="mt-7 text-center">
            <h2 className="font-[var(--font-migra)] text-[clamp(1.9rem,4.5vw,2.8rem)] leading-[0.96] tracking-tight text-white">{title}</h2>
            <p className="mx-auto mt-4 max-w-[22rem] text-[13px] leading-6 text-white/55">{subtitle}</p>
          </motion.div>
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={onEnter}
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : 0.42, duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={reducedMotion ? undefined : { y: -2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          className="group mt-9 flex w-full items-center justify-center gap-3 border border-white/[0.18] bg-white/[0.06] px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 transition-colors hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isEditorial ? 'Enter the chamber' : 'Enter the studio'}
          <Check className="size-4 transition-transform group-hover:translate-x-0.5" />
        </motion.button>
      </motion.div>
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
