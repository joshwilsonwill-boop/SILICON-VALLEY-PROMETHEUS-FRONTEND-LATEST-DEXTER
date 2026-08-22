'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Asterisk, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

type ServiceCard = {
  title: string
  index: string
  lines: string[]
  accent: string
  rotation: number
  x: string
  y: string
  depth: number
}

const SERVICES: ServiceCard[] = [
  {
    title: 'Strategy',
    index: '01',
    lines: ['Experience direction', 'Culture & audience', 'Creative systems', 'Positioning'],
    accent: '◧',
    rotation: -8,
    x: '5%',
    y: '23%',
    depth: 0.45,
  },
  {
    title: 'Creative',
    index: '02',
    lines: ['Art direction', 'Identity design', 'Motion language', 'Campaign worlds'],
    accent: '◩',
    rotation: 4,
    x: '25%',
    y: '16%',
    depth: 0.78,
  },
  {
    title: 'Digital',
    index: '03',
    lines: ['WebGL experiences', 'Interactive sites', 'Product moments', 'Living systems'],
    accent: '◨',
    rotation: -2,
    x: '49%',
    y: '20%',
    depth: 1,
  },
  {
    title: 'Production',
    index: '04',
    lines: ['Launch films', '3D & spatial', 'Editorial motion', 'Sound direction'],
    accent: '◫',
    rotation: 7,
    x: '73%',
    y: '15%',
    depth: 0.62,
  },
]

export function BrandCanvas() {
  const reduceMotion = useReducedMotion() ?? false
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 })

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setPointer({
      x: (event.clientX - bounds.left) / bounds.width - 0.5,
      y: (event.clientY - bounds.top) / bounds.height - 0.5,
    })
  }

  return (
    <section
      aria-labelledby="brand-canvas-title"
      className="relative isolate overflow-hidden bg-[#2634f4] text-[#08080c]"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-[15%] -top-[80%] h-[126%] w-[126%] rounded-full border-[38px] border-[#f2f3fa]"
          animate={reduceMotion ? undefined : { x: pointer.x * -18, y: pointer.y * -14 }}
          transition={{ type: 'spring', stiffness: 45, damping: 18 }}
        />
        <motion.div
          className="absolute -bottom-[102%] left-[28%] h-[135%] w-[135%] rounded-full border-[30px] border-[#f2f3fa]"
          animate={reduceMotion ? undefined : { x: pointer.x * 22, y: pointer.y * 14 }}
          transition={{ type: 'spring', stiffness: 45, damping: 18 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_77%_18%,rgba(255,255,255,0.2),transparent_19%),linear-gradient(135deg,rgba(255,255,255,0.1),transparent_35%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.9)_0.7px,transparent_0.7px)] [background-size:5px_5px]" />
      </div>

      <div className="relative mx-auto min-h-[780px] max-w-[1680px] px-5 py-5 sm:min-h-[840px] sm:px-8 lg:min-h-[900px] lg:px-12 lg:py-8">
        <header className="relative z-20 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full border border-black/75 bg-[#f2f3fa] text-sm">P</span>
            <span>Prometheus / Brand</span>
          </div>
          <a
            href="#creator-library-title"
            className="group inline-flex items-center gap-2 rounded-full bg-[#09090d] px-3.5 py-2 text-[#f2f3fa] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Browse the archive
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </a>
        </header>

        <div className="relative z-10 pt-16 sm:pt-20 lg:pt-24">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70 sm:text-[11px]">
            <Asterisk className="size-3.5" aria-hidden="true" />
            Independent direction for restless ideas
          </p>
          <h2 id="brand-canvas-title" className="max-w-[1050px] text-[clamp(3.3rem,9.5vw,10.5rem)] font-medium leading-[0.82] tracking-[-0.085em]">
            Bold ideas,
            <span className="block pl-[7vw] sm:pl-[12vw]">brought to life.</span>
          </h2>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-[300px] sm:top-[350px]" style={{ perspective: '1500px' }}>
          {SERVICES.map((service, index) => (
            <motion.article
              key={service.title}
              className="absolute h-[250px] w-[190px] select-none rounded-[10px] border border-black/20 bg-[#f8f8fc] p-4 text-[#09090d] shadow-[0_24px_42px_rgba(4,6,38,0.2)] sm:h-[310px] sm:w-[235px] sm:p-5 lg:h-[350px] lg:w-[268px]"
              style={{ left: service.x, top: service.y, transformStyle: 'preserve-3d', zIndex: index + 1 }}
              initial={reduceMotion ? false : { opacity: 0, y: 80, rotate: service.rotation - 11 }}
              animate={{
                opacity: 1,
                x: reduceMotion ? 0 : pointer.x * service.depth * 38,
                y: reduceMotion ? 0 : pointer.y * service.depth * 25,
                rotate: service.rotation + (reduceMotion ? 0 : pointer.x * service.depth * 3),
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { opacity: { duration: 0.65, delay: index * 0.09 }, type: 'spring', stiffness: 60, damping: 15 }
              }
              whileHover={reduceMotion ? undefined : { y: -18, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 18 } }}
            >
              <div className="flex items-start justify-between border-b border-[#2634f4]/22 pb-4">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.12em] text-black/50">{service.index}</span>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.07em] sm:text-2xl">{service.title}</h3>
                </div>
                <span className="text-2xl leading-none sm:text-3xl" aria-hidden="true">{service.accent}</span>
              </div>
              <ul className="mt-4 space-y-2.5 text-[10px] font-medium leading-tight text-black/72 sm:mt-5 sm:text-[11px]">
                {service.lines.map((line) => (
                  <li key={line} className="border-b border-dotted border-[#2634f4]/30 pb-1.5">{line}</li>
                ))}
              </ul>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between sm:bottom-5 sm:left-5 sm:right-5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/45">Prometheus</span>
                <span className="text-lg leading-none" aria-hidden="true">↗</span>
              </div>
            </motion.article>
          ))}

          <motion.div
            aria-hidden="true"
            className="absolute left-[53%] top-[7%] hidden h-[300px] w-[220px] -translate-x-1/2 rounded-[50%] border border-[#f2f3fa]/75 bg-[#2634f4]/25 p-4 shadow-[inset_0_0_0_10px_rgba(255,255,255,0.06)] lg:block"
            animate={reduceMotion ? undefined : { x: pointer.x * -18, y: pointer.y * -11, rotate: pointer.x * -2 }}
            transition={{ type: 'spring', stiffness: 45, damping: 18 }}
          >
            <div className="grid h-full place-items-center rounded-[50%] border border-[#f2f3fa]/70">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#f2f3fa] [writing-mode:vertical-rl]">Make it felt</span>
            </div>
          </motion.div>
        </div>

        <footer className="absolute bottom-5 left-5 right-5 z-20 flex items-end justify-between sm:bottom-8 sm:left-8 sm:right-8 lg:left-12 lg:right-12">
          <p className="max-w-[172px] text-[10px] font-medium leading-relaxed text-black/70 sm:max-w-[220px] sm:text-[11px]">
            Brand worlds with a pulse, built for the moment after people stop scrolling.
          </p>
          <a
            href="mailto:hello@prometheus.studio?subject=New%20brand%20project"
            className={cn(
              'group flex size-11 items-center justify-center rounded-full border border-black/70 bg-[#f2f3fa] text-black transition-all hover:size-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black',
              'sm:size-12',
            )}
            aria-label="Start a brand project"
          >
            <Plus className="size-5 transition-transform group-hover:rotate-90" aria-hidden="true" />
          </a>
        </footer>
      </div>
    </section>
  )
}
