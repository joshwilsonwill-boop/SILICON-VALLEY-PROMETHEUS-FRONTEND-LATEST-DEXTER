'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Command,
  Film,
  Layers3,
  MousePointer2,
  X,
} from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import {
  ONBOARDING_OPEN_EVENT,
  completeOnboarding,
  consumeOnboardingPending,
  onboardingHasBeenCompleted,
} from '@/lib/onboarding'
import { cn } from '@/lib/utils'

type OnboardingStep = {
  eyebrow: string
  title: string
  description: string
  icon: typeof Film
  accent: string
  detail: string
}

const STEPS: OnboardingStep[] = [
  {
    eyebrow: '01 / SOURCE',
    title: 'Bring the raw story.',
    description: 'Drop in footage, references, and ideas. Prometheus keeps the source material close while you find the cut.',
    icon: Film,
    accent: '#d9ff62',
    detail: 'Your media stays organized in one calm, visual shelf.',
  },
  {
    eyebrow: '02 / DIRECTION',
    title: 'Describe the feeling.',
    description: 'Give the studio a point of view. A sentence is enough to start shaping rhythm, emphasis, and motion.',
    icon: Command,
    accent: '#bfa7ff',
    detail: 'The command zone turns instinct into an editable first pass.',
  },
  {
    eyebrow: '03 / FINISH',
    title: 'Make the last frame yours.',
    description: 'Tune the details, compare iterations, then export when the pacing feels unmistakably like you.',
    icon: Layers3,
    accent: '#7ff2d4',
    detail: 'Every choice stays visible, reversible, and ready to share.',
  },
]

function dispatchOpenOnboarding() {
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_EVENT))
}

export function openStudioOnboarding() {
  if (typeof window !== 'undefined') dispatchOpenOnboarding()
}

