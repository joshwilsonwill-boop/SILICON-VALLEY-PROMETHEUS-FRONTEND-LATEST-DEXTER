'use client'

import * as React from 'react'
import gsap from 'gsap'
import { useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Check,
  ChevronDown,
  Copy,
  Feather,
  Layers,
  LibraryBig,
  Link2,
  LoaderCircle,
  Mic,
  Palette,
  Scan,
  Send,
  Sparkles,
  Type,
  Wand2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useVoiceInput } from '@/hooks/use-voice-input'
import { VoiceWaveform } from '@/components/editor/voice-waveform'
import { consumePrometheusChatStream } from '@/lib/prometheus-assistant/chat-stream-client'
import type { PrometheusChatStreamEvent } from '@/lib/prometheus-assistant/chat-stream'
import { cn } from '@/lib/utils'
import {
  buildTastePrompt,
  DEFAULT_TASTE,
  deriveTreatment,
  deriveTreatmentFromUrl,
  DIMENSIONS,
  type BrandTaste,
  type BrandTreatment,
  type TasteDimension,
} from '@/lib/brand-alchemy'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const DIMENSION_ICONS: Record<string, LucideIcon> = {
  mood: Sparkles,
  palette: Palette,
  type: Type,
  era: LibraryBig,
  texture: Layers,
  energy: Zap,
}

