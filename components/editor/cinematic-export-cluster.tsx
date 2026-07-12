'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Check, ChevronDown, Download, Link2, Plus, Sparkles } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { cn } from '@/lib/utils'

interface CinematicExportClusterProps {
  className?: string
  onExport: () => void
  isExporting?: boolean
  isCompleted?: boolean
  onDownload?: () => void
  isDownloading?: boolean
  debugDefaultOpen?: boolean
}

interface PlatformOption {
  id: string
  name: string
  shortLabel: string
  subtitle: string
  publishLabel: string
  accent: string
  accentSoft: string
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    shortLabel: 'YT',
    subtitle: 'Long-form drops and Shorts handoff',
    publishLabel: 'Queue master',
    accent: '#ff5a70',
    accentSoft: 'rgba(255, 90, 112, 0.22)',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortLabel: 'IG',
    subtitle: 'Reels launch with cover-safe framing',
    publishLabel: 'Send reel',
    accent: '#ff8c63',
    accentSoft: 'rgba(255, 140, 99, 0.22)',
  },
  {
    id: 'x',
    name: 'X / Twitter',
    shortLabel: 'X',
    subtitle: 'Teaser cuts and thread uploads',
    publishLabel: 'Post teaser',
    accent: '#79b8ff',
    accentSoft: 'rgba(121, 184, 255, 0.22)',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    shortLabel: 'TT',
    subtitle: 'Vertical publish with audio pacing',
    publishLabel: 'Drop vertical',
    accent: '#69f0d1',
    accentSoft: 'rgba(105, 240, 209, 0.2)',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    shortLabel: 'IN',
    subtitle: 'Professional clips and metadata',
    publishLabel: 'Share cut',
    accent: '#7f9bff',
    accentSoft: 'rgba(127, 155, 255, 0.2)',
  },
]

const GRAND_CRU_STYLE = {
  fontFamily: 'var(--font-grand-cru), "New York", serif',
} satisfies React.CSSProperties

const BELLAVOIR_STYLE = {
  fontFamily: 'var(--font-bellavoir-serif), "New York", serif',
} satisfies React.CSSProperties

function PlatformLogo({ platformId, className }: { platformId: string; className?: string }) {
  switch (platformId) {
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <rect x="3.5" y="6.5" width="17" height="11" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9.4 15.6 12 10 14.6V9.4Z" fill="currentColor" />
        </svg>
      )
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="4.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16.5" cy="7.5" r="1" fill="currentColor" />
        </svg>
      )
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path d="M6 5h3.3l4.2 5.5L18 5h1.8l-5.3 6.7 5.6 7.3h-3.3l-4.5-5.9L7.6 19H5.8l5.5-6.9L6 5Z" fill="currentColor" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <path
            d="M13.7 5.2c1.1 1.8 2.4 2.8 4.1 3.1v2.4c-1.6-.1-2.9-.7-4.1-1.8v4.9a4.5 4.5 0 1 1-4.5-4.5c.4 0 .9.1 1.3.2V12a2.3 2.3 0 1 0 1 1.8V5.2h2.2Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
          <circle cx="7.2" cy="7.4" r="1.2" fill="currentColor" />
          <path d="M6 10.2v7.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 17.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 12.8c.7-1.4 1.8-2.1 3.3-2.1 2.1 0 3.4 1.4 3.4 3.8v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

