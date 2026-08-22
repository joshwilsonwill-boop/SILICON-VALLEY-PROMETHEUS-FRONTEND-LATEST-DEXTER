'use client'

import * as React from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

function CountUp({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reducedMotion = useReducedMotion() ?? false
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { stiffness: 60, damping: 22, mass: 1 })
  const [display, setDisplay] = React.useState('0')

  React.useEffect(() => {
    if (!inView) return
    if (reducedMotion) {
      setDisplay(String(value).padStart(2, '0'))
      return
    }
    motionValue.set(0)
    const unsubscribe = spring.on('change', (next) => {
      setDisplay(String(Math.round(next)).padStart(2, '0'))
    })
    motionValue.set(value)
    return unsubscribe
  }, [inView, motionValue, reducedMotion, spring, value])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display}
    </span>
  )
}

const TREATMENT_STATS = [
  { label: 'Taste dimensions', value: 6 },
  { label: 'Palette swatches', value: 5 },
  { label: 'Type voices', value: 6 },
  { label: 'Motion languages', value: 6 },
]

const CAPABILITIES = [
  { index: '01', title: 'Typography treatment', detail: 'Letterforms that carry the wordmark and set the voice of every frame.' },
  { index: '02', title: 'Color palette', detail: 'A disciplined accent, tone, and ink built from your taste.' },
  { index: '03', title: 'Brand marks & icons', detail: 'Marks and lockups that travel cleanly from edit to edit.' },
  { index: '04', title: 'Signature moves', detail: 'Motion and texture language Prometheus reuses across your cuts.' },
  { index: '05', title: 'Channels', detail: 'Where the brand lives — from feed to site to final export.' },
]

export function BrandShowcase() {
  const reducedMotion = useReducedMotion() ?? false
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const wordmarkRef = React.useRef<HTMLDivElement | null>(null)
  const wordmarkInView = useInView(wordmarkRef, { once: true, margin: '-20%' })
  const scrollYProgress = useMotionValue(0)

  const lineY = useTransform(scrollYProgress, [0, 1], ['-20%', '120%'])

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onScroll = () => {
      const rect = root.getBoundingClientRect()
      const total = root.offsetHeight - window.innerHeight
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      scrollYProgress.set(progress)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [scrollYProgress])

  const wordmark = 'Let’s work together'
  const wordmarkLetters = wordmark.split('')

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden border-t border-white/[0.06] bg-[#050507] text-white"
      aria-labelledby="brand-showcase-title"
    >
      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.08] pb-6">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center border border-white/[0.14] bg-white/[0.03] text-white/70">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Prometheus brand</p>
              <h2 id="brand-showcase-title" className="mt-1 text-2xl font-semibold text-white sm:text-[2rem]">
                From taste to treatment
              </h2>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg text-white/80">
              <CountUp value={6} />
            </div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/36">Dimensions composed</div>
          </div>
        </header>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="flex flex-col justify-center">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">What the lab composes</p>
            </motion.div>

            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
              {TREATMENT_STATS.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: reducedMotion ? 0 : 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="border-l border-white/[0.12] pl-4"
                >
                  <CountUp value={stat.value} className="font-mono text-3xl text-white" />
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10"
            >
              <p className="max-w-md text-sm leading-7 text-white/55">
                Every pick in the taste lab re-composes a treatment — palette, type voice, motion, and a tagline — that the editorial chamber can reference in your cuts.
              </p>
            </motion.div>
          </div>

          <div className="space-y-3">
            {CAPABILITIES.map((cap, index) => (
              <motion.div
                key={cap.title}
                initial={reducedMotion ? false : { opacity: 0, x: 20, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: reducedMotion ? 0 : 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="group flex items-center gap-4 border border-white/[0.1] bg-white/[0.025] px-5 py-4 transition-colors duration-300 hover:border-white/[0.22] hover:bg-white/[0.045]"
              >
                <span className="font-mono text-[11px] text-white/36">{cap.index}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white/88 transition-colors group-hover:text-white">{cap.title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/45">{cap.detail}</div>
                </div>
                <svg className="size-4 shrink-0 text-white/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div ref={wordmarkRef} className="relative overflow-hidden border-t border-white/[0.06] py-16 sm:py-20">
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
          style={{ y: lineY }}
        />
        <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <h3 className="text-[clamp(2.6rem,8vw,7rem)] font-normal leading-[0.92] tracking-[-0.03em] text-white">
            {wordmarkLetters.map((letter, index) => (
              <motion.span
                key={`${letter}-${index}`}
                initial={reducedMotion ? false : { opacity: 0, y: 40 }}
                animate={wordmarkInView || reducedMotion ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: reducedMotion ? 0 : 0.6, delay: index * 0.028, ease: [0.16, 1, 0.3, 1] }}
                className={cn('inline-block', letter === ' ' ? 'w-[0.28em]' : '')}
              >
                {letter}
              </motion.span>
            ))}
          </h3>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={wordmarkInView || reducedMotion ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-md text-sm leading-7 text-white/45"
          >
            Shape the brand, then carry it into every cut. The chamber picks up the treatment where the lab leaves it.
          </motion.p>
        </div>
      </div>
    </section>
  )
}
