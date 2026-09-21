'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  Globe,
  Layers,
  Layout,
  Palette,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Type,
  Video,
  Zap,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'
import { saveJarvisMemory } from '@/lib/voice-companion/memory'

export interface ExtractedBrandDna {
  id: string
  url: string
  brandName: string
  industry: string
  tagline: string
  valueProposition: string
  targetAudience: string
  logoText: string
  primaryColors: {
    surface: string
    primary: string
    accent: string
    text: string
    muted: string
    border: string
  }
  fonts: {
    display: string
    body: string
    mono: string
  }
  kineticStyle: {
    curveName: string
    pacing: 'rapid_dynamic' | 'cinematic_deliberate' | 'balanced'
    captionStyle: string
  }
  toneOfVoice: string[]
  personality: {
    visionary: number // 0-100 (Visionary vs Pragmatic)
    polish: number // 0-100 (Raw/Industrial vs High-End Luxury)
    intensity: number // 0-100 (Kinetic Tension vs Calm Clarity)
  }
  keyMessages: {
    title: string
    body: string
  }[]
  aiPhotoPreset: string
}

export const BRAND_DNA_STORAGE_KEY = 'prometheus.brand-dna.v1'

export const PRESET_BRANDS: Record<string, ExtractedBrandDna> = {
  linear: {
    id: 'linear',
    url: 'https://linear.app',
    brandName: 'Linear',
    industry: 'High-Craft Developer Infrastructure',
    tagline: 'The issue tracking tool you will actually enjoy using.',
    valueProposition: 'Engineered for high-performing product teams with keyboard-first speed and obsessive UI precision.',
    targetAudience: 'Product engineers, visionary founders, and design-led builders.',
    logoText: 'LINEAR',
    primaryColors: {
      surface: '#08090C',
      primary: '#5E6AD2',
      accent: '#55FF9B',
      text: '#F8F7FF',
      muted: '#71758B',
      border: '#1E202E',
    },
    fonts: {
      display: 'Geist Sans Display',
      body: 'Inter Display',
      mono: 'JetBrains Mono',
    },
    kineticStyle: {
      curveName: 'Snappy Kinetic [cubic-bezier(0.32, 0.72, 0, 1)]',
      pacing: 'cinematic_deliberate',
      captionStyle: 'minimal_split_reveal',
    },
    toneOfVoice: ['Authoritative', 'Minimalist', 'Direct', 'High-Craft', 'Obsessive', 'Visionary'],
    personality: {
      visionary: 92,
      polish: 95,
      intensity: 84,
    },
    keyMessages: [
      {
        title: 'Speed as a Feature',
        body: 'Zero-latency interaction loops designed for flow state.',
      },
      {
        title: 'Ruthless Polish',
        body: 'Every single micro-pixel is calibrated with physics-backed easing.',
      },
      {
        title: 'Purpose-Built Depth',
        body: 'Engineered for operators who demand tools that respect their time.',
      },
    ],
    aiPhotoPreset: 'Dark Techy Void',
  },
  a24: {
    id: 'a24',
    url: 'https://a24films.com',
    brandName: 'A24 Films',
    industry: 'Cinematic Cinema & Independent Culture',
    tagline: 'Independent direction for restless minds.',
    valueProposition: 'Championing auteur storytelling with uncompromising artistic vision and cultural resonance.',
    targetAudience: 'Cinemaphiles, radical storytellers, and cultural architects.',
    logoText: 'A24',
    primaryColors: {
      surface: '#0A0A0A',
      primary: '#FF2A2A',
      accent: '#FFDC58',
      text: '#FAF9F5',
      muted: '#8E8B85',
      border: '#2A2927',
    },
    fonts: {
      display: 'PP Editorial New',
      body: 'Suisse Int’l',
      mono: 'Courier Prime',
    },
    kineticStyle: {
      curveName: 'Organic Visceral [cubic-bezier(0.19, 1, 0.22, 1)]',
      pacing: 'cinematic_deliberate',
      captionStyle: 'editorial_typewriter',
    },
    toneOfVoice: ['Cinematic', 'Provocative', 'Raw', 'Uncompromising', 'Auteur', 'Atmospheric'],
    personality: {
      visionary: 96,
      polish: 78,
      intensity: 95,
    },
    keyMessages: [
      {
        title: 'Auteur Integrity',
        body: 'Artistic freedom without commercial dilution.',
      },
      {
        title: 'Atmospheric Tension',
        body: 'Creating indelible emotional frequency that lingers long after.',
      },
      {
        title: 'Radical Originality',
        body: 'Rejecting formulaic tropes to build lasting cultural artifacts.',
      },
    ],
    aiPhotoPreset: 'Warm Golden Hour Film',
  },
  acquired: {
    id: 'acquired',
    url: 'https://acquired.fm',
    brandName: 'Acquired Podcast',
    industry: 'Business History & Epic Intellectual Strategy',
    tagline: 'The playbooks behind the greatest companies of all time.',
    valueProposition: 'Exhaustive multi-hour deep dives exploring the compounding flywheels and founding narratives of generational dynasties.',
    targetAudience: 'CEOs, venture investors, operators, and strategic thinkers.',
    logoText: 'ACQUIRED',
    primaryColors: {
      surface: '#0B101B',
      primary: '#D97706',
      accent: '#38BDF8',
      text: '#F1F5F9',
      muted: '#64748B',
      border: '#1E293B',
    },
    fonts: {
      display: 'Clash Display',
      body: 'Plus Jakarta Sans',
      mono: 'IBM Plex Mono',
    },
    kineticStyle: {
      curveName: 'Strategic Weight [cubic-bezier(0.25, 1, 0.5, 1)]',
      pacing: 'balanced',
      captionStyle: 'gold_highlight_karaoke',
    },
    toneOfVoice: ['Deep Analytical', 'Expansive', 'Intellectual', 'Celebratory', 'Strategic', 'Authoritative'],
    personality: {
      visionary: 85,
      polish: 88,
      intensity: 72,
    },
    keyMessages: [
      {
        title: 'The Compounding Flywheel',
        body: 'Every historic monopoly started with a single differentiated insight.',
      },
      {
        title: 'Exhaustive Rigor',
        body: 'Four hours of synthesized research per chapter. No surface-level soundbites.',
      },
      {
        title: 'Playbook Extraction',
        body: 'Distilling timeless structural advantages for modern builders.',
      },
    ],
    aiPhotoPreset: 'Executive Studio Monochrome',
  },
  stripe: {
    id: 'stripe',
    url: 'https://stripe.com',
    brandName: 'Stripe',
    industry: 'Global Economic Infrastructure',
    tagline: 'Financial infrastructure for the internet.',
    valueProposition: 'Millions of companies of all sizes use Stripe software and APIs to accept payments, send payouts, and manage their businesses online.',
    targetAudience: 'Software builders, global enterprises, and scale-up founders.',
    logoText: 'STRIPE',
    primaryColors: {
      surface: '#0A2540',
      primary: '#635BFF',
      accent: '#00D4FF',
      text: '#FFFFFF',
      muted: '#8898AA',
      border: '#1A3B66',
    },
    fonts: {
      display: 'Söhne Breit',
      body: 'Söhne',
      mono: 'Söhne Mono',
    },
    kineticStyle: {
      curveName: 'Luminous Precision [cubic-bezier(0.16, 1, 0.3, 1)]',
      pacing: 'rapid_dynamic',
      captionStyle: 'gradient_glow_wordmark',
    },
    toneOfVoice: ['Precision', 'Optimistic', 'Universal', 'Engineering-First', 'Luminous'],
    personality: {
      visionary: 90,
      polish: 98,
      intensity: 65,
    },
    keyMessages: [
      {
        title: 'Increase the GDP of the Internet',
        body: 'Expanding global economic access through frictionless developer tools.',
      },
      {
        title: 'Five-Nines Reliability',
        body: 'Mission-critical systems running trillions of dollars with continuous uptime.',
      },
      {
        title: 'Unrelenting Craft',
        body: 'From API documentation to payment forms, excellence is in every interaction.',
      },
    ],
    aiPhotoPreset: 'Cyber Neon Glow',
  },
  hermes: {
    id: 'hermes',
    url: 'https://hermes.com',
    brandName: 'Hermès',
    industry: 'Haute Horlogerie & Heritage Luxury Craft',
    tagline: 'Contemporary artisans since 1837.',
    valueProposition: 'Mastering human touch, equestrian leatherwork, and timeless French craftsmanship across centuries of elegance.',
    targetAudience: 'Connoisseurs of timeless luxury and artisanal perfection.',
    logoText: 'HERMÈS',
    primaryColors: {
      surface: '#15110E',
      primary: '#E05A2B',
      accent: '#E6C687',
      text: '#F7F4EB',
      muted: '#8C8276',
      border: '#332922',
    },
    fonts: {
      display: 'Canela Fine',
      body: 'Garamond Premier',
      mono: 'Monaco',
    },
    kineticStyle: {
      curveName: 'Deliberate Grace [cubic-bezier(0.33, 0, 0, 1)]',
      pacing: 'cinematic_deliberate',
      captionStyle: 'golden_serif_whisper',
    },
    toneOfVoice: ['Artisanal', 'Timeless', 'Quiet Luxury', 'Understated', 'Equestrian', 'Heritage'],
    personality: {
      visionary: 70,
      polish: 99,
      intensity: 45,
    },
    keyMessages: [
      {
        title: 'Handmade by a Single Artisan',
        body: 'Each piece carries the signature saddle-stitch of one dedicated master.',
      },
      {
        title: 'Generational Patina',
        body: 'Materials that grow richer, softer, and more storied with every passing decade.',
      },
      {
        title: 'Anti-Trend Eternity',
        body: 'Immune to seasonal fads, dedicated purely to perfection in form.',
      },
    ],
    aiPhotoPreset: 'Sculptural Marble Clean',
  },
}

