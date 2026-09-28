'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Asterisk, Check, Mic, Plus, Sparkles, Volume2, X } from 'lucide-react'

import { cn } from '@/lib/utils'

type BrandCard = {
  id: string
  title: string
  index: string
  lines: string[]
  accent: string
  rotation: number
  x: string
  y: string
  depth: number
}

const BRAND_CARD_STORAGE_KEY = 'prometheus.brand-canvas.cards.v1'

const DEFAULT_CARDS: BrandCard[] = [
  {
    id: 'strategy',
    title: 'Growth strategy',
    index: '01',
    lines: ['Posting cadence', 'Platform fit', 'Conversion goal', 'Audience growth'],
    accent: '◧',
    rotation: -8,
    x: '5%',
    y: '23%',
    depth: 0.45,
  },
  {
    id: 'creative',
    title: 'Type & motion',
    index: '02',
    lines: ['Display voice', 'Kinetic rhythm', 'Caption hierarchy', 'Editorial contrast'],
    accent: '◩',
    rotation: 4,
    x: '25%',
    y: '16%',
    depth: 0.78,
  },
  {
    id: 'palette',
    title: 'Brand palette',
    index: '03',
    lines: ['Royal violet #5F3DF2', 'Deep indigo #33206F', 'Signal blue #202F89', 'Soft ink #0F0B17'],
    accent: '◨',
    rotation: -2,
    x: '49%',
    y: '20%',
    depth: 1,
  },
  {
    id: 'assets',
    title: 'Brand assets',
    index: '04',
    lines: ['Icon & monogram', 'Wordmark lockup', 'Cover system', 'Motion mark'],
    accent: '◫',
    rotation: 7,
    x: '73%',
    y: '15%',
    depth: 0.62,
  },
]

const VOICES = [
  { id: 'nyx', label: 'Nyx', tone: 'Quiet' },
  { id: 'mira', label: 'Mira', tone: 'Clear' },
  { id: 'sol', label: 'Sol', tone: 'Bright' },
]

function cleanEditableValue(text: string, fallback: string) {
  return text.replace(/\s+/g, ' ').trim() || fallback
}

function EditableText({
  as: Tag = 'span',
  value,
  onCommit,
  className,
  ariaLabel,
}: {
  as?: React.ElementType
  value: string
  onCommit: (next: string) => void
  className?: string
  ariaLabel?: string
}) {
  const ref = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    const node = ref.current
    if (node && node.textContent !== value) node.textContent = value
  }, [value])

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      onBlur={() => onCommit(cleanEditableValue(ref.current?.textContent ?? '', value))}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      className={className}
    />
  )
}