export function BrandTasteLab() {
  const reduceMotion = useReducedMotion() ?? false
  const scope = React.useRef<HTMLDivElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [taste, setTaste] = React.useState<BrandTaste>(DEFAULT_TASTE)
  const [brandName, setBrandName] = React.useState('')
  const [urlValue, setUrlValue] = React.useState('')
  const [urlTreatment, setUrlTreatment] = React.useState<BrandTreatment | null>(null)
  const [mode, setMode] = React.useState<'taste' | 'url'>('taste')
  const [prompt, setPrompt] = React.useState('')

  const treatment = React.useMemo(() => {
    if (mode === 'url' && urlTreatment) return urlTreatment
    return deriveTreatment(taste, brandName)
  }, [mode, urlTreatment, taste, brandName])

  const voice = useVoiceInput({
    onTranscript: (text) => {
      setPrompt((current) => (current.trim() ? `${current.trim()} ${text}` : text))
    },
  })

  React.useEffect(() => {
    if (reduceMotion) return
    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo('[data-lab-reveal]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 })
      tl.fromTo('[data-lab-chip="true"]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.02 }, '-=0.3')
      tl.fromTo('[data-lab-swatch]', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: 0.06 }, '-=0.25')
    }, scope)
    return () => context.revert()
  }, [reduceMotion])

  React.useEffect(() => {
    if (reduceMotion) return
    if (!cardRef.current) return
    const tween = gsap.fromTo(
      cardRef.current,
      { opacity: 0.15, scale: 1.015, filter: 'blur(9px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out' },
    )
    return () => {
      tween.kill()
    }
  }, [treatment, reduceMotion])

  const setTasteOption = (dimensionId: keyof BrandTaste, optionId: string) => {
    setMode('taste')
    setTaste((current) => ({ ...current, [dimensionId]: optionId }))
  }

  const shuffle = () => {
    setMode('taste')
    setTaste((current) => {
      const next = { ...current }
      for (const dimension of DIMENSIONS) {
        const options = dimension.options
        next[dimension.id] = options[Math.floor(Math.random() * options.length)].id
      }
      return next
    })
  }

  const extractUrl = () => {
    if (!urlValue.trim()) return
    try {
      const result = deriveTreatmentFromUrl(urlValue)
      setUrlTreatment(result)
      setMode('url')
    } catch {
      // Invalid URL input; leave current treatment intact.
    }
  }

  const renameBrand = (value: string) => {
    setBrandName(value)
    if (mode === 'url' && urlTreatment) {
      setUrlTreatment({ ...urlTreatment, name: value.trim() || 'Mono Studio' })
    }
  }

  return (
    <section ref={scope} className="relative overflow-hidden bg-[#050507] text-white" aria-labelledby="brand-taste-title">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(rgba(52,255,137,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(52,255,137,0.02) 1px, transparent 1px), radial-gradient(circle, rgba(72,255,151,0.12) 0.7px, transparent 0.8px)',
          backgroundSize: '64px 64px, 64px 64px, 5px 5px',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#3cff8f]/25" />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#55ff9b]/15 pb-6" data-lab-reveal>
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center border border-[#55ff9b]/25 bg-[#07120b] text-[#63ffa4]">
              <Wand2 className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#63ffa4]/64">Prometheus archive</p>
              <h2 id="brand-taste-title" className="mt-1 text-2xl font-semibold text-white sm:text-[2rem]">
                Brand taste lab
              </h2>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg text-[#63ffa4]">
              {String(treatment?.keywords.length ?? 0).padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/38">Live signals</div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_minmax(360px,0.9fr)] xl:gap-10">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3" data-lab-reveal>
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/42">Select your personal taste</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={shuffle} className="border border-white/10 bg-black/20 text-white/70 hover:text-white">
                  <Zap className="size-3.5" />
                  Shuffle
                </Button>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/34">Every pick re-composes the treatment</div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {DIMENSIONS.map((dimension, dimensionIndex) => (
                <TasteGroup
                  key={dimension.id}
                  dimension={dimension}
                  value={taste[dimension.id]}
                  index={dimensionIndex}
                  reducedMotion={reduceMotion}
                  onSelect={(optionId) => setTasteOption(dimension.id, optionId)}
                />
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <div data-lab-reveal className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.26em] text-white/42">Live treatment</div>
              <div className="inline-flex items-center gap-1 rounded-full border border-[#55ff9b]/25 bg-[#07120b]/70 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-[#63ffa4]/80">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#63ffa4]" />
                {mode === 'url' ? 'URL sourced' : 'Composed from taste'}
              </div>
            </div>

            <BrandCard ref={cardRef} treatment={treatment} onNameChange={renameBrand} />
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2" data-lab-reveal>
          <SourceUrlPanel
            value={urlValue}
            active={mode === 'url' && !!urlTreatment}
            onChange={setUrlValue}
            onExtract={extractUrl}
            onEnter={extractUrl}
          />
          <AiPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            voice={voice}
            taste={taste}
            brandName={brandName}
          />
        </div>
      </div>
    </section>
  )
}

function TasteGroup({
  dimension,
  value,
  index,
  reducedMotion,
  onSelect,
}: {
  dimension: TasteDimension
  value: string
  index: number
  reducedMotion: boolean
  onSelect: (optionId: string) => void
}) {
  const Icon = DIMENSION_ICONS[dimension.id] ?? Feather
  return (
    <div
      className="rounded-[12px] border border-white/10 bg-white/[0.02] p-4"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-2">
        <div className="grid size-7 place-items-center border border-white/12 bg-black/30 text-[#63ffa4]/80">
          <Icon className="size-3.5" aria-hidden="true" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">{dimension.label}</div>
          <div className="mt-0.5 text-[10px] text-white/38">{dimension.blurb}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {dimension.options.map((option) => {
          const active = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              data-lab-chip="true"
              aria-pressed={active}
              onClick={() => onSelect(option.id)}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-[11px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                active
                  ? 'border-[#55ff9b]/55 bg-[#0d1f14] text-[#63ffa4] shadow-[0_10px_24px_-18px_rgba(86,255,151,0.55)]'
                  : 'border-white/10 bg-black/20 text-white/60 hover:border-white/22 hover:text-white',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const BrandCard = React.forwardRef<HTMLDivElement, { treatment: BrandTreatment; onNameChange: (value: string) => void }>(
  function BrandCard({ treatment, onNameChange }, ref) {
    const [open, setOpen] = React.useState(true)
    const [copied, setCopied] = React.useState(false)

    const copySpec = () => {
      void navigator.clipboard?.writeText(treatment.spec)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }

    return (
      <div
        ref={ref}
        className="overflow-hidden rounded-[14px] border border-white/12 bg-[linear-gradient(165deg,rgba(254,254,254,0.03),rgba(255,255,255,0.005))] shadow-[0_44px_120px_-54px_rgba(0,0,0,0.92)]"
        style={{ background: `radial-gradient(140% 90% at 20% 0%, ${treatment.accent}18 0%, transparent 48%), linear-gradient(180deg, ${treatment.surface} 0%, ${treatment.background} 100%)` }}
      >
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">
              {treatment.source === 'url' ? `Sourced · ${treatment.domain}` : 'Your signature direction'}
            </div>
            <div
              className="hidden h-2.5 w-2.5 rounded-full sm:block"
              style={{ background: treatment.accent, boxShadow: `0 0 18px 2px ${treatment.accent}66` }}
            />
          </div>
          <input
            type="text"
            value={treatment.name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Name your brand"
            aria-label="Brand name"
            className="mt-2 w-full bg-transparent text-2xl font-semibold tracking-[-0.02em] text-white outline-none placeholder:text-white/28"
          />
        </div>

      <div className="px-5 py-5">
        <div className="flex items-baseline justify-between gap-3" data-lab-swatch>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Wordmark</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/28">{treatment.displayName}</div>
        </div>
        <div className="mt-3 select-none overflow-hidden border border-white/10 bg-black/25 px-5 py-6 text-center" style={{ fontFamily: treatment.stack }}>
          <div
            className="text-[min(10vw,3.4rem)] font-black leading-none tracking-[-0.04em]"
            style={{ color: treatment.ink, textShadow: `0 0 40px ${treatment.accent}55` }}
          >
            {treatment.name.toUpperCase()}
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-[0.34em]" style={{ color: treatment.accent }}>
            {treatment.era} · {treatment.texture}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Palette</div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {treatment.palette.map((swatch) => (
              <div key={swatch.name} className="group text-center" data-lab-swatch>
                <div className="h-12 rounded-[6px] border border-white/10 transition-transform duration-300 group-hover:-translate-y-0.5" style={{ background: swatch.hex }} />
                <div className="mt-1.5 truncate text-[9px] uppercase tracking-[0.14em] text-white/42">{swatch.name}</div>
                <div className="font-mono text-[8px] text-white/30">{swatch.hex}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Type voice · Aa</div>
          <div className="mt-2 flex items-center gap-3 rounded-[8px] border border-white/10 bg-black/25 px-4 py-3">
            <span className="grid size-9 place-items-center rounded-[6px] border border-white/12" style={{ fontFamily: treatment.stack, color: treatment.accent }}>
              Aa
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" style={{ fontFamily: treatment.stack, color: treatment.ink }}>
                {treatment.name}
              </div>
              <div className="truncate text-[10px] uppercase tracking-[0.16em] text-white/38">{treatment.displayName}</div>
            </div>
            <div className="ml-auto text-[9px] uppercase tracking-[0.16em] text-white/28">{treatment.era}</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/38">Signal tags</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {treatment.keywords.slice(0, 7).map((keyword) => (
              <span key={keyword} className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] text-white/62">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[8px] border border-white/10 bg-black/25 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/38">Tagline</div>
          <p className="mt-1.5 text-sm leading-6" style={{ color: treatment.ink }}>
            {treatment.tagline}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((current) => !current)} className="w-full justify-between">
            <span>Treatment spec</span>
            <ChevronDown className={cn('size-4 transition-transform duration-300', open && 'rotate-180')} />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={copySpec} aria-label="Copy treatment spec" title="Copy treatment spec">
            {copied ? <Check className="size-4 text-[#63ffa4]" /> : <Copy className="size-4" />}
          </Button>
        </div>
        {open ? (
          <div className="mt-3 max-h-72 overflow-y-auto overscroll-contain rounded-[8px] border border-white/10 bg-black/40 p-4">
            <Markdown content={treatment.spec} accent={treatment.accent} />
          </div>
        ) : null}
      </div>
    </div>
  )
})

function SourceUrlPanel({
  value,
  active,
  onChange,
  onExtract,
  onEnter,
}: {
  value: string
  active: boolean
  onChange: (value: string) => void
  onExtract: () => void
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center border border-white/12 bg-black/30 text-[#63ffa4]/80">
          <Scan className="size-4" aria-hidden="true" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">Source a URL</div>
          <div className="mt-0.5 text-[10px] text-white/38">Drop a link and watch the whole treatment appear.</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-[10px] border border-white/10 bg-black/30 px-3 focus-within:border-[#55ff9b]/40">
          <Link2 className="size-4 shrink-0 text-white/40" aria-hidden="true" />
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onEnter()
              }
            }}
            placeholder="e.g. awwards.com or a brand you admire"
            aria-label="Brand URL"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28"
          />
        </div>
        <Button type="button" onClick={onExtract} className="h-11 rounded-[10px] border border-[#55ff9b]/30 bg-[#07120b] px-4 text-[#63ffa4] hover:bg-[#0a1c11]">
          <Wand2 className="size-4" />
          Extract
        </Button>
      </div>

      <div className="mt-4 rounded-[8px] border border-dashed border-white/10 px-4 py-3 text-[11px] leading-5 text-white/46">
        {active
          ? 'Treatment locked to the sourced link. Touch any taste chip to switch back to manual composition.'
          : 'The domain is hashed into a deterministic palette, type voice, era, and motion language — a fully-formed treatment in one shot.'}
      </div>
    </div>
  )
}

function AiPanel({
  prompt,
  onPromptChange,
  voice,
  taste,
  brandName,
}: {
  prompt: string
  onPromptChange: (value: string) => void
  voice: ReturnType<typeof useVoiceInput>
  taste: BrandTaste
  brandName: string
}) {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [streaming, setStreaming] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const contentRef = React.useRef<string>('')

  const run = React.useCallback(async () => {
    const message = buildTastePrompt(taste, brandName, prompt)
    if (!message) return
    setStreaming(true)
    setError(null)
    setOpen(true)
    contentRef.current = ''
    setMessages((current) => [...current, { role: 'user', content: prompt.trim() || 'Shape my brand treatment.' }])

    const onEvent = (event: PrometheusChatStreamEvent) => {
      if (event.type === 'status') {
        setStatus(event.message)
      } else if (event.type === 'delta') {
        contentRef.current += event.content
        setMessages((current) => {
          const next = [...current]
          const existing = next[next.length - 1]
          if (existing && existing.role === 'assistant') {
            next[next.length - 1] = { role: 'assistant', content: contentRef.current }
          } else {
            next.push({ role: 'assistant', content: contentRef.current })
          }
          return next
        })
      } else if (event.type === 'error') {
        setError(event.message)
      }
    }

    try {
      const response = await fetch('/api/prometheus-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      await consumePrometheusChatStream(response, onEvent)
      if (!contentRef.current) {
        setMessages((current) => [...current, { role: 'assistant', content: fallbackTreatmentReply(taste) }])
        contentRef.current = fallbackTreatmentReply(taste)
      }
    } catch (streamError) {
      const text = streamError instanceof Error ? streamError.message : 'Prometheus could not generate a brand response.'
      setError(text)
      if (!contentRef.current) {
        setMessages((current) => [...current, { role: 'assistant', content: fallbackTreatmentReply(taste) }])
        contentRef.current = fallbackTreatmentReply(taste)
      }
    } finally {
      setStreaming(false)
      setStatus(null)
    }
  }, [taste, brandName, prompt])

  return (
    <div className="flex flex-col rounded-[14px] border border-white/10 bg-white/[0.02] p-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 text-left"
      >
        <div className="grid size-8 place-items-center border border-white/12 bg-black/30 text-[#63ffa4]/80">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">The Strategist</div>
          <div className="mt-0.5 truncate text-[10px] text-white/38">Chat · voice · front-and-back on your brand</div>
        </div>
        <ChevronDown className={cn('size-4 text-white/40 transition-transform duration-300', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-end gap-2">
            {voice.state === 'recording' ? (
              <div className="flex h-12 flex-1 items-center rounded-[10px] border border-white/10 bg-black/30 px-3">
                <VoiceWaveform
                  getLevel={voice.getLevel}
                  onStop={() => voice.stop()}
                />
              </div>
            ) : (
              <div className="flex max-h-20 flex-1 items-center gap-2 rounded-[10px] border border-white/10 bg-black/30 px-3 focus-within:border-[#55ff9b]/40">
                <textarea
                  value={prompt}
                  onChange={(event) => onPromptChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void run()
                    }
                  }}
                  rows={1}
                  placeholder="Tell the strategist about your brand…"
                  aria-label="Ask the brand strategist"
                  className="max-h-20 min-h-8 flex-1 resize-none bg-transparent text-sm leading-6 text-white/88 outline-none placeholder:text-white/28"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (voice.state === 'transcribing') {
                      voice.stop()
                    } else {
                      void voice.start()
                    }
                  }}
                  disabled={streaming}
                  aria-label="Record voice input"
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-20',
                  )}
                >
                  {voice.state === 'transcribing' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => void run()}
              className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#55ff9b]/30 bg-[#07120b] text-[#63ffa4] transition-colors hover:bg-[#0a1c11] disabled:opacity-40"
              disabled={streaming}
              aria-label="Ask the strategist"
            >
              {streaming ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>

          {voice.error ? (
            <p className="text-[11px] text-[#ff6a55]/80" role="alert">
              {voice.error}
            </p>
          ) : null}
          {error ? (
            <p className="text-[11px] text-[#ff6a55]/80" role="alert">
              {error}
            </p>
          ) : null}

          {messages.length > 0 ? (
            <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain rounded-[10px] border border-white/10 bg-black/30 p-3">
              {status && streaming ? (
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
                  <LoaderCircle className="size-3 animate-spin" />
                  {status}
                </div>
              ) : null}
              {messages.map((message, index) => (
                <div key={index} className={cn('rounded-[10px] px-3 py-2 text-sm leading-6', message.role === 'user' ? 'bg-white/[0.06] text-white/86' : 'bg-white/[0.03] text-white/82')}>
                  {message.role === 'assistant' ? <Markdown content={message.content} /> : <p className="whitespace-pre-wrap">{message.content}</p>}
                  {streaming && index === messages.length - 1 && message.role === 'assistant' ? (
                    <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-white/60 align-middle" aria-label="Streaming" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-white/10 px-4 py-5 text-[11px] leading-5 text-white/42">
              Ask for a tagline, a positioning note, or a signature move. Voice it or type it — the strategist streams its answer back.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Markdown({ content, accent }: { content: string; accent?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h3 className="my-2 text-base font-semibold first:mt-0">{children}</h3>,
        h2: ({ children }) => <h3 className="my-2 text-sm font-semibold first:mt-0">{children}</h3>,
        h3: ({ children }) => <h3 className="my-2 text-sm font-semibold first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="leading-6">{children}</li>,
        code: ({ children, className }) =>
          className ? (
            <code className="block overflow-x-auto rounded-lg bg-black/30 p-2 text-xs">{children}</code>
          ) : (
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs">{children}</code>
          ),
        strong: ({ children }) => <strong className="font-semibold" style={accent ? { color: accent } : undefined}>{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function fallbackTreatmentReply(taste: BrandTaste): string {
  const t = deriveTreatment(taste)
  return [
    `## ${t.name}`,
    ``,
    `Signature tagline: **${t.tagline}**`,
    ``,
    `Lead with ${t.era.toLowerCase()} energy and a ${t.texture.toLowerCase()} finish. Set in ${t.displayName.toLowerCase()}, the wordmark bets on discipline.`,
    ``,
    `Three moves:`,
    `1. One hero mood — ${t.keywords.slice(0, 3).join(', ')}.`,
    `2. A restrained palette built around ${t.accent}.`,
    `3. Motion that follows a single language: ${t.motion}`,
  ].join('\n')
}