export function StudioOnboarding() {
  const { session, isLoading } = useAuth()
  const reducedMotion = useReducedMotion() ?? false
  const [open, setOpen] = React.useState(false)
  const [stepIndex, setStepIndex] = React.useState(0)
  const firstActionRef = React.useRef<HTMLButtonElement | null>(null)
  const userId = session?.user?.id ?? null
  const step = STEPS[stepIndex]
  const StepIcon = step.icon

  React.useEffect(() => {
    const handleOpen = () => {
      if (!userId) return
      setStepIndex(0)
      setOpen(true)
    }

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
  }, [userId])

  React.useEffect(() => {
    if (isLoading || !userId || !session?.user?.email) return
    if (onboardingHasBeenCompleted(userId)) return

    if (consumeOnboardingPending(session.user.email, session.user.created_at)) {
      const timer = window.setTimeout(() => setOpen(true), reducedMotion ? 80 : 520)
      return () => window.clearTimeout(timer)
    }
  }, [isLoading, reducedMotion, session?.user?.email, userId])

  React.useEffect(() => {
    if (!open) return
    setStepIndex((current) => Math.min(current, STEPS.length - 1))
    const timer = window.setTimeout(() => firstActionRef.current?.focus(), reducedMotion ? 0 : 500)
    return () => window.clearTimeout(timer)
  }, [open, reducedMotion])

  const finish = React.useCallback(() => {
    if (userId) completeOnboarding(userId)
    setOpen(false)
  }, [userId])

  const next = React.useCallback(() => {
    if (stepIndex === STEPS.length - 1) {
      finish()
      return
    }
    setStepIndex((current) => current + 1)
  }, [finish, stepIndex])

  const previous = React.useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1))
  }, [])

  if (!session || !userId) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : finish()}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.35 }}
                className="fixed inset-0 z-[120] bg-[#050507]/88 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount onOpenAutoFocus={(event) => event.preventDefault()}>
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 22, scale: 0.975 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
                transition={{ duration: reducedMotion ? 0 : 0.58, ease: [0.16, 1, 0.3, 1] }}
                className="fixed left-1/2 top-1/2 z-[121] flex max-h-[min(47rem,calc(100dvh-2rem))] w-[min(58rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-white/[0.14] bg-[#0b0b10] text-white shadow-[0_38px_120px_-36px_rgba(0,0,0,0.96)] outline-none sm:flex-row"
                role="dialog"
                aria-modal="true"
                aria-labelledby="studio-onboarding-title"
                aria-describedby="studio-onboarding-description"
              >
                <div className="relative flex min-h-[16rem] w-full shrink-0 flex-col justify-between overflow-hidden border-b border-white/[0.08] bg-[#111117] p-5 sm:min-h-0 sm:w-[42%] sm:border-b-0 sm:border-r sm:p-7">
                  <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
                    <motion.div
                      animate={reducedMotion ? undefined : { rotate: 360 }}
                      transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                      className="absolute -right-20 -top-24 size-72 rounded-full border border-white/[0.09]"
                    />
                    <motion.div
                      animate={reducedMotion ? undefined : { rotate: -360 }}
                      transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                      className="absolute -bottom-28 -left-20 size-64 rounded-full border border-dashed border-white/[0.08]"
                    />
                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
                    <div className="absolute left-1/2 top-0 h-full w-px bg-white/[0.04]" />
                  </div>
                  <div className="relative z-10 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
                    <span>Prometheus studio</span>
                    <span>{String(stepIndex + 1).padStart(2, '0')} / 03</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stepIndex}
                      initial={reducedMotion ? false : { opacity: 0, y: 12, rotate: -3 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                      transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
                      className="relative z-10 mx-auto flex aspect-square w-[min(15rem,58vw)] items-center justify-center"
                    >
                      <motion.div
                        animate={reducedMotion ? undefined : { rotate: [0, 8, 0], scale: [1, 1.035, 1] }}
                        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-[13%] rounded-[42%] border border-white/[0.16] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_60px_-24px_rgba(0,0,0,0.9)]"
                        style={{ borderColor: `${step.accent}55` }}
                      />
                      <div className="relative grid size-[36%] place-items-center rounded-full border border-white/[0.18] bg-[#0b0b10]" style={{ boxShadow: `0 0 55px -12px ${step.accent}99` }}>
                        <StepIcon className="size-8" strokeWidth={1.25} style={{ color: step.accent }} aria-hidden="true" />
                      </div>
                      <motion.span
                        animate={reducedMotion ? undefined : { rotate: -360 }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-[4%] rounded-full border border-dashed border-white/[0.16]"
                      />
                    </motion.div>
                  </AnimatePresence>
                  <div className="relative z-10 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: step.accent }}>{step.eyebrow}</p>
                      <p className="mt-2 max-w-[18rem] text-xs leading-5 text-white/50">{step.detail}</p>
                    </div>
                    <MousePointer2 className="mb-1 size-4 text-white/28" aria-hidden="true" />
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-9">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-1.5" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
                      {STEPS.map((entry, index) => (
                        <span key={entry.eyebrow} className={cn('h-1 w-8 transition-colors duration-300 sm:w-11', index <= stepIndex ? 'bg-white/80' : 'bg-white/[0.12]')} />
                      ))}
                    </div>
                    <DialogPrimitive.Close asChild>
                      <button type="button" onClick={finish} className="grid size-9 place-items-center text-white/42 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Skip onboarding">
                        <X className="size-4" />
                      </button>
                    </DialogPrimitive.Close>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col justify-center py-9 sm:py-12">
                    <AnimatePresence mode="wait">
                      <motion.div key={stepIndex} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/35">A quiet start for loud ideas</p>
                        <h2 id="studio-onboarding-title" className="mt-4 max-w-[27rem] font-[var(--font-migra)] text-[clamp(2.2rem,5vw,4.5rem)] leading-[0.95] tracking-tight text-white">
                          {step.title.split('').map((character, index) => (
                            <motion.span key={`${stepIndex}-${index}`} initial={reducedMotion ? false : { opacity: 0, y: '0.7em', rotateX: -55 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: reducedMotion ? 0 : Math.min(index * 0.028, 0.42), duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }} className="inline-block" aria-hidden="true">
                              {character === ' ' ? '\u00a0' : character}
                            </motion.span>
                          ))}
                          <span className="sr-only">{step.title}</span>
                        </h2>
                        <p id="studio-onboarding-description" className="mt-6 max-w-[31rem] text-sm leading-7 text-white/56 sm:text-base">{step.description}</p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button ref={firstActionRef} type="button" onClick={finish} className="self-start text-xs font-medium text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">Skip for now</button>
                    <div className="flex items-center justify-end gap-2">
                      {stepIndex > 0 ? <button type="button" onClick={previous} className="grid size-10 place-items-center border border-white/[0.12] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Previous onboarding step"><ArrowRight className="size-4 rotate-180" /></button> : null}
                      <button type="button" onClick={next} className="group inline-flex h-10 items-center gap-3 border border-white/[0.18] bg-white px-4 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b10]">
                        {stepIndex === STEPS.length - 1 ? 'Enter the studio' : 'Continue'}
                        {stepIndex === STEPS.length - 1 ? <Check className="size-4" /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
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