const PHOTO_PRESETS = [
  'Dark Techy Void',
  'Sculptural Marble Clean',
  'Warm Golden Hour Film',
  'Cyber Neon Glow',
  'Executive Studio Monochrome',
  'Architectural Concrete',
]

const ALL_AVAILABLE_TONES = [
  'Authoritative',
  'Cinematic',
  'Minimalist',
  'Provocative',
  'Direct',
  'Visionary',
  'Intellectual',
  'Raw',
  'Uncompromising',
  'Atmospheric',
  'High-Craft',
  'Quiet Luxury',
  'Precision',
  'Urgent',
  'Empathetic',
]

export function BrandDnaStudio() {
  const reduceMotion = useReducedMotion() ?? false
  const [inputUrl, setInputUrl] = React.useState('')
  const [activeBrand, setActiveBrand] = React.useState<ExtractedBrandDna>(PRESET_BRANDS.linear)
  const [isScanning, setIsScanning] = React.useState(false)
  const [scanStep, setScanStep] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'palette' | 'typography' | 'voice' | 'mockup'>('overview')
  const [activeFormat, setActiveFormat] = React.useState<'9:16' | '1:1' | '16:9' | '4:5'>('9:16')
  const [copiedField, setCopiedField] = React.useState<string | null>(null)
  const [appliedNotification, setAppliedNotification] = React.useState(false)
  const [gridPosition, setGridPosition] = React.useState<'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'>('bc')

  // Hydrate from localStorage if exists
  React.useEffect(() => {
    const saved = readLocalStorageJSON<ExtractedBrandDna>(BRAND_DNA_STORAGE_KEY)
    if (saved && saved.brandName) {
      setActiveBrand(saved)
      setInputUrl(saved.url)
    }
  }, [])

  const copyToClipboard = (text: string, fieldKey: string) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // ignore
    }
  }

  const triggerScanSimulation = (targetDna: ExtractedBrandDna) => {
    setIsScanning(true)
    setScanStep(0)

    const steps = [
      'Scraping DOM hierarchy & visual stylesheets...',
      'Synthesizing primary, secondary & contrast spectral tokens...',
      'Inferring voice vectors, narrative anchors & emotional tone...',
      'Compiling multi-platform video treatments & layout matrix...',
    ]

    let current = 0
    const interval = setInterval(() => {
      current++
      if (current < steps.length) {
        setScanStep(current)
      } else {
        clearInterval(interval)
        setActiveBrand(targetDna)
        setIsScanning(false)
        writeLocalStorageJSON(BRAND_DNA_STORAGE_KEY, targetDna)
      }
    }, 450)
  }

  const handleCustomExtract = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = inputUrl.trim().toLowerCase()
    if (!clean) return

    // Check if matches preset
    for (const key of Object.keys(PRESET_BRANDS)) {
      if (clean.includes(key)) {
        triggerScanSimulation(PRESET_BRANDS[key])
        return
      }
    }

    // Synthesize fresh brand DNA from input URL/Name
    const parsedName = clean
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('.')[0]
    const capitalized = parsedName.charAt(0).toUpperCase() + parsedName.slice(1)

    const syntheticDna: ExtractedBrandDna = {
      id: `brand_${Date.now()}`,
      url: inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`,
      brandName: capitalized,
      industry: 'Bespoke Digital Experience',
      tagline: `Engineered distinction for ${capitalized}.`,
      valueProposition: `Crafting high-leverage digital assets and video treatments calibrated to ${capitalized}'s proprietary visual language.`,
      targetAudience: 'Discerning clients, forward-thinking operators, and visionary innovators.',
      logoText: capitalized.toUpperCase(),
      primaryColors: {
        surface: '#0B0914',
        primary: '#7C3AED',
        accent: '#34D399',
        text: '#F9FAFB',
        muted: '#9CA3AF',
        border: '#28233C',
      },
      fonts: {
        display: 'Clash Display Semibold',
        body: 'Plus Jakarta Sans',
        mono: 'JetBrains Mono',
      },
      kineticStyle: {
        curveName: 'Dynamic Fluid [cubic-bezier(0.2, 0.8, 0.2, 1)]',
        pacing: 'cinematic_deliberate',
        captionStyle: 'gradient_glow_wordmark',
      },
      toneOfVoice: ['Visionary', 'Direct', 'High-Craft', 'Authoritative'],
      personality: {
        visionary: 85,
        polish: 90,
        intensity: 80,
      },
      keyMessages: [
        {
          title: 'Uncompromised Identity',
          body: `A calibrated visual footprint that makes ${capitalized} immediately unmistakable.`,
        },
        {
          title: 'High-Signal Velocity',
          body: 'Executing video treatments with intentional spatial motion and razor-sharp contrast.',
        },
      ],
      aiPhotoPreset: 'Dark Techy Void',
    }

    triggerScanSimulation(syntheticDna)
  }

  const toggleTone = (tone: string) => {
    setActiveBrand((prev) => {
      const exists = prev.toneOfVoice.includes(tone)
      const nextTones = exists ? prev.toneOfVoice.filter((t) => t !== tone) : [...prev.toneOfVoice, tone]
      const updated = { ...prev, toneOfVoice: nextTones }
      writeLocalStorageJSON(BRAND_DNA_STORAGE_KEY, updated)
      return updated
    })
  }

  const updateColor = (key: keyof ExtractedBrandDna['primaryColors'], hex: string) => {
    setActiveBrand((prev) => {
      const updated = {
        ...prev,
        primaryColors: { ...prev.primaryColors, [key]: hex },
      }
      writeLocalStorageJSON(BRAND_DNA_STORAGE_KEY, updated)
      return updated
    })
  }

  const handleApplyToSuite = () => {
    // Persist to brand DNA storage
    writeLocalStorageJSON(BRAND_DNA_STORAGE_KEY, activeBrand)

    // Sync to Jarvis Persistent Memory
    try {
      saveJarvisMemory(
        {
          brandProfile: {
            brandName: activeBrand.brandName,
            tone: activeBrand.toneOfVoice.join(', '),
            preferredCaptionStyle: activeBrand.kineticStyle.captionStyle,
            pacing: activeBrand.kineticStyle.pacing,
            visualGuidelines: `Primary: ${activeBrand.primaryColors.primary}, Accent: ${activeBrand.primaryColors.accent}, Surface: ${activeBrand.primaryColors.surface}, Display Font: ${activeBrand.fonts.display}`,
          },
        },
        'global_creator',
      )
    } catch {
      // ignore
    }

    setAppliedNotification(true)
    setTimeout(() => setAppliedNotification(false), 3500)
  }

  const downloadTokens = () => {
    const payload = JSON.stringify(activeBrand, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeBrand.brandName.toLowerCase()}-brand-dna.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      id="brand-dna-studio"
      aria-labelledby="brand-dna-studio-title"
      className="relative isolate min-h-full snap-start snap-always overflow-y-auto overflow-x-hidden bg-[#07060d] py-10 text-[#f8f7ff] selection:bg-[#55ff9b]/30 selection:text-white"
    >
      {/* Cinematic Ambient Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[25%] left-1/2 h-[50rem] w-[50rem] -translate-x-1/2 rounded-full blur-[140px] opacity-25"
          style={{
            background: `radial-gradient(circle, ${activeBrand.primaryColors.primary} 0%, ${activeBrand.primaryColors.accent} 60%, transparent 80%)`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(85,255,155,0.06),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
        {/* Top Operational Breadcrumb */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-[#55ff9b]">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#55ff9b]">
                  Prometheus / Autonomous DNA Ingestion
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#55ff9b]/30 bg-[#55ff9b]/10 px-2 py-0.5 text-[9px] font-semibold text-[#55ff9b]">
                  <span className="size-1.5 rounded-full bg-[#55ff9b] animate-pulse" />
                  OPEN-POMELLI KERNEL
                </span>
              </div>
              <h1 id="brand-dna-studio-title" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Brand Taste & DNA Studio
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={downloadTokens}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55ff9b]"
            >
              <Download className="size-3.5" />
              Export DNA Tokens (.JSON)
            </button>

            <button
              type="button"
              onClick={handleApplyToSuite}
              className="group inline-flex items-center gap-2.5 rounded-full border border-[#55ff9b]/40 bg-[#55ff9b]/20 px-5 py-2 text-xs font-semibold text-[#55ff9b] shadow-[0_0_25px_rgba(85,255,155,0.25)] transition hover:bg-[#55ff9b]/30 hover:shadow-[0_0_35px_rgba(85,255,155,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55ff9b]"
            >
              <Zap className="size-3.5" />
              <span>Apply To Video Suite</span>
              <span className="grid size-5 place-items-center rounded-full bg-[#55ff9b]/25 transition group-hover:translate-x-0.5">
                <ArrowUpRight className="size-3 text-[#55ff9b]" />
              </span>
            </button>
          </div>
        </header>

        {/* Hero Ingestion Double-Bezel Omnibar */}
        <div className="mt-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-2 ring-1 ring-white/5 backdrop-blur-2xl">
            <div className="rounded-[calc(2rem-0.5rem)] border border-white/10 bg-[#0c0b16]/95 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#55ff9b]">
                    Google Pomelli Extraction Engine
                  </p>
                  <h2 className="mt-1 text-2xl font-medium tracking-tight text-white sm:text-3xl">
                    Extract your brand from any website URL.
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                    Paste your domain or select a curated aesthetic archetype. Playwright & Vision AI extract your color
                    gamut, font scale, narrative voice, and generate on-brand video treatments instantly.
                  </p>
                </div>

                {/* Form Input */}
                <form onSubmit={handleCustomExtract} className="w-full max-w-xl">
                  <div className="relative flex items-center rounded-full border border-white/20 bg-black/60 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)] focus-within:border-[#55ff9b]/60 focus-within:ring-2 focus-within:ring-[#55ff9b]/30">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full text-white/45">
                      <Globe className="size-4" />
                    </div>
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="e.g. https://linear.app, stripe.com, or your domain..."
                      className="w-full min-w-0 bg-transparent px-2 text-sm text-white placeholder-white/35 outline-none font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isScanning}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#55ff9b]/50 bg-[#55ff9b] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#42e887] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>Extracting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5 text-black" />
                          <span>Extract DNA</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Scanning Progress Banner */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 overflow-hidden rounded-xl border border-[#55ff9b]/30 bg-[#55ff9b]/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className="size-4 text-[#55ff9b] animate-spin" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs font-medium text-[#55ff9b]">
                          <span>Scanning website DOM, CSS tokens, and brand assets...</span>
                          <span className="font-mono">Step {scanStep + 1} of 4</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                          <motion.div
                            className="h-full bg-[#55ff9b]"
                            initial={{ width: '15%' }}
                            animate={{ width: `${(scanStep + 1) * 25}%` }}
                            transition={{ duration: 0.35 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preset Archetypes Pills */}
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Curated Archetypes:</span>
                {Object.entries(PRESET_BRANDS).map(([key, brand]) => {
                  const active = activeBrand.id === brand.id
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setInputUrl(brand.url)
                        triggerScanSimulation(brand)
                      }}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition active:scale-[0.97]',
                        active
                          ? 'border-[#55ff9b]/60 bg-[#55ff9b]/15 text-[#55ff9b] shadow-[0_0_15px_rgba(85,255,155,0.2)]'
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white',
                      )}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: brand.primaryColors.primary }}
                      />
                      <span>{brand.brandName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Applied Notification Toast */}
        <AnimatePresence>
          {appliedNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mt-4 flex items-center justify-between rounded-xl border border-[#55ff9b]/40 bg-[#081a0e]/95 p-4 text-[#55ff9b] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-[#55ff9b]/20">
                  <Check className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Brand DNA Applied to Prometheus Engine!
                  </p>
                  <p className="text-xs text-[#55ff9b]/80">
                    Jarvis, video motion styles, and thumbnail generators are now synchronized to{' '}
                    <strong className="text-white">{activeBrand.brandName}</strong>.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/50">
                ACTIVE PROFILE LOCKED
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs for Brand Layers */}
        <div className="mt-8 flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {[
              { id: 'overview', label: '01. Brand Identity', icon: ShieldCheck },
              { id: 'palette', label: '02. Spectral Palette', icon: Palette },
              { id: 'typography', label: '03. Typography Architecture', icon: Type },
              { id: 'voice', label: '04. Voice & Persona Radar', icon: Sparkles },
              { id: 'mockup', label: '05. Creative Video Mockups', icon: Layout },
            ].map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55ff9b]',
                    active
                      ? 'border border-[#55ff9b]/50 bg-[#55ff9b]/15 text-[#55ff9b] shadow-[0_0_20px_rgba(85,255,155,0.15)]'
                      : 'border border-transparent text-white/50 hover:border-white/10 hover:text-white',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="hidden items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 lg:flex">
            <span>Live DNA State:</span>
            <span className="text-[#55ff9b]">{activeBrand.brandName}</span>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="mt-6">
          {/* TAB 1: OVERVIEW & CORE IDENTITY */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Brand Hero Card */}
              <div className="lg:col-span-7">
                <div className="h-full rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5">
                  <div
                    className="flex h-full flex-col justify-between rounded-[calc(2rem-0.375rem)] border border-white/10 p-6 sm:p-8"
                    style={{
                      background: `linear-gradient(135deg, ${activeBrand.primaryColors.surface} 0%, #0d0a1d 100%)`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[10px] font-mono tracking-[0.2em] text-white/70">
                          {activeBrand.url}
                        </span>
                        <span
                          className="size-3 rounded-full shadow-[0_0_15px]"
                          style={{
                            backgroundColor: activeBrand.primaryColors.accent,
                            boxShadow: `0 0 15px ${activeBrand.primaryColors.accent}`,
                          }}
                        />
                      </div>

                      <div className="mt-8">
                        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#55ff9b]">
                          {activeBrand.industry}
                        </div>
                        <h3 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                          {activeBrand.brandName}
                        </h3>
                        <p className="mt-4 text-xl font-light leading-relaxed text-white/85">
                          “{activeBrand.tagline}”
                        </p>
                      </div>

                      <div className="mt-6 rounded-xl border border-white/10 bg-black/35 p-4">
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/45">
                          Value Proposition
                        </span>
                        <p className="mt-1 text-xs leading-relaxed text-white/75">
                          {activeBrand.valueProposition}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-6">
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/45">
                        Target Demographic & Culture
                      </span>
                      <p className="mt-1 text-xs text-white/80 font-medium">
                        {activeBrand.targetAudience}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Narrative Pillars */}
              <div className="flex flex-col gap-4 lg:col-span-5">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5">
                  <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#0c0b16] p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#55ff9b]">
                        Core Narrative Pillars
                      </span>
                      <span className="text-xs text-white/40">3 Anchors</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {activeBrand.keyMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-white/10 bg-black/40 p-3.5 transition hover:border-[#55ff9b]/30"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[#55ff9b]">0{idx + 1}.</span>
                            <h4 className="text-xs font-semibold text-white">{msg.title}</h4>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-white/60">{msg.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Kinetic Specimen */}
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5">
                  <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#0c0b16] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
                        Kinetic Motion Curve
                      </span>
                      <span className="rounded-full bg-[#55ff9b]/15 px-2 py-0.5 text-[9px] font-semibold text-[#55ff9b]">
                        {activeBrand.kineticStyle.pacing}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-white/80">
                      {activeBrand.kineticStyle.curveName}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-white/50">
                      <span>Caption Style:</span>
                      <span className="font-mono text-[#55ff9b]">
                        {activeBrand.kineticStyle.captionStyle}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPECTRAL PALETTE */}
          {activeTab === 'palette' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { key: 'surface', label: 'OLED Void / Surface', hex: activeBrand.primaryColors.surface },
                  { key: 'primary', label: 'Primary Brand Tone', hex: activeBrand.primaryColors.primary },
                  { key: 'accent', label: 'Kinetic Neon Accent', hex: activeBrand.primaryColors.accent },
                  { key: 'text', label: 'Display High-Light Text', hex: activeBrand.primaryColors.text },
                  { key: 'muted', label: 'Muted Secondary Slate', hex: activeBrand.primaryColors.muted },
                  { key: 'border', label: 'Machined Bezel Border', hex: activeBrand.primaryColors.border },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5"
                  >
                    <div className="flex h-full flex-col justify-between rounded-[calc(1.5rem-0.25rem)] border border-white/10 bg-[#0e0d1b] p-4">
                      <div>
                        <div
                          className="h-24 w-full rounded-xl border border-white/15 shadow-inner transition-transform hover:scale-[1.02]"
                          style={{ backgroundColor: item.hex }}
                        />
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                          {item.label}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                        <span className="font-mono text-xs font-bold text-white">{item.hex}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.hex, item.key)}
                          className="grid size-7 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                          title="Copy Hex"
                        >
                          {copiedField === item.key ? (
                            <Check className="size-3 text-[#55ff9b]" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contrast and Gradient Harmonic Strip */}
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5">
                <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#0c0b16] p-6">
                  <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#55ff9b]">
                    Spectral Gradient Harmony & Contrast Verification
                  </h3>
                  <div
                    className="mt-4 h-16 w-full rounded-2xl border border-white/20 shadow-2xl flex items-center justify-between px-6"
                    style={{
                      background: `linear-gradient(90deg, ${activeBrand.primaryColors.surface} 0%, ${activeBrand.primaryColors.primary} 50%, ${activeBrand.primaryColors.accent} 100%)`,
                    }}
                  >
                    <span className="text-sm font-bold text-white drop-shadow-md">
                      {activeBrand.brandName} Dynamic Gradient Matrix
                    </span>
                    <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-mono text-white backdrop-blur-md">
                      16.8:1 Contrast AAA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY ARCHITECTURE */}
          {activeTab === 'typography' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                {
                  role: 'Display Headline',
                  font: activeBrand.fonts.display,
                  size: '48px / 1.1',
                  specimen: 'Relentless Execution.',
                  usage: 'Hero title frames, kinetic split reveals, major thesis anchors.',
                },
                {
                  role: 'Body & Caption Voice',
                  font: activeBrand.fonts.body,
                  size: '16px / 1.5',
                  specimen: 'Every millimeter of this interface is engineered with physical spatial rhythm.',
                  usage: 'Subtitle speech captions, product narratives, descriptive overlays.',
                },
                {
                  role: 'Technical / Monospace Code',
                  font: activeBrand.fonts.mono,
                  size: '12px / 1.2',
                  specimen: 'const DNA = { brand: "Linear", fps: 60, status: "AAA" };',
                  usage: 'Timecodes, FPS indicators, telemetry tickers, technical badges.',
                },
              ].map((typeItem, i) => (
                <div
                  key={i}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5"
                >
                  <div className="flex h-full flex-col justify-between rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#0c0b16] p-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#55ff9b]">
                          {typeItem.role}
                        </span>
                        <span className="text-[10px] font-mono text-white/40">{typeItem.size}</span>
                      </div>
                      <h4 className="mt-2 text-xl font-bold text-white">{typeItem.font}</h4>
                      <div className="my-6 rounded-xl border border-white/10 bg-black/50 p-5">
                        <p
                          className="text-white leading-tight"
                          style={{
                            fontFamily: i === 2 ? 'monospace' : undefined,
                            fontSize: i === 0 ? '1.75rem' : i === 1 ? '1rem' : '0.85rem',
                          }}
                        >
                          {typeItem.specimen}
                        </p>
                      </div>
                    </div>
                    <p className="border-t border-white/10 pt-4 text-xs text-white/55">{typeItem.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: VOICE & PERSONA RADAR */}
          {activeTab === 'voice' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Tone of Voice Chips */}
              <div className="lg:col-span-7">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5">
                  <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#0c0b16] p-6 sm:p-8">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#55ff9b]">
                      Voice & Editorial Tone Spectrum
                    </span>
                    <h3 className="mt-1 text-2xl font-medium text-white">Interactive Brand Adjectives</h3>
                    <p className="mt-1 text-xs text-white/60">
                      Click any tag to toggle its presence in your brand voice algorithm. Jarvis adopts these guidelines
                      during creative cut generation.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {ALL_AVAILABLE_TONES.map((tone) => {
                        const active = activeBrand.toneOfVoice.includes(tone)
                        return (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => toggleTone(tone)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition active:scale-95',
                              active
                                ? 'border border-[#55ff9b] bg-[#55ff9b]/20 text-[#55ff9b] shadow-[0_0_15px_rgba(85,255,155,0.25)]'
                                : 'border border-white/10 bg-white/[0.04] text-white/60 hover:border-white/25 hover:text-white',
                            )}
                          >
                            <span className={cn('size-1.5 rounded-full', active ? 'bg-[#55ff9b]' : 'bg-white/30')} />
                            <span>{tone}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personality Spectrum Sliders */}
              <div className="lg:col-span-5">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-1.5 ring-1 ring-white/5">
                  <div className="rounded-[calc(2rem-0.375rem)] border border-white/10 bg-[#0c0b16] p-6 sm:p-8">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#55ff9b]">
                      Personality Dimensional Index
                    </span>
                    <h3 className="mt-1 text-xl font-medium text-white">Brand Polarization Radar</h3>

                    <div className="mt-6 space-y-6">
                      {[
                        {
                          left: 'Pragmatic Utility',
                          right: 'Visionary Auteur',
                          val: activeBrand.personality.visionary,
                        },
                        {
                          left: 'Raw / Industrial',
                          right: 'High-Polish Luxury',
                          val: activeBrand.personality.polish,
                        },
                        {
                          left: 'Quiet Restraint',
                          right: 'Kinetic Tension',
                          val: activeBrand.personality.intensity,
                        },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
                            <span>{item.left}</span>
                            <span className="font-mono text-[#55ff9b]">{item.val}%</span>
                            <span>{item.right}</span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/60 border border-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#5E6AD2] to-[#55FF9B]"
                              style={{ width: `${item.val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CREATIVE VIDEO MOCKUPS (Open-Pomelli Formats) */}
          {activeTab === 'mockup' && (
            <div className="space-y-6">
              {/* Aspect Ratio Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Format:</span>
                  {[
                    { id: '9:16', label: '9:16 Kinetic Short / Reel', icon: Smartphone },
                    { id: '1:1', label: '1:1 Square Editorial Post', icon: Square },
                    { id: '16:9', label: '16:9 Cinematic Video Banner', icon: Video },
                    { id: '4:5', label: '4:5 Feed Portrait', icon: Layout },
                  ].map((fmt) => {
                    const Icon = fmt.icon
                    const active = activeFormat === fmt.id
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setActiveFormat(fmt.id as any)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                          active
                            ? 'border border-[#55ff9b]/60 bg-[#55ff9b]/20 text-[#55ff9b]'
                            : 'border border-transparent text-white/60 hover:text-white',
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span>{fmt.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* 9-Point Alignment Grid */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                    Text Anchor:
                  </span>
                  <div className="grid grid-cols-3 gap-1 rounded bg-black p-1 border border-white/10">
                    {(['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setGridPosition(pos)}
                        className={cn(
                          'size-4 rounded-sm transition',
                          gridPosition === pos ? 'bg-[#55ff9b]' : 'bg-white/20 hover:bg-white/40',
                        )}
                        title={pos.toUpperCase()}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* The Live Render Canvas Mockup */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    'relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl transition-all duration-500',
                    activeFormat === '9:16' && 'h-[580px] w-[326px]',
                    activeFormat === '1:1' && 'h-[440px] w-[440px]',
                    activeFormat === '16:9' && 'h-[360px] w-[640px]',
                    activeFormat === '4:5' && 'h-[500px] w-[400px]',
                  )}
                  style={{
                    background: `radial-gradient(circle at 50% 20%, ${activeBrand.primaryColors.primary}33 0%, ${activeBrand.primaryColors.surface} 85%)`,
                    backgroundColor: activeBrand.primaryColors.surface,
                  }}
                >
                  {/* Subtle Grid & Grain */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Header Logo Lockup */}
                  <div className="absolute top-6 inset-x-6 flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="font-mono text-xs tracking-[0.25em] text-[#55ff9b] font-bold">
                      {activeBrand.logoText}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-mono text-white/70">
                      {activeBrand.aiPhotoPreset}
                    </span>
                  </div>

                  {/* Content Positioned based on 9-point grid */}
                  <div
                    className={cn(
                      'absolute inset-6 flex flex-col',
                      gridPosition.startsWith('t') && 'justify-start pt-14',
                      gridPosition.startsWith('m') && 'justify-center',
                      gridPosition.startsWith('b') && 'justify-end pb-8',
                      gridPosition.endsWith('l') && 'items-start text-left',
                      gridPosition.endsWith('c') && 'items-center text-center',
                      gridPosition.endsWith('r') && 'items-end text-right',
                    )}
                  >
                    <span className="rounded-full bg-[#55ff9b]/15 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[#55ff9b] border border-[#55ff9b]/30">
                      {activeBrand.industry}
                    </span>
                    <h3
                      className="mt-3 font-bold leading-tight text-white tracking-tight"
                      style={{
                        fontSize: activeFormat === '9:16' ? '1.8rem' : '2.2rem',
                        color: activeBrand.primaryColors.text,
                      }}
                    >
                      {activeBrand.tagline}
                    </h3>
                    <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/70">
                      {activeBrand.valueProposition}
                    </p>

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full px-5 py-2 text-xs font-bold transition shadow-lg"
                        style={{
                          backgroundColor: activeBrand.primaryColors.accent,
                          color: '#000000',
                        }}
                      >
                        Explore Direction
                      </button>
                    </div>
                  </div>

                  {/* Bottom Scanlines and Watermark */}
                  <div className="absolute bottom-3 inset-x-6 flex items-center justify-between text-[9px] font-mono text-white/35">
                    <span>PROMETHEUS V2.4 / POMELLI COMPOSITE</span>
                    <span>1080p 60FPS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Return / Navigation helper */}
        <div className="mt-14 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/50">
          <a
            href="#brand-canvas-title"
            className="inline-flex items-center gap-2 text-white/60 transition hover:text-white"
          >
            <ArrowDown className="size-3.5 rotate-180" />
            <span>Back up to Bold Ideas Canvas</span>
          </a>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#55ff9b]">
            PROMETHEUS BRAND ARCHITECTURE
          </span>
        </div>
      </div>
    </section>
  )
}
