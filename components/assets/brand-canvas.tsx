'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Asterisk, Check, Globe, Mic, Plus, Sparkles, Volume2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { mapSavedBrandDnaToCanvas, type BrandCanvasCard as BrandCard, type BrandDirection } from '@/lib/brand-dna/canvas-mapping'
import type { ExtractedBrandDna } from '@/lib/brand-dna/types'

const BRAND_PROFILE_STORAGE_KEY = 'prometheus.brand-canvas.profile.v1'
const BRAND_CARD_STORAGE_PREFIX = 'prometheus.brand-canvas.cards.v2.'
const SAVED_BRAND_DNA_KEY = 'prometheus.brand-dna.v1'

const BRAND_DIRECTIONS: BrandDirection[] = [
  {
    id: 'dan-martell',
    name: 'Dan Martell',
    subtitle: 'Founder growth / time freedom',
    sourceUrl: 'https://www.danmartell.com/',
    headline: 'Build freedom,\nthen scale.',
    colors: { start: '#111a31', middle: '#17294a', end: '#164b61', accent: '#b8f36b', soft: '#edf5dc' },
    cards: [
      { id: 'strategy', title: 'Buy back your time', index: '01', lines: ['Protect high-value work', 'Delegate the $20 tasks', 'Build a business that runs without you', 'Scale without burning out'], accent: '↗', rotation: -8, x: '5%', y: '23%', depth: 0.45 },
      { id: 'creative', title: 'Founder playbooks', index: '02', lines: ['Direct, energetic delivery', 'One useful idea per post', 'Story → lesson → action', 'Make growth feel possible'], accent: '✳', rotation: 4, x: '25%', y: '16%', depth: 0.78 },
      { id: 'palette', title: 'Direction palette', index: '03', lines: ['Deep navy #111A31', 'Evergreen #164B61', 'Signal lime #B8F36B', 'Warm paper #EDF5DC'], accent: '◉', rotation: -2, x: '49%', y: '20%', depth: 1 },
      { id: 'assets', title: 'Signature themes', index: '04', lines: ['Buy Back Your Time', 'Founder growth systems', 'SaaS & AI operations', 'Freedom, family, endurance'], accent: '▣', rotation: 7, x: '73%', y: '15%', depth: 0.62 },
    ],
  },
  {
    id: 'prometheus',
    name: 'Prometheus Studio',
    subtitle: 'Independent creative direction',
    sourceUrl: '',
    headline: 'Bold ideas,\nbrought to life.',
    colors: { start: '#1b123b', middle: '#33206f', end: '#202f89', accent: '#5f3df2', soft: '#f4f1ff' },
    cards: [
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
    ],
  },
]

const DEFAULT_PROFILE_ID = 'dan-martell'

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

function BrandSourcePanel({
  onAnalyze,
  onClose,
  error,
  isAnalyzing,
  reduceMotion,
}: {
  onAnalyze: (website: string) => void
  onClose: () => void
  error: string | null
  isAnalyzing: boolean
  reduceMotion: boolean
}) {
  const [website, setWebsite] = React.useState('')

  return (
    <motion.aside
      role="dialog"
      aria-modal="false"
      aria-label="Analyze a brand website"
      initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="absolute right-5 top-5 z-50 w-[min(29rem,calc(100vw-2.5rem))] rounded-[22px] border border-white/20 bg-[#101827]/[0.96] p-5 text-white shadow-[0_30px_80px_-34px_rgba(0,0,0,0.94)] backdrop-blur-2xl sm:right-8 sm:top-8 lg:right-12"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Build from a real source</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Analyze a person or brand</h3>
          <p className="mt-1 text-xs leading-5 text-white/60">Add their website. We’ll read public pages and styles, then map the findings onto these cards.</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full text-white/48 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45" aria-label="Close website analysis">
          <X className="size-4" />
        </button>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (!isAnalyzing && website.trim()) onAnalyze(website.trim())
        }}
      >
        <label htmlFor="brand-source-url" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/48">Website URL</label>
        <div className="flex gap-2">
          <input
            id="brand-source-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            maxLength={2_000}
            placeholder="https://danmartell.com"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            disabled={isAnalyzing}
            required
            className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--brand-accent)]/70 focus:ring-2 focus:ring-[var(--brand-accent)]/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!website.trim() || isAnalyzing}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] px-3.5 text-xs font-bold text-[#111827] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-55 sm:px-4"
          >
            {isAnalyzing ? <span className="size-3.5 animate-spin rounded-full border-2 border-[#111827]/30 border-t-[#111827]" aria-hidden="true" /> : <Globe className="size-3.5" aria-hidden="true" />}
            {isAnalyzing ? 'Analyzing' : 'Analyze site'}
          </button>
        </div>
      </form>

      {isAnalyzing ? <p className="mt-3 text-xs text-white/60" role="status">Reading public pages, visual styles, and brand language…</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100" role="alert">{error}</p> : null}
      <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-white/42">Only public website content is analyzed. The profile and cards remain editable.</p>
    </motion.aside>
  )
}