export function CinematicExportCluster({
  className,
  onExport,
  isExporting,
  isCompleted,
  onDownload,
  isDownloading,
  debugDefaultOpen = false
}: CinematicExportClusterProps) {
  const prefersReducedMotion = useStableReducedMotion()
  const disableDebugMotion = debugDefaultOpen
  const closeTimerRef = React.useRef<number | null>(null)
  const spotlightTimerRef = React.useRef<number | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const trayRef = React.useRef<HTMLDivElement>(null)
  const platformCardRefs = React.useRef<Record<string, HTMLElement | null>>({})

  const [isOpen, setIsOpen] = React.useState(debugDefaultOpen)
  const [trayPosition, setTrayPosition] = React.useState<{ top: number; right: number } | null>(null)
  const connectedPlatforms = React.useMemo<Record<string, boolean>>(
    () => Object.fromEntries(PLATFORM_OPTIONS.map((platform) => [platform.id, false])),
    [],
  )
  const [statusMessage, setStatusMessage] = React.useState('Connect provider accounts in Settings before direct social publishing.')
  const [activePlatformId, setActivePlatformId] = React.useState<string | null>(null)
  const [spotlightPlatformId, setSpotlightPlatformId] = React.useState<string | null>(null)

  const linkedCount = React.useMemo(
    () => Object.values(connectedPlatforms).filter(Boolean).length,
    [connectedPlatforms],
  )
  const activePlatform = React.useMemo(
    () =>
      PLATFORM_OPTIONS.find(
        (platform) => platform.id === spotlightPlatformId || platform.id === activePlatformId,
      ) ?? null,
    [activePlatformId, spotlightPlatformId],
  )
  const connectionSummary =
    linkedCount === 0 ? 'Provider setup required.' : linkedCount === 1 ? '1 destination live.' : `${linkedCount} destinations live.`
  const trayActivePlatform = activePlatform ?? PLATFORM_OPTIONS[0]!

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const openTray = React.useCallback(() => {
    clearCloseTimer()
    setIsOpen(true)
  }, [clearCloseTimer])

  const describePlatformState = React.useCallback(
    (platform: PlatformOption) =>
      `${platform.name} requires provider authorization before Prometheus can publish there.`,
    [],
  )

  const focusPlatform = React.useCallback(
    (platform: PlatformOption) => {
      openTray()
      setActivePlatformId(platform.id)
      setStatusMessage(describePlatformState(platform))
    },
    [describePlatformState, openTray],
  )

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false)
      setActivePlatformId(null)
    }, 350)
  }, [clearCloseTimer])

  const updateTrayPosition = React.useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTrayPosition({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      })
    }
  }, [])

  React.useEffect(() => {
    return () => {
      clearCloseTimer()
      if (spotlightTimerRef.current !== null) {
        window.clearTimeout(spotlightTimerRef.current)
      }
    }
  }, [clearCloseTimer])

  React.useLayoutEffect(() => {
    if (isOpen) {
      updateTrayPosition()
      window.addEventListener('resize', updateTrayPosition)
      window.addEventListener('scroll', updateTrayPosition, true)
      return () => {
        window.removeEventListener('resize', updateTrayPosition)
        window.removeEventListener('scroll', updateTrayPosition, true)
      }
    }
  }, [isOpen, updateTrayPosition])

  const triggerSpotlight = React.useCallback((platformId: string) => {
    if (spotlightTimerRef.current !== null) {
      window.clearTimeout(spotlightTimerRef.current)
    }

    setSpotlightPlatformId(platformId)
    spotlightTimerRef.current = window.setTimeout(() => {
      setSpotlightPlatformId((current) => (current === platformId ? null : current))
      spotlightTimerRef.current = null
    }, 1400)
  }, [])

  const openPlatformSetup = React.useCallback((platform: PlatformOption) => {
    setStatusMessage(`Opening setup for ${platform.name}. Complete OAuth in Social Accounts to enable publishing.`)
    window.open(`/settings/social-accounts?connect=${encodeURIComponent(platform.id)}`, '_blank', 'noopener,noreferrer')
  }, [])

  const handleBlurCapture = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && (event.currentTarget.contains(nextTarget) || trayRef.current?.contains(nextTarget))) return
    scheduleClose()
  }, [scheduleClose])

  const scrollToPlatformCard = React.useCallback(
    (platform: PlatformOption) => {
      setIsOpen(true)
      focusPlatform(platform)
      triggerSpotlight(platform.id)

      const card = platformCardRefs.current[platform.id]
      if (!card) return

      window.requestAnimationFrame(() => {
        card.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      })
    },
    [focusPlatform, prefersReducedMotion, triggerSpotlight],
  )

  const handlePlatformCardKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, platform: PlatformOption) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      scrollToPlatformCard(platform)
    },
    [scrollToPlatformCard],
  )

  return (
    <div
      ref={containerRef}
      data-font-probe="export-root"
      className={cn('relative inline-flex items-center shrink-0 overflow-visible', className)}
      onMouseLeave={scheduleClose}
      onMouseEnter={openTray}
      onBlurCapture={handleBlurCapture}
    >
      {/* THE TRIGGER CLUSTER - LIQUID GLASS STYLE */}
      <motion.div
        layout
        className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] p-1 backdrop-blur-3xl shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.06)]"
      >
        {isCompleted ? (
          <motion.button
            layout
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className={cn(
              "group relative flex h-10 items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 pl-4 pr-3 text-sm font-bold text-emerald-400 shadow-xl backdrop-blur-md transition-all",
              isDownloading ? "opacity-70 cursor-not-allowed" : "hover:bg-emerald-500/20"
            )}
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              {isDownloading ? (
                <InlineLoadingAnimation size={14} label="Preparing export download" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span style={GRAND_CRU_STYLE}>{isDownloading ? "Preparing..." : "Download"}</span>
            </div>
          </motion.button>
        ) : (
          <motion.button
            layout
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            onFocus={openTray}
            disabled={isExporting}
            className={cn(
              "group relative flex h-10 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] pl-4 pr-3 text-sm font-bold text-white shadow-xl backdrop-blur-md transition-all",
              isOpen ? "border-white/30 bg-white/15" : "hover:bg-white/10 hover:border-white/20",
              isExporting && "opacity-70 cursor-not-allowed"
            )}
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2">
              {isExporting ? (
                <InlineLoadingAnimation size={14} label="Queuing export" />
              ) : (
                <Sparkles className="size-3.5 opacity-70" />
              )}
              <span style={GRAND_CRU_STYLE}>{isExporting ? "Queuing..." : "Export"}</span>
            </div>
            {!isExporting && (
              <ChevronDown className={cn("size-3.5 opacity-40 transition-transform duration-500", isOpen && "rotate-180")} />
            )}

            {/* LIQUID HIGHLIGHT SHIMMER */}
            <motion.div
              aria-hidden
              className="absolute -inset-px rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              animate={isOpen ? { opacity: 1 } : {}}
            />
          </motion.button>
        )}

      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && trayPosition ? (
            <motion.div
              key="export-social-map"
              ref={trayRef}
              initial={disableDebugMotion ? false : { opacity: 0, y: 10, scale: 0.96, filter: 'blur(14px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 8, scale: 0.97, filter: 'blur(12px)' }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{
                top: trayPosition.top,
                right: trayPosition.right,
              }}
              className="fixed z-[9999] w-[min(28rem,calc(100vw-1rem))] overflow-visible"
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
            >
              <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(145deg,rgba(13,14,19,0.96)_0%,rgba(6,7,10,0.98)_100%)] p-3 shadow-[0_34px_80px_-36px_rgba(0,0,0,0.96),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-2xl">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-28"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(255,255,255,0.26) 0.75px, rgba(255,255,255,0) 1px)',
                    backgroundSize: '18px 18px',
                    maskImage: 'radial-gradient(circle at 50% 42%, black 0%, transparent 78%)',
                  }}
                />
                <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(127,242,212,0.58)_48%,rgba(255,255,255,0)_100%)]" />

                <div className="relative flex items-start justify-between gap-4 px-2 pb-2 pt-1">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#7ff2d4]/16 bg-[#7ff2d4]/[0.055] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#cafff3]/68">
                      <Sparkles className="size-3" />
                      Release Map
                    </div>
                    <div className="mt-2 text-[1.35rem] leading-none text-white" style={GRAND_CRU_STYLE}>
                      Social setup
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.035] px-3 py-2 text-right">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/34">Ready</div>
                    <div className="mt-0.5 text-lg text-white/90" style={GRAND_CRU_STYLE}>
                      {linkedCount}/5
                    </div>
                  </div>
                </div>

                <div className="relative mt-1 h-[13.25rem] overflow-hidden rounded-[22px] border border-white/8 bg-black/26">
                  <svg viewBox="0 0 420 210" className="pointer-events-none absolute inset-0 h-full w-full" fill="none" aria-hidden>
                    <defs>
                      <linearGradient id="export-node-line" x1="0" x2="1">
                        <stop offset="0%" stopColor="rgba(127,242,212,0.08)" />
                        <stop offset="52%" stopColor="rgba(255,255,255,0.42)" />
                        <stop offset="100%" stopColor="rgba(127,242,212,0.06)" />
                      </linearGradient>
                    </defs>
                    {PLATFORM_OPTIONS.map((platform, index) => {
                      const angle = (-68 + index * 34) * (Math.PI / 180)
                      const x = 210 + Math.cos(angle) * 146
                      const y = 106 + Math.sin(angle) * 72
                      const isActive = platform.id === trayActivePlatform.id
                      return (
                        <motion.path
                          key={platform.id}
                          d={`M 210 106 C ${210 + Math.cos(angle) * 58} ${106 + Math.sin(angle) * 28}, ${x - Math.cos(angle) * 42} ${y - Math.sin(angle) * 20}, ${x} ${y}`}
                          stroke={isActive ? platform.accent : 'url(#export-node-line)'}
                          strokeWidth={isActive ? 1.4 : 0.9}
                          strokeDasharray="5 10"
                          animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -60], opacity: isActive ? [0.54, 0.96, 0.54] : [0.22, 0.48, 0.22] }}
                          transition={prefersReducedMotion ? undefined : { duration: isActive ? 2.2 : 4, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                        />
                      )
                    })}
                  </svg>

                  <button
                    type="button"
                    onClick={onExport}
                    disabled={isExporting}
                    className="absolute left-1/2 top-1/2 grid size-[4.6rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[24px] border border-white/14 bg-[linear-gradient(145deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.04)_48%,rgba(255,255,255,0.02)_100%)] text-white shadow-[0_24px_48px_-28px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16)] transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isExporting ? (
                      <InlineLoadingAnimation size={20} label="Queuing export" />
                    ) : (
                      <ArrowUpRight className="size-5" />
                    )}
                  </button>

                  {PLATFORM_OPTIONS.map((platform, index) => {
                    const angle = (-68 + index * 34) * (Math.PI / 180)
                    const x = Math.cos(angle) * 146
                    const y = Math.sin(angle) * 72
                    const connected = connectedPlatforms[platform.id]
                    const isActive = platform.id === trayActivePlatform.id
                    return (
                      <motion.button
                        key={platform.id}
                        type="button"
                        ref={(node) => { platformCardRefs.current[platform.id] = node }}
                        aria-label={`${platform.name} destination`}
                        onMouseEnter={() => focusPlatform(platform)}
                        onFocus={() => focusPlatform(platform)}
                        onClick={() => openPlatformSetup(platform)}
                        className={cn(
                          'absolute grid size-12 place-items-center rounded-[18px] border bg-[#090a0f]/88 text-white shadow-[0_18px_34px_-24px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-[border-color,background-color,transform]',
                          connected ? 'border-emerald-300/34' : isActive ? 'border-white/26 bg-white/[0.08]' : 'border-white/10 hover:border-white/20',
                        )}
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                          translate: '-50% -50%',
                        }}
                        whileHover={prefersReducedMotion ? undefined : { y: -2, scale: 1.06 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                      >
                        <PlatformLogo platformId={platform.id} className="size-5" />
                        <span
                          aria-hidden
                          className="absolute -right-0.5 -top-0.5 size-3 rounded-full border border-black/70"
                          style={{ background: connected ? '#34d399' : platform.accent }}
                        />
                      </motion.button>
                    )
                  })}
                </div>

                <div className="relative mt-3 rounded-[20px] border border-white/8 bg-white/[0.035] p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-[15px] border border-white/10 bg-black/40 text-white"
                      style={{ boxShadow: `0 0 26px -16px ${trayActivePlatform.accent}` }}
                    >
                      <PlatformLogo platformId={trayActivePlatform.id} className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white/90">{trayActivePlatform.name}</div>
                      <div className="mt-0.5 truncate text-[12px] text-white/44" style={BELLAVOIR_STYLE}>
                        {statusMessage || connectionSummary}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPlatformSetup(trayActivePlatform)}
                      className={cn(
                        'h-9 rounded-full border px-3 text-[12px] font-semibold transition-colors',
                        connectedPlatforms[trayActivePlatform.id]
                          ? 'border-emerald-300/22 bg-emerald-300/10 text-emerald-200'
                          : 'border-white/10 bg-white/[0.04] text-white/70 hover:text-white',
                      )}
                    >
                      <Link2 className="mr-1 inline size-3" />
                      Setup
                    </button>
                    <button
                      type="button"
                      disabled={!connectedPlatforms[trayActivePlatform.id]}
                      className="grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white text-black transition-colors hover:bg-white/90 disabled:border-white/6 disabled:bg-white/[0.04] disabled:text-white/22"
                      aria-label={`${trayActivePlatform.name} publishing requires account setup`}
                    >
                      <ArrowUpRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}

    </div>
  )
}