function BrandVoicePanel({ onClose, reduceMotion }: { onClose: () => void; reduceMotion: boolean }) {
  const [voice, setVoice] = React.useState('nyx')
  const [staged, setStaged] = React.useState(false)
  const selectedVoice = VOICES.find((item) => item.id === voice) ?? VOICES[0]

  return (
    <motion.aside
      role="dialog"
      aria-modal="false"
      aria-label="Brand voice"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.82, y: -16, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9, y: -12, filter: 'blur(8px)' }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.84 }}
      className="absolute right-5 top-5 z-50 w-[min(25rem,calc(100vw-2.5rem))] overflow-hidden rounded-[22px] border border-white/18 bg-[#120d26]/[0.94] p-4 text-white shadow-[0_30px_80px_-34px_rgba(0,0,0,0.94)] backdrop-blur-2xl sm:right-8 sm:top-8 lg:right-12"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full border border-[#a78bfa]/40 bg-[#7c3aed]/20 text-[#ddd6fe]"><Mic className="size-4" /></span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Brand voice</p>
            <p className="mt-0.5 text-sm font-medium">{selectedVoice.label} / {selectedVoice.tone}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-white/48 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45" aria-label="Close brand voice">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2" role="group" aria-label="Voice choices">
        {VOICES.map((item) => {
          const active = item.id === voice
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setVoice(item.id)}
              className={cn(
                'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-2.5 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/65',
                active ? 'border-[#c4b5fd]/55 bg-[#7c3aed]/28 text-white' : 'border-white/10 bg-white/[0.035] text-white/55 hover:border-white/25 hover:text-white/84',
              )}
              aria-pressed={active}
            >
              <span className={cn('size-1.5 rounded-full', active ? 'bg-[#ddd6fe] shadow-[0_0_12px_rgba(221,214,254,0.95)]' : 'bg-white/30')} />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[16px] border border-white/10 bg-black/20 p-3">
        <div className="flex h-8 items-center gap-1" aria-hidden="true">
          {[0.45, 0.8, 0.6, 1, 0.5].map((height, index) => (
            <motion.span
              key={index}
              className="w-1 rounded-full bg-gradient-to-b from-[#ddd6fe] to-[#7c3aed]"
              animate={reduceMotion ? undefined : { height: [`${height * 18}px`, `${Math.max(7, height * 29)}px`, `${height * 18}px`] }}
              transition={{ duration: 0.9 + index * 0.11, repeat: Infinity, ease: 'easeInOut' }}
              style={{ height: `${height * 18}px` }}
            />
          ))}
        </div>
        <p className="min-w-0 flex-1 text-xs leading-5 text-white/66">Tell me what needs to feel more like your brand. I’ll stage a direction before anything changes.</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/38">Conversation wireframe</span>
        <button
          type="button"
          onClick={() => setStaged(true)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[#c4b5fd]/38 bg-[#7c3aed]/20 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#7c3aed]/34 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd]/65"
        >
          {staged ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
          {staged ? 'Change staged' : 'Stage change'}
        </button>
      </div>
    </motion.aside>
  )
}

export function BrandCanvas() {
  const reduceMotion = useReducedMotion() ?? false
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 })
  const [cards, setCards] = React.useState<BrandCard[]>(DEFAULT_CARDS)
  const [hasHydratedCards, setHasHydratedCards] = React.useState(false)
  const [voiceOpen, setVoiceOpen] = React.useState(false)
  const [editingCardId, setEditingCardId] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BRAND_CARD_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : null
      if (Array.isArray(parsed) && parsed.length === DEFAULT_CARDS.length) setCards(parsed as BrandCard[])
    } catch {
      // The on-card editor remains usable even when local storage is unavailable.
    } finally {
      setHasHydratedCards(true)
    }
  }, [])

  React.useEffect(() => {
    if (!hasHydratedCards) return
    try {
      window.localStorage.setItem(BRAND_CARD_STORAGE_KEY, JSON.stringify(cards))
    } catch {
      // Keep the current session state when persistence is blocked.
    }
  }, [cards, hasHydratedCards])

  const updateCard = React.useCallback((cardId: string, updater: (card: BrandCard) => BrandCard) => {
    setCards((current) => current.map((card) => (card.id === cardId ? updater(card) : card)))
  }, [])

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion || editingCardId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setPointer({
      x: (event.clientX - bounds.left) / bounds.width - 0.5,
      y: (event.clientY - bounds.top) / bounds.height - 0.5,
    })
  }

  return (
    <section
      id="brand-canvas"
      aria-labelledby="brand-canvas-title"
      className="relative isolate min-h-full snap-start snap-always overflow-hidden bg-[linear-gradient(135deg,#1b123b_0%,#33206f_48%,#202f89_100%)] text-[#f8f7ff]"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-[15%] -top-[80%] h-[126%] w-[126%] rounded-full border-[38px] border-[#f4f1ff]"
          animate={reduceMotion ? undefined : { x: pointer.x * -18, y: pointer.y * -14 }}
          transition={{ type: 'spring', stiffness: 45, damping: 18 }}
        />
        <motion.div
          className="absolute -bottom-[102%] left-[28%] h-[135%] w-[135%] rounded-full border-[30px] border-[#e9e3ff]"
          animate={reduceMotion ? undefined : { x: pointer.x * 22, y: pointer.y * 14 }}
          transition={{ type: 'spring', stiffness: 45, damping: 18 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_77%_18%,rgba(208,190,255,0.34),transparent_19%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.92)_0.7px,transparent_0.7px)] [background-size:5px_5px]" />
      </div>

      <div className="relative mx-auto min-h-[780px] max-w-[1680px] px-5 py-5 sm:min-h-[840px] sm:px-8 lg:min-h-[900px] lg:px-12 lg:py-8">
        <header className="relative z-20 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full border border-white/75 bg-[#f4f1ff] text-sm text-[#251544]">P</span>
            <span>Prometheus / Brand</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#creator-library-title" className="hidden items-center gap-2 rounded-full border border-white/16 bg-[#120d26]/35 px-3.5 py-2 text-white/80 transition hover:-translate-y-0.5 hover:bg-[#120d26]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:inline-flex">
              Browse the archive
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            <motion.button
              type="button"
              layoutId="brand-voice-trigger"
              onClick={() => setVoiceOpen((open) => !open)}
              className="group grid size-11 place-items-center rounded-full border border-white/60 bg-[#f4f1ff] text-[#22123f] shadow-[0_14px_34px_-20px_rgba(0,0,0,0.9)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              aria-label={voiceOpen ? 'Close brand voice' : 'Open brand voice'}
              aria-expanded={voiceOpen}
            >
              <Plus className={cn('size-5 transition-transform duration-500', voiceOpen ? 'rotate-45' : 'group-hover:rotate-90')} aria-hidden="true" />
            </motion.button>
          </div>
        </header>

        <div className="relative z-10 pt-16 sm:pt-20 lg:pt-24">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/66 sm:text-[11px]">
            <Asterisk className="size-3.5" aria-hidden="true" />
            Independent direction for restless ideas
          </p>
          <h2 id="brand-canvas-title" className="max-w-[1050px] text-[clamp(3.3rem,9.5vw,10.5rem)] font-medium leading-[0.82] tracking-[-0.085em] text-[#fbfaff]">
            Bold ideas,
            <span className="block pl-[7vw] sm:pl-[12vw]">brought to life.</span>
          </h2>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-[300px] sm:top-[350px]" style={{ perspective: '1500px' }}>
          {cards.map((card, index) => (
            <motion.article
              key={card.id}
              className="group absolute h-[250px] w-[190px] cursor-text rounded-[10px] border border-[#241448]/18 bg-[#faf9ff] p-4 text-[#120d26] shadow-[0_24px_42px_rgba(8,4,32,0.35)] sm:h-[310px] sm:w-[235px] sm:p-5 lg:h-[350px] lg:w-[268px]"
              style={{ left: card.x, top: card.y, transformStyle: 'preserve-3d', zIndex: index + 1 }}
              initial={reduceMotion ? false : { opacity: 0, y: 80, rotate: card.rotation - 11 }}
              animate={{
                opacity: 1,
                x: reduceMotion ? 0 : pointer.x * card.depth * 38,
                y: reduceMotion ? 0 : pointer.y * card.depth * 25,
                rotate: editingCardId === card.id ? 0 : card.rotation + (reduceMotion ? 0 : pointer.x * card.depth * 3),
              }}
              transition={reduceMotion ? { duration: 0 } : { opacity: { duration: 0.65, delay: index * 0.09 }, type: 'spring', stiffness: 60, damping: 15 }}
              whileHover={reduceMotion || editingCardId === card.id ? undefined : { y: -18, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 18 } }}
              onFocusCapture={() => setEditingCardId(card.id)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setEditingCardId(null)
              }}
            >
              <div className="flex items-start justify-between border-b border-[#5f3df2]/22 pb-4">
                <div className="min-w-0">
                  <span className="font-mono text-[9px] tracking-[0.12em] text-[#241448]/48">{card.index}</span>
                  <EditableText
                    as="h3"
                    value={card.title}
                    onCommit={(next) => updateCard(card.id, (current) => ({ ...current, title: next }))}
                    ariaLabel={`Edit ${card.title} card title`}
                    className="mt-1 cursor-text text-xl font-semibold tracking-[-0.07em] outline-none transition focus:bg-[#5f3df2]/[0.07] focus:text-[#3e22a6] sm:text-2xl"
                  />
                </div>
                <span className="text-2xl leading-none sm:text-3xl" aria-hidden="true">{card.accent}</span>
              </div>
              <ul className="mt-4 space-y-2.5 text-[10px] font-medium leading-tight text-[#21183b]/76 sm:mt-5 sm:text-[11px]">
                {card.lines.map((line, lineIndex) => (
                  <EditableText
                    as="li"
                    key={lineIndex}
                    value={line}
                    onCommit={(next) => updateCard(card.id, (current) => ({ ...current, lines: current.lines.map((item, itemIndex) => itemIndex === lineIndex ? next : item) }))}
                    ariaLabel={`Edit ${card.title} item ${lineIndex + 1}`}
                    className="cursor-text border-b border-dotted border-[#5f3df2]/32 pb-1.5 outline-none transition focus:bg-[#5f3df2]/[0.07] focus:text-[#3e22a6]"
                  />
                ))}
              </ul>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between sm:bottom-5 sm:left-5 sm:right-5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#241448]/42">Click to edit</span>
                <span className="text-lg leading-none text-[#3e22a6]" aria-hidden="true">↗</span>
              </div>
            </motion.article>
          ))}

          <motion.div
            aria-hidden="true"
            className="absolute left-[53%] top-[7%] hidden h-[300px] w-[220px] -translate-x-1/2 rounded-[50%] border border-[#e9e3ff]/75 bg-[#7c3aed]/14 p-4 shadow-[inset_0_0_0_10px_rgba(255,255,255,0.06)] lg:block"
            animate={reduceMotion ? undefined : { x: pointer.x * -18, y: pointer.y * -11, rotate: pointer.x * -2 }}
            transition={{ type: 'spring', stiffness: 45, damping: 18 }}
          >
            <div className="grid h-full place-items-center rounded-[50%] border border-[#e9e3ff]/70">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#f4f1ff] [writing-mode:vertical-rl]">Make it felt</span>
            </div>
          </motion.div>
        </div>

        <footer className="absolute bottom-5 left-5 right-5 z-20 flex items-end justify-between sm:bottom-8 sm:left-8 sm:right-8 lg:left-12 lg:right-12">
          <p className="max-w-[210px] text-[10px] font-medium leading-relaxed text-white/65 sm:max-w-[250px] sm:text-[11px]">Click any title or detail directly on a card to tune the direction. Changes stay with this brand room.</p>
          <span className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52 sm:inline-flex"><Volume2 className="size-3.5" /> Voice at top right</span>
        </footer>

        <AnimatePresence>{voiceOpen ? <BrandVoicePanel onClose={() => setVoiceOpen(false)} reduceMotion={reduceMotion} /> : null}</AnimatePresence>
      </div>
    </section>
  )
}