export function BrandCanvas() {
  const reduceMotion = useReducedMotion() ?? false
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 })
  const [activeProfileId, setActiveProfileId] = React.useState(DEFAULT_PROFILE_ID)
  const [savedBrandDirection, setSavedBrandDirection] = React.useState<BrandDirection | null>(null)
  const [cards, setCards] = React.useState<BrandCard[]>(BRAND_DIRECTIONS[0].cards)
  const [hasHydratedCards, setHasHydratedCards] = React.useState(false)
  const [loadedProfileId, setLoadedProfileId] = React.useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = React.useState(false)
  const [sourceOpen, setSourceOpen] = React.useState(false)
  const [sourceError, setSourceError] = React.useState<string | null>(null)
  const [isAnalyzingSite, setIsAnalyzingSite] = React.useState(false)
  const [editingCardId, setEditingCardId] = React.useState<string | null>(null)
  const availableDirections = savedBrandDirection ? [...BRAND_DIRECTIONS, savedBrandDirection] : BRAND_DIRECTIONS
  const activeDirection = availableDirections.find((direction) => direction.id === activeProfileId) ?? BRAND_DIRECTIONS[0]

  React.useEffect(() => {
    try {
      const savedDirection = mapSavedBrandDnaToCanvas(window.localStorage.getItem(SAVED_BRAND_DNA_KEY))
      setSavedBrandDirection(savedDirection)
      const storedProfile = window.localStorage.getItem(BRAND_PROFILE_STORAGE_KEY)
      if (storedProfile && (BRAND_DIRECTIONS.some((direction) => direction.id === storedProfile) || (savedDirection && storedProfile === savedDirection.id))) setActiveProfileId(storedProfile)
    } catch {
      // Keep the default direction when local storage is unavailable.
    }
  }, [])

  React.useEffect(() => {
    setHasHydratedCards(false)
    setLoadedProfileId(null)
    try {
      const stored = window.localStorage.getItem(`${BRAND_CARD_STORAGE_PREFIX}${activeProfileId}`)
      const parsed = stored ? JSON.parse(stored) : null
      if (Array.isArray(parsed) && parsed.length === activeDirection.cards.length) {
        setCards(parsed as BrandCard[])
      } else if (activeProfileId === 'prometheus') {
        const legacy = window.localStorage.getItem('prometheus.brand-canvas.cards.v1')
        const legacyCards = legacy ? JSON.parse(legacy) : null
        setCards(Array.isArray(legacyCards) && legacyCards.length === activeDirection.cards.length ? legacyCards as BrandCard[] : activeDirection.cards)
      } else {
        setCards(activeDirection.cards)
      }
    } catch {
      // The on-card editor remains usable even when local storage is unavailable.
      setCards(activeDirection.cards)
    } finally {
      setHasHydratedCards(true)
      setLoadedProfileId(activeProfileId)
    }
  }, [activeDirection, activeProfileId])

  React.useEffect(() => {
    if (!hasHydratedCards || loadedProfileId !== activeProfileId) return
    try {
      window.localStorage.setItem(`${BRAND_CARD_STORAGE_PREFIX}${activeProfileId}`, JSON.stringify(cards))
    } catch {
      // Keep the current session state when persistence is blocked.
    }
  }, [activeProfileId, cards, hasHydratedCards, loadedProfileId])

  const selectDirection = (profileId: string) => {
    setActiveProfileId(profileId)
    setHasHydratedCards(false)
    try {
      window.localStorage.setItem(BRAND_PROFILE_STORAGE_KEY, profileId)
    } catch {
      // The active direction remains available for this session.
    }
  }

  const analyzeWebsite = async (website: string) => {
    setIsAnalyzingSite(true)
    setSourceError(null)
    try {
      const response = await fetch('/api/brand-dna/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website }),
      })
      const payload = await response.json().catch(() => null) as { profile?: ExtractedBrandDna; error?: string } | null
      if (!response.ok) throw new Error(payload?.error || 'Brand analysis failed. Check the website and try again.')
      if (!payload?.profile) throw new Error('The analysis did not return a brand profile. Please try again.')

      const serialized = JSON.stringify(payload.profile)
      const direction = mapSavedBrandDnaToCanvas(serialized)
      if (!direction) throw new Error('The website returned an incomplete brand profile. Please try another source.')
      try {
        window.localStorage.setItem(SAVED_BRAND_DNA_KEY, serialized)
        window.localStorage.removeItem(`${BRAND_CARD_STORAGE_PREFIX}${direction.id}`)
        window.localStorage.setItem(BRAND_PROFILE_STORAGE_KEY, direction.id)
      } catch {
        // Keep the current generated profile even if browser storage is unavailable.
      }
      setSavedBrandDirection(direction)
      setCards(direction.cards)
      setActiveProfileId(direction.id)
      setLoadedProfileId(direction.id)
      setHasHydratedCards(true)
      setSourceOpen(false)
    } catch (error) {
      setSourceError(error instanceof Error ? error.message : 'Brand analysis failed. Please try again.')
    } finally {
      setIsAnalyzingSite(false)
    }
  }

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
      className="relative isolate min-h-full snap-start snap-normal overflow-hidden text-[#f8f7ff]"
      style={{ background: `linear-gradient(135deg, ${activeDirection.colors.start} 0%, ${activeDirection.colors.middle} 48%, ${activeDirection.colors.end} 100%)`, '--brand-accent': activeDirection.colors.accent, '--brand-soft': activeDirection.colors.soft } as React.CSSProperties}
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
          className="absolute -bottom-[102%] left-[28%] h-[135%] w-[135%] rounded-full border-[30px] border-[var(--brand-soft)]/65"
          animate={reduceMotion ? undefined : { x: pointer.x * 22, y: pointer.y * 14 }}
          transition={{ type: 'spring', stiffness: 45, damping: 18 }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 77% 18%, color-mix(in srgb, ${activeDirection.colors.accent} 30%, transparent), transparent 19%), linear-gradient(135deg, rgba(255,255,255,0.12), transparent 35%)` }} />
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.92)_0.7px,transparent_0.7px)] [background-size:5px_5px]" />
      </div>

      <div className="relative mx-auto min-h-[780px] max-w-[1680px] px-5 py-5 sm:min-h-[840px] sm:px-8 lg:min-h-[900px] lg:px-12 lg:py-8">
        <header className="relative z-20 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full border border-white/75 bg-[var(--brand-soft)] text-sm text-[#251544]">P</span>
            <span>Prometheus / Brand</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-full border border-white/20 bg-[#120d26]/35 px-2.5 py-2 text-[9px] text-white/75 sm:gap-2 sm:px-3.5 sm:text-[10px]">
              <span className="hidden text-white/45 sm:inline">For</span>
              <select
                value={activeProfileId}
                onChange={(event) => selectDirection(event.target.value)}
                aria-label="Choose a brand direction"
                className="max-w-[90px] cursor-pointer appearance-none bg-transparent text-white outline-none sm:max-w-[150px] [&>option]:bg-[#17132a] [&>option]:text-white"
              >
                {availableDirections.map((direction) => <option key={direction.id} value={direction.id}>{direction.id === 'saved-brand-dna' ? `${direction.name} · website` : direction.name}</option>)}
              </select>
            </label>
            {activeDirection.sourceUrl ? <a href={activeDirection.sourceUrl} target="_blank" rel="noreferrer" className="hidden rounded-full border border-white/16 bg-[#120d26]/35 px-3 py-2 text-[10px] text-white/70 transition hover:bg-[#120d26]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:inline-flex">Source ↗</a> : null}
            <a href="#creator-library-title" className="hidden items-center gap-2 rounded-full border border-white/16 bg-[#120d26]/35 px-3.5 py-2 text-white/80 transition hover:-translate-y-0.5 hover:bg-[#120d26]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:inline-flex">
              Browse the archive
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => {
                setVoiceOpen(false)
                setSourceError(null)
                setSourceOpen((open) => !open)
              }}
              aria-label="Analyze a website and build its brand profile"
              aria-expanded={sourceOpen}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/25 bg-[#101827]/55 px-3 text-[10px] font-semibold text-white/85 transition hover:-translate-y-0.5 hover:bg-[#101827]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-3.5"
            >
              <Globe className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Analyze URL</span>
            </button>
            <motion.button
              type="button"
              layoutId="brand-voice-trigger"
              onClick={() => {
                setSourceOpen(false)
                setVoiceOpen((open) => !open)
              }}
              className="group grid size-11 place-items-center rounded-full border border-white/60 bg-[var(--brand-soft)] text-[#22123f] shadow-[0_14px_34px_-20px_rgba(0,0,0,0.9)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
            {activeDirection.name} · {activeDirection.subtitle}
          </p>
          <h2 id="brand-canvas-title" className="max-w-[1050px] text-[clamp(3.3rem,9.5vw,10.5rem)] font-medium leading-[0.82] tracking-[-0.085em] text-[#fbfaff]">
            {activeDirection.headline.split('\n')[0]}
            <span className="block pl-[7vw] sm:pl-[12vw]">{activeDirection.headline.split('\n')[1]}</span>
          </h2>
        </div>

        <div className="absolute inset-x-0 bottom-0 top-[300px] sm:top-[350px]" style={{ perspective: '1500px' }}>
          {cards.map((card, index) => (
            <motion.article
              key={card.id}
              className="group absolute h-[250px] w-[190px] cursor-text rounded-[10px] border border-[#241448]/18 bg-[#faf9ff] p-4 text-[#120d26] shadow-[0_24px_42px_rgba(8,4,32,0.35)] sm:h-[310px] sm:w-[235px] sm:p-5 lg:h-[350px] lg:w-[268px]"
              style={{ left: card.x, top: card.y, transformStyle: 'preserve-3d', zIndex: index + 1, '--card-accent': activeDirection.colors.accent } as React.CSSProperties}
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
              <div className="flex items-start justify-between border-b border-[var(--card-accent)]/35 pb-4">
                <div className="min-w-0">
                  <span className="font-mono text-[9px] tracking-[0.12em] text-[#241448]/48">{card.index}</span>
                  <EditableText
                    as="h3"
                    value={card.title}
                    onCommit={(next) => updateCard(card.id, (current) => ({ ...current, title: next }))}
                    ariaLabel={`Edit ${card.title} card title`}
                    className="mt-1 cursor-text text-xl font-semibold tracking-[-0.07em] outline-none transition focus:bg-[var(--card-accent)]/10 focus:text-[#3e22a6] sm:text-2xl"
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
                    className="cursor-text border-b border-dotted border-[var(--card-accent)]/45 pb-1.5 outline-none transition focus:bg-[var(--card-accent)]/10 focus:text-[#3e22a6]"
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
            className="absolute left-[53%] top-[7%] hidden h-[300px] w-[220px] -translate-x-1/2 rounded-[50%] border border-[var(--brand-soft)]/75 bg-[var(--brand-accent)]/14 p-4 shadow-[inset_0_0_0_10px_rgba(255,255,255,0.06)] lg:block"
            animate={reduceMotion ? undefined : { x: pointer.x * -18, y: pointer.y * -11, rotate: pointer.x * -2 }}
            transition={{ type: 'spring', stiffness: 45, damping: 18 }}
          >
            <div className="grid h-full place-items-center rounded-[50%] border border-[var(--brand-soft)]/70">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-soft)] [writing-mode:vertical-rl]">Make it felt</span>
            </div>
          </motion.div>
        </div>

        <footer className="absolute bottom-5 left-5 right-5 z-20 flex items-end justify-between sm:bottom-8 sm:left-8 sm:right-8 lg:left-12 lg:right-12">
          <p className="max-w-[260px] text-[10px] font-medium leading-relaxed text-white/65 sm:text-[11px]">Direction study for {activeDirection.name}. Card content follows the selected profile; edits stay with it.</p>
          <span className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52 sm:inline-flex"><Volume2 className="size-3.5" /> Voice at top right</span>
        </footer>

        <AnimatePresence>{voiceOpen ? <BrandVoicePanel onClose={() => setVoiceOpen(false)} reduceMotion={reduceMotion} /> : null}</AnimatePresence>
        <AnimatePresence>
          {sourceOpen ? (
            <BrandSourcePanel
              onAnalyze={analyzeWebsite}
              onClose={() => setSourceOpen(false)}
              error={sourceError}
              isAnalyzing={isAnalyzingSite}
              reduceMotion={reduceMotion}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  )
}