export function FloatingPreferenceButton({
  active,
  saved,
  onToggle,
  className,
}: {
  active: { id: string; title: string; accent: string }
  saved: boolean
  onToggle: () => void
  className?: string
}) {
  const reduceMotion = useStableReducedMotion()

  return (
    <motion.div
      className={cn('pointer-events-auto group relative', className)}
      initial={reduceMotion ? undefined : { opacity: 0, x: 12, scale: 0.92 }}
      animate={reduceMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.72, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border text-white backdrop-blur-xl transition-all duration-300 hover:-translate-x-1',
          saved
            ? 'border-[#ff8a78]/40 bg-black/60 shadow-[0_18px_40px_-20px_rgba(255,106,85,0.4)]'
            : 'border-white/14 bg-black/40 hover:border-white/24'
        )}
      >
        {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </motion.div>
  )
}

export function HoverTiltMediaCard({
  item,
  active,
  layoutId,
  imageSizes,
  className,
  title,
  subtitle,
  meta,
  reduceMotion,
}: {
  item: { image: string; imagePosition?: string; title: string; accent: string; badge: string }
  active: boolean
  layoutId: string
  imageSizes: string
  className?: string
  title: string
  subtitle?: string
  meta?: string
  reduceMotion: boolean
}) {
  return (
    <motion.div
      layoutId={layoutId}
      className={cn('relative h-full w-full', className)}
      whileHover={reduceMotion ? undefined : { y: -6, scale: 1.02 }}
    >
      <div className={cn(
        'group relative overflow-hidden rounded-[20px] border bg-[#090a0f] transition-all duration-500',
        active ? 'border-white/30 shadow-2xl' : 'border-white/10 shadow-lg'
      )}>
        <motion.img
          src={item.image}
          alt={item.title}
          sizes={imageSizes}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: item.imagePosition ?? 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">{subtitle}</div>
          <div className="mt-1 font-semibold text-white" style={GRAND_CRU_STYLE}>{title}</div>
          {meta && <div className="mt-1 text-[10px] text-white/30">{meta}</div>}
        </div>
      </div>
    </motion.div>
  )
}
