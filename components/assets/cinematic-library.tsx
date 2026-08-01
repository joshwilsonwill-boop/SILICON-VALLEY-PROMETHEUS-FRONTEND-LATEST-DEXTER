'use client'

import * as React from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import {
  Bookmark,
  Check,
  CircleUserRound,
  Clapperboard,
  Disc3,
  Film,
  Play,
  Plus,
  Search,
  Shield,
  Star,
  Type,
  UploadCloud,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { BackButton } from '@/components/navigation/BackButton'
import { AnimatedTooltip } from '@/components/ui/animated-tooltip'
import { Button } from '@/components/ui/button'
import { getMusicShowcaseSeeds } from '@/lib/music-catalog'
import { cn } from '@/lib/utils'
import type { AssetItem, AssetKind } from '@/lib/types'

export type LibraryTab = 'uploads' | 'music' | 'broll' | 'fonts' | 'logos'

export type ShowcaseItem = {
  id: string
  title: string
  subtitle: string
  description: string
  year: string
  runtime: string
  genre: string
  badge: string
  rating: number
  image: string
  imagePosition?: string
  video?: string
  accent: string
  metaLine: string
  isLocal: boolean
  parentId?: string
}

const FOUNDER_STRIP = [
  { id: 1, name: 'Alex Hormozi', designation: 'Offer Architect', image: '/library/people/hormozi.png' },
  { id: 2, name: 'Leila Hormozi', designation: 'Scale Operator', image: '/library/people/leila-hormozi.png' },
  { id: 3, name: 'Codie Sanchez', designation: 'Cash Strategist', image: '/library/people/codie-sanchez.png' },
  { id: 4, name: 'Dean Graziosi', designation: 'Mindset Builder', image: '/library/people/dean-graziosi.png' },
  { id: 5, name: 'Dan Martell', designation: 'SaaS Mentor', image: '/library/people/dan-martell.png' },
  { id: 6, name: 'Iman Gadzhi', designation: 'Agency Strategist', image: '/library/people/iman-gadzhi.png' },
  { id: 7, name: 'Ray Dalio', designation: 'Macro Thinker', image: '/library/people/ray-dalio.png' },
] as const

export const LIBRARY_CREATOR_CARDS = FOUNDER_STRIP

export type SavedCharacterPreference = {
  id: string
  title: string
  subtitle: string
  image: string
  imagePosition?: string
  accent: string
  tab: LibraryTab
  addedAt: string
}

export const CHARACTER_PREFERENCES_KEY = 'prometheus.character-preferences.v1'

export function CinematicLibrary({
  tab,
  onTabChange,
  assets,
  filteredAssets,
  onUploadClick,
  savedCharacterIds,
  onTogglePreference,
  onActiveItemChange,
  initialShowcaseId,
}: {
  tab: LibraryTab
  onTabChange: (tab: LibraryTab) => void
  assets: AssetItem[]
  filteredAssets: AssetItem[]
  onUploadClick: () => void
  savedCharacterIds: string[]
  onTogglePreference: (item: ShowcaseItem, tab: LibraryTab) => void
  onActiveItemChange?: (item: ShowcaseItem | null) => void
  initialShowcaseId?: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  const showcaseItems = React.useMemo(() => buildShowcaseItems(tab, filteredAssets), [filteredAssets, tab])
  const assetCounts = React.useMemo(() => countAssetsByTab(assets), [assets])
  const [activeId, setActiveId] = React.useState<string | null>(() =>
    initialShowcaseId && showcaseItems.some((item) => item.id === initialShowcaseId)
      ? initialShowcaseId
      : showcaseItems[0]?.id ?? null,
  )

  React.useEffect(() => {
    setActiveId(
      initialShowcaseId && showcaseItems.some((item) => item.id === initialShowcaseId)
        ? initialShowcaseId
        : showcaseItems[0]?.id ?? null,
    )
  }, [initialShowcaseId, showcaseItems, tab])
  const active = showcaseItems.find((item) => item.id === activeId) ?? showcaseItems[0]
  const config = TAB_CONFIG[tab]
  const posterItems = React.useMemo(
    () => buildLibraryStackItems(tab, active, showcaseItems),
    [active, showcaseItems, tab],
  )
  const founderActiveId = React.useMemo(() => {
    const match = FOUNDER_STRIP.find((founder) => founder.name === active.title)
    return match?.id ?? null
  }, [active.title])
  const isActiveSaved = savedCharacterIds.includes(active.id)
  const stackTitle = tab === 'uploads' ? `${active.title} showcase` : `${config.label} showcase`
  const reveal = (delay = 0, y = 24) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y, filter: 'blur(12px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
        }

  React.useEffect(() => {
    onActiveItemChange?.(active ?? null)
  }, [active, onActiveItemChange])

  if (!active) return null

  return (
    <div className="relative min-h-full overflow-hidden px-3 py-3 md:px-5 md:py-5">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0d0d12_0%,#0a0a0f_32%,#07070b_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(184,60,43,0.14),transparent_26%),radial-gradient(circle_at_82%_14%,rgba(101,40,33,0.18),transparent_20%),radial-gradient(circle_at_50%_88%,rgba(255,102,73,0.08),transparent_32%)]" />
      <div className="relative mx-auto max-w-[1380px]">
        <LayoutGroup id="library-cinema">
          <section className="overflow-hidden rounded-[12px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,15,20,0.9)_0%,rgba(8,8,12,0.96)_100%)] p-3 shadow-[0_42px_100px_-54px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-4 lg:p-5">
            <div className="min-w-0 border border-white/8 bg-[#06070b] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]">
              <div className="relative min-h-[640px] overflow-hidden border-b border-white/10">
                <AnimatePresence mode="sync">
                  <motion.div
                    key={`hero-media-${active.id}`}
                    className="absolute inset-0"
                    initial={reduceMotion ? undefined : { opacity: 0 }}
                    animate={reduceMotion ? undefined : { opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.92,
                            ease: [0.22, 1, 0.36, 1] as const,
                          }
                    }
                  >
                    <motion.div
                      className="absolute inset-0 scale-[1.12] bg-cover bg-center opacity-40 blur-[68px] saturate-[1.12] will-change-transform"
                      style={{
                        backgroundImage: `url(${active.image})`,
                        backgroundPosition: active.imagePosition ?? '62% 32%',
                      }}
                      initial={reduceMotion ? undefined : { opacity: 0.18, scale: 1.18 }}
                      animate={reduceMotion ? undefined : { opacity: 0.42, scale: 1.1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 1.04 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 1.12,
                              ease: [0.22, 1, 0.36, 1] as const,
                            }
                      }
                    />
                    <motion.div
                      className="absolute inset-0 will-change-transform"
                      initial={reduceMotion ? undefined : { opacity: 0.08, scale: 1.045, y: 10 }}
                      animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: 1.015, y: -4 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 1.08,
                              ease: [0.22, 1, 0.36, 1] as const,
                            }
                      }
                    >
                      <motion.div
                        layoutId={`library-card-${active.id}`}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 26, mass: 0.9 }}
                        className="absolute inset-0"
                      >
                        <img
                          src={active.image}
                          alt={active.title}
                          className="h-full w-full object-cover [transform:translateZ(0)] will-change-transform"
                          style={{ objectPosition: active.imagePosition ?? '62% 32%' }}
                        />
                      </motion.div>
                    </motion.div>
                    <motion.div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.14)_28%,rgba(0,0,0,0.52)_68%,rgba(0,0,0,0.92)_100%),linear-gradient(90deg,rgba(6,7,11,0.96)_0%,rgba(6,7,11,0.54)_22%,rgba(6,7,11,0.18)_44%,rgba(6,7,11,0.26)_63%,rgba(6,7,11,0.76)_82%,rgba(6,7,11,0.96)_100%),linear-gradient(180deg,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.02)_20%,rgba(0,0,0,0.84)_100%)',
                      }}
                      initial={reduceMotion ? undefined : { opacity: 0.94, scale: 1.035 }}
                      animate={reduceMotion ? undefined : { opacity: 0.7, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0.88 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 1.26,
                              ease: [0.22, 1, 0.36, 1] as const,
                            }
                      }
                    />
                    <motion.div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle_at_48%_32%,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.03)_16%,transparent_30%),radial-gradient(circle_at_22%_42%,rgba(255,255,255,0.06)_0%,transparent_30%)',
                      }}
                      initial={reduceMotion ? undefined : { opacity: 0.65, scale: 1.08 }}
                      animate={reduceMotion ? undefined : { opacity: 0, scale: 1.02 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 1.18,
                              ease: [0.22, 1, 0.36, 1] as const,
                            }
                      }
                    />
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence mode="sync">
                  <motion.div
                    key={`hero-accent-${active.id}`}
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle_at_50%_28%, ${active.accent}1f 0%, transparent 26%), radial-gradient(circle_at_16%_74%, rgba(255,78,61,0.16) 0%, transparent 28%)`,
                    }}
                    initial={reduceMotion ? undefined : { opacity: 0, scale: 1.08 }}
                    animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 1.02 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 1,
                            ease: [0.22, 1, 0.36, 1] as const,
                          }
                    }
                  />
                </AnimatePresence>
                <div className="relative z-10 flex min-h-[640px] flex-col p-5 sm:p-7 lg:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <motion.div className="flex min-w-0 items-start gap-3" {...reveal(0.06, 18)}>
                      <BackButton className="border border-white/12 bg-black/20" />
                      <div className="min-w-0 space-y-4 pt-1">
                        <div className="text-[11px] uppercase tracking-[0.34em] text-white/42">Prometheus Library</div>
                        <motion.div {...reveal(0.12, 18)}>
                          <AnimatedTooltip
                            items={FOUNDER_STRIP.map((item) => ({ ...item }))}
                            activeId={tab === 'uploads' ? founderActiveId : null}
                            onItemClick={(item) => {
                              const match = showcaseItems.find((entry) => entry.title === item.name)
                              if (match) setActiveId(match.id)
                            }}
                            className="pt-1"
                          />
                        </motion.div>
                        <motion.div className="flex flex-wrap gap-2" {...reveal(0.18, 18)}>
                          {TAB_ORDER.map((entry) => {
                            const entryConfig = TAB_CONFIG[entry]
                            const isActive = tab === entry
                            return (
                              <motion.button
                                key={entry}
                                type="button"
                                onClick={() => onTabChange(entry)}
                                className={cn(
                                  'border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors',
                                  isActive
                                    ? 'border-[#ff6a55]/34 bg-[#161920] text-white shadow-[0_18px_34px_-28px_rgba(255,106,85,0.36)]'
                                    : 'border-white/12 bg-black/18 text-white/62 hover:border-white/22 hover:text-white',
                                )}
                                {...reveal(0.22 + entryConfig.label.length * 0.005, 16)}
                              >
                                {entryConfig.label} <span className="ml-2 text-white/45">{String(assetCounts[entry]).padStart(2, '0')}</span>
                              </motion.button>
                            )
                          })}
                        </motion.div>
                      </div>
                    </motion.div>

                    <motion.div className="flex items-center gap-2" {...reveal(0.16, 18)}>
                      <Button type="button" onClick={onUploadClick} className="h-10 rounded-md border border-[#ff6a55]/24 bg-[#12151c] px-4 text-white hover:bg-[#171b24]">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                      <button type="button" className="grid h-10 w-10 place-items-center border border-white/12 bg-black/20 text-white/78 transition-colors hover:bg-white/[0.12] hover:text-white" aria-label="Search library">
                        <Search className="h-4 w-4" />
                      </button>
                      <button type="button" className="grid h-10 w-10 place-items-center border border-white/12 bg-black/20 text-white/78 transition-colors hover:bg-white/[0.12] hover:text-white" aria-label="User profile">
                        <CircleUserRound className="h-4 w-4" />
                      </button>
                    </motion.div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`hero-copy-${active.id}`}
                      className="mt-auto max-w-[620px] pt-24 sm:pt-32"
                      initial={reduceMotion ? undefined : { opacity: 0, y: 26, filter: 'blur(14px)' }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -10, filter: 'blur(12px)' }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              duration: 0.72,
                              ease: [0.16, 1, 0.3, 1] as const,
                            }
                      }
                    >
                      <motion.div className="flex flex-wrap items-center gap-3 text-xs text-white/56" {...reveal(0.08, 14)}>
                        <span>{active.year}</span>
                        <span className="h-1 w-1 rounded-full bg-white/22" />
                        <span>{active.genre}</span>
                        <span className="border border-white/14 bg-black/16 px-3 py-1 uppercase tracking-[0.24em] text-white/68">{config.eyebrow}</span>
                      </motion.div>

                      <motion.div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/58" {...reveal(0.14, 16)}>
                        <span className="inline-flex items-center gap-2 border border-white/12 bg-black/18 px-3 py-1.5">
                          <Star className="h-3.5 w-3.5 fill-current text-[#ff5f57]" />
                          {active.rating.toFixed(1)} / 10
                        </span>
                        <span>{active.runtime}</span>
                      </motion.div>

                      <motion.h2 className="mt-6 max-w-[520px] text-[clamp(3.6rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.06em] text-white" style={{ fontFamily: '"Arial Black", "Helvetica Neue", sans-serif' }} {...reveal(0.2, 18)}>
                        {active.title}
                      </motion.h2>
                      <motion.div className="mt-4 max-w-[360px] text-sm uppercase tracking-[0.28em] text-white/58" {...reveal(0.26, 16)}>
                        {active.subtitle}
                      </motion.div>
                      <motion.p className="mt-6 max-w-[560px] text-[15px] leading-8 text-white/72" {...reveal(0.32, 18)}>
                        {active.description}
                      </motion.p>

                      <motion.div className="mt-8 flex flex-wrap items-center gap-3" {...reveal(0.38, 18)}>
                        <Button className="h-12 rounded-md bg-[#ff4d3f] px-6 text-white shadow-[0_22px_40px_-28px_rgba(255,77,63,0.84)] hover:bg-[#ff6256]">
                          <Play className="mr-2 h-4 w-4 fill-current" />
                          Watch Hero
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-pressed={isActiveSaved}
                          onClick={() => onTogglePreference(active, tab)}
                          className={cn(
                            'h-12 rounded-md border px-6 text-white',
                            isActiveSaved
                              ? 'border-[#ff6a55]/30 bg-[#131820] hover:bg-[#171d27]'
                              : 'border-white/12 bg-black/18 hover:bg-white/[0.08]',
                          )}
                        >
                          {isActiveSaved ? <Check className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                          {isActiveSaved ? 'In Preferences' : 'Save Spirit'}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <motion.div className="border-t border-white/8 bg-[#06070b] px-4 py-5 sm:px-6 sm:py-6" {...reveal(0.28, 22)}>
                <motion.div className="flex flex-wrap items-center justify-between gap-3" {...reveal(0.34, 18)}>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/38">Library stack</div>
                    <div className="mt-2 text-lg text-white">{stackTitle}</div>
                  </div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/38">Hover to inspect, click to focus</div>
                </motion.div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  {posterItems.map((item, index) => (
                    <motion.div key={item.id} {...reveal(0.42 + index * 0.08, 26)}>
                      <button
                        type="button"
                        onClick={() => setActiveId(item.parentId ?? item.id)}
                        className="group text-left"
                      >
                        <HoverTiltMediaCard
                          item={item}
                          active={item.id === active.id}
                          layoutId={`library-card-${item.id}`}
                          imageSizes="(max-width: 1279px) 50vw, 220px"
                          title={item.title}
                          subtitle={item.subtitle}
                          meta={item.runtime}
                          compact={false}
                          reduceMotion={reduceMotion}
                        />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        </LayoutGroup>
      </div>
    </div>
  )
}

export function FloatingPreferenceButton({
  active,
  saved,
  onToggle,
  className,
}: {
  active: ShowcaseItem
  saved: boolean
  onToggle: () => void
  className?: string
}) {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <motion.div
      className={cn('pointer-events-auto group relative', className)}
      initial={reduceMotion ? undefined : { opacity: 0, x: 12, scale: 0.92 }}
      animate={reduceMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.72,
              delay: 0.22,
              ease: [0.22, 1, 0.36, 1] as const,
            }
      }
    >
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${active.title} from preference vault` : `Add ${active.title} to preference vault`}
        title={saved ? `${active.title} saved for training` : `Add ${active.title} to preferences`}
        onClick={onToggle}
        className={cn(
          'group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border text-white backdrop-blur-xl transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-x-1',
          saved
            ? 'border-[#ff8a78]/40 bg-[rgba(24,20,24,0.9)] shadow-[0_18px_40px_-20px_rgba(255,106,85,0.42)]'
            : 'border-white/14 bg-[rgba(12,12,16,0.8)] shadow-[0_18px_40px_-22px_rgba(0,0,0,0.72)] hover:border-white/24',
        )}
      >
        <span className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(115deg,rgba(255,255,255,0.03),rgba(255,255,255,0.14),rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))] bg-[length:200%_100%] opacity-60 animate-[library-shimmer_3s_linear_infinite]" />
        <span
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full',
            saved
              ? 'bg-[radial-gradient(circle_at_30%_30%,rgba(255,106,85,0.22),transparent_42%)]'
              : 'bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_44%)]',
          )}
        />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
        <span className="pointer-events-none absolute -left-2 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-[#ff6a55]/18 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
      </button>

      <div className="pointer-events-none absolute right-16 top-1/2 w-56 -translate-y-1/2 translate-x-3 scale-[0.98] rounded-[18px] border border-white/10 bg-[linear-gradient(165deg,rgba(9,9,12,0.94)_0%,rgba(18,17,25,0.92)_100%)] px-3.5 py-3 text-left shadow-[0_20px_45px_-24px_rgba(0,0,0,0.86)] backdrop-blur-xl opacity-0 transition-[opacity,transform] duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100">
        <div className="text-[9px] uppercase tracking-[0.26em] text-white/42">
          {saved ? 'Preference Linked' : 'Train In This Spirit'}
        </div>
        <div className="mt-1.5 text-sm font-semibold text-white">
          {saved ? `${active.title} saved` : `Add ${active.title}`}
        </div>
        <div className="mt-1.5 text-[11px] leading-4 text-white/62">
          {saved
            ? 'This character is already in the user preference vault for future callbacks.'
            : 'Save this character as a reusable style reference for future model generations.'}
        </div>
        <div className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-r border-t border-white/10 bg-[#13131a]" />
      </div>
    </motion.div>
  )
}

function HoverTiltMediaCard({
  item,
  active,
  layoutId,
  imageSizes,
  className,
  title,
  subtitle,
  meta,
  compact = false,
  reduceMotion,
}: {
  item: ShowcaseItem
  active: boolean
  layoutId: string
  imageSizes: string
  className?: string
  title: string
  subtitle?: string
  meta?: string
  compact?: boolean
  reduceMotion: boolean
}) {
  return (
    <motion.div
      layoutId={layoutId}
      className={cn('relative h-full w-full', className)}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24 }}
      whileHover={reduceMotion ? undefined : { y: -6, scale: 1.015 }}
    >
      <div
        className={cn(
          'group relative h-full w-full min-h-[280px] overflow-hidden rounded-[10px] border bg-[#090a0f]',
          active
            ? 'border-white/20 shadow-[0_26px_50px_-30px_rgba(255,93,78,0.38)]'
            : 'border-white/10 shadow-[0_24px_44px_-32px_rgba(0,0,0,0.82)]',
          compact && 'min-h-[240px]',
        )}
      >
        <motion.img
          src={item.image}
          alt={item.title}
          sizes={imageSizes}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectPosition: item.imagePosition ?? 'center' }}
          animate={reduceMotion ? undefined : { scale: 1 }}
          whileHover={reduceMotion ? undefined : { scale: 1.06 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0.12)_28%,rgba(0,0,0,0.9)_100%)]" />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle_at_22%_12%, ${item.accent}44 0%, transparent 26%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.72) 100%)`,
          }}
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="rounded-full border border-white/12 bg-black/28 px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] text-white/62 backdrop-blur-md">
            {item.badge}
          </div>
          {active ? (
            <div className="rounded-full border border-[#ff6a55]/24 bg-[#141820]/84 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-white/68">
              Focused
            </div>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="truncate text-[10px] uppercase tracking-[0.22em] text-white/52">{subtitle}</div>
          <div className="mt-2 line-clamp-2 text-[1.05rem] font-semibold leading-tight text-white">{title}</div>
          {meta ? <div className="mt-2 truncate text-xs text-white/54">{meta}</div> : null}
        </div>
      </div>
    </motion.div>
  )
}

const TAB_ORDER: LibraryTab[] = ['uploads', 'music', 'broll', 'fonts', 'logos']
const HORMOZI_HERO_IMAGE = '/library/hormozi-hero.png'

const ART_POOL = [
  '/style-previews/dark-cinematic-1.jpg',
  '/style-previews/docs-story-1.jpg',
  '/style-previews/reels-heat-1.webp',
  '/style-previews/reels-heat-2.webp',
  '/style-previews/podcast-1.jpg',
  '/style-previews/iman-1.jpg',
  '/style-previews/iman-2.jpg',
  '/style-previews/red-statue-1.jpg',
]

type FounderArchiveProfile = {
  badge: string
  shots: Array<{
    title: string
    subtitle: string
    runtime: string
    genre: string
    imagePosition?: string
  }>
}

const FOUNDER_ARCHIVE_PROFILES: Record<string, FounderArchiveProfile> = {
  'Alex Hormozi': {
    badge: 'Alex archive',
    shots: [
      { title: 'Offer Breakdowns', subtitle: 'Pricing clinic', runtime: '12 selects', genre: 'Business Strategy', imagePosition: '62% 24%' },
      { title: 'Gym Monologues', subtitle: 'Discipline cuts', runtime: '09 selects', genre: 'Mindset', imagePosition: '54% 26%' },
      { title: 'Acquisition Notes', subtitle: 'Growth excerpts', runtime: '08 selects', genre: 'Scaling', imagePosition: '56% 28%' },
      { title: 'Stage Keynotes', subtitle: 'High-energy moments', runtime: '11 selects', genre: 'Speaking', imagePosition: '58% 22%' },
      { title: 'Operator Advice', subtitle: 'Founder coaching', runtime: '10 selects', genre: 'Operations', imagePosition: '60% 24%' },
      { title: 'Direct Response Vault', subtitle: 'Conversion-driven clips', runtime: '07 selects', genre: 'Marketing', imagePosition: '64% 26%' },
    ],
  },
  'Leila Hormozi': {
    badge: 'Leila archive',
    shots: [
      { title: 'Executive Systems', subtitle: 'Operator notes', runtime: '09 selects', genre: 'Operations', imagePosition: '50% 18%' },
      { title: 'Team Structure', subtitle: 'Scale excerpts', runtime: '08 selects', genre: 'Leadership', imagePosition: '48% 18%' },
      { title: 'Boardroom Answers', subtitle: 'Precision moments', runtime: '10 selects', genre: 'Strategy', imagePosition: '52% 20%' },
      { title: 'Hiring Signals', subtitle: 'Talent clips', runtime: '07 selects', genre: 'People Ops', imagePosition: '50% 22%' },
      { title: 'Execution Sprints', subtitle: 'Tactical sequences', runtime: '11 selects', genre: 'Execution', imagePosition: '54% 18%' },
      { title: 'Scale Discipline', subtitle: 'Operator archive', runtime: '06 selects', genre: 'Growth', imagePosition: '50% 16%' },
    ],
  },
  'Codie Sanchez': {
    badge: 'Codie archive',
    shots: [
      { title: 'Acquisition Angles', subtitle: 'Deal room cuts', runtime: '10 selects', genre: 'Finance', imagePosition: '50% 20%' },
      { title: 'Cashflow Cases', subtitle: 'Ownership stories', runtime: '08 selects', genre: 'Business', imagePosition: '48% 18%' },
      { title: 'Contrarian Notes', subtitle: 'Sharp opinion reels', runtime: '07 selects', genre: 'Commentary', imagePosition: '52% 16%' },
      { title: 'Buyer Briefings', subtitle: 'Micro-private-equity', runtime: '11 selects', genre: 'Investing', imagePosition: '50% 22%' },
      { title: 'Operator Wealth', subtitle: 'Asset insights', runtime: '06 selects', genre: 'Wealth', imagePosition: '54% 18%' },
      { title: 'Ownership Thesis', subtitle: 'Portfolio moments', runtime: '09 selects', genre: 'Strategy', imagePosition: '50% 18%' },
    ],
  },
  'Dean Graziosi': {
    badge: 'Dean archive',
    shots: [
      { title: 'Mindset Drives', subtitle: 'Motivation vault', runtime: '12 selects', genre: 'Mindset', imagePosition: '50% 20%' },
      { title: 'Stage Persuasion', subtitle: 'Audience moments', runtime: '09 selects', genre: 'Speaking', imagePosition: '50% 18%' },
      { title: 'Life Reframes', subtitle: 'Perspective clips', runtime: '07 selects', genre: 'Coaching', imagePosition: '52% 20%' },
      { title: 'Energy Peaks', subtitle: 'High-emotion sequences', runtime: '10 selects', genre: 'Motivation', imagePosition: '48% 18%' },
      { title: 'Teaching Cadence', subtitle: 'Longform sections', runtime: '08 selects', genre: 'Education', imagePosition: '50% 22%' },
      { title: 'Launch Confidence', subtitle: 'Belief-building cuts', runtime: '06 selects', genre: 'Sales', imagePosition: '54% 18%' },
    ],
  },
  'Dan Martell': {
    badge: 'Dan archive',
    shots: [
      { title: 'SaaS Mentoring', subtitle: 'Growth coaching', runtime: '10 selects', genre: 'SaaS', imagePosition: '50% 20%' },
      { title: 'Founder Playbooks', subtitle: 'Execution notes', runtime: '08 selects', genre: 'Scaling', imagePosition: '52% 18%' },
      { title: 'Systems To Exit', subtitle: 'Freedom-focused clips', runtime: '07 selects', genre: 'Operations', imagePosition: '50% 16%' },
      { title: 'Boardroom Focus', subtitle: 'Tactical answers', runtime: '11 selects', genre: 'Leadership', imagePosition: '48% 20%' },
      { title: 'Efficiency Stack', subtitle: 'Operator breakdowns', runtime: '09 selects', genre: 'Productivity', imagePosition: '50% 18%' },
      { title: 'Capital Growth', subtitle: 'Scale architecture', runtime: '06 selects', genre: 'Business', imagePosition: '54% 18%' },
    ],
  },
  'Iman Gadzhi': {
    badge: 'Iman archive',
    shots: [
      { title: 'Luxury Authority', subtitle: 'Premium framing', runtime: '09 selects', genre: 'Brand', imagePosition: '50% 20%' },
      { title: 'Agency Signals', subtitle: 'Operator clips', runtime: '10 selects', genre: 'Agency', imagePosition: '50% 18%' },
      { title: 'Direct-To-Camera', subtitle: 'Close authority', runtime: '08 selects', genre: 'Speaking', imagePosition: '52% 18%' },
      { title: 'High-Taste Motion', subtitle: 'Visual identity moments', runtime: '07 selects', genre: 'Aesthetic', imagePosition: '48% 16%' },
      { title: 'Client Growth', subtitle: 'Business segments', runtime: '11 selects', genre: 'Marketing', imagePosition: '50% 20%' },
      { title: 'Founder Luxury', subtitle: 'Lifestyle archive', runtime: '06 selects', genre: 'Lifestyle', imagePosition: '54% 18%' },
    ],
  },
  'Ray Dalio': {
    badge: 'Ray archive',
    shots: [
      { title: 'Principles Ledger', subtitle: 'Foundational clips', runtime: '12 selects', genre: 'Principles', imagePosition: '50% 16%' },
      { title: 'Macro Outlooks', subtitle: 'Market essays', runtime: '09 selects', genre: 'Macro', imagePosition: '52% 16%' },
      { title: 'Economic Cycles', subtitle: 'Bridgewater moments', runtime: '08 selects', genre: 'Investing', imagePosition: '48% 16%' },
      { title: 'Calm Conviction', subtitle: 'Longform thinking', runtime: '07 selects', genre: 'Commentary', imagePosition: '50% 14%' },
      { title: 'Risk Frameworks', subtitle: 'Decision heuristics', runtime: '10 selects', genre: 'Strategy', imagePosition: '54% 16%' },
      { title: 'Wealth Architecture', subtitle: 'Portfolio notes', runtime: '06 selects', genre: 'Finance', imagePosition: '50% 18%' },
    ],
  },
}

const TAB_CONFIG: Record<
  LibraryTab,
  {
    label: string
    accent: string
    eyebrow: string
    prompt: string
    supporting: string
    metricLabel: string
    icon: LucideIcon
    seeds: Array<{
      title: string
      subtitle: string
      description: string
      year: string
      runtime: string
      genre: string
      badge: string
      image?: string
      imagePosition?: string
    }>
  }
> = {
  uploads: {
    label: 'Movies',
    accent: '#ff4d3f',
    eyebrow: 'Featured founder archive',
    prompt: 'Founder-led hero reels and premium selects',
    supporting: 'A sharper on-demand library frame with a single dominant hero and clean poster browsing.',
    metricLabel: 'Live archive',
    icon: Clapperboard,
    seeds: [
      {
        title: 'Alex Hormozi',
        subtitle: 'Founder archive',
        description: 'Cinematic portraits, premium interview selects, and founder-led moments staged like a flagship release.',
        year: '2026',
        runtime: '2.03h',
        genre: 'Business, Strategy',
        badge: 'Featured',
        image: HORMOZI_HERO_IMAGE,
        imagePosition: '62% 32%',
      },
      {
        title: 'Leila Hormozi',
        subtitle: 'Operator archive',
        description: 'Boardroom-ready founder footage framed around execution, scale, and sharper operating insight.',
        year: '2026',
        runtime: '1.46h',
        genre: 'Operations, Growth',
        badge: 'Featured',
        image: '/library/people/leila-hormozi.png',
        imagePosition: '50% 16%',
      },
      {
        title: 'Codie Sanchez',
        subtitle: 'Acquisition archive',
        description: 'Cashflow-first founder selections tuned for ownership stories, deal breakdowns, and bold cuts.',
        year: '2026',
        runtime: '1.18h',
        genre: 'Business, Finance',
        badge: 'Featured',
        image: '/library/people/codie-sanchez.png',
        imagePosition: '50% 18%',
      },
      {
        title: 'Dean Graziosi',
        subtitle: 'Mindset archive',
        description: 'Face-led closeups and premium talk moments staged for motivational, longform, and launch edits.',
        year: '2026',
        runtime: '1.32h',
        genre: 'Mindset, Education',
        badge: 'Featured',
        image: '/library/people/dean-graziosi.png',
        imagePosition: '50% 18%',
      },
      {
        title: 'Dan Martell',
        subtitle: 'SaaS archive',
        description: 'Founder-led software storytelling with cleaner posture, sharper light, and premium teaching frames.',
        year: '2026',
        runtime: '1.24h',
        genre: 'SaaS, Scaling',
        badge: 'Featured',
        image: '/library/people/dan-martell.png',
        imagePosition: '50% 18%',
      },
      {
        title: 'Iman Gadzhi',
        subtitle: 'Agency archive',
        description: 'Luxury-lit founder visuals with direct-to-camera energy built for premium agency storytelling.',
        year: '2026',
        runtime: '1.09h',
        genre: 'Agency, Marketing',
        badge: 'Featured',
        image: '/library/people/iman-gadzhi.png',
        imagePosition: '50% 18%',
      },
      {
        title: 'Ray Dalio',
        subtitle: 'Macro archive',
        description: 'High-trust portrait moments for finance-heavy stories, principle breakdowns, and market essays.',
        year: '2026',
        runtime: '1.41h',
        genre: 'Macro, Investing',
        badge: 'Featured',
        image: '/library/people/ray-dalio.png',
        imagePosition: '50% 16%',
      },
    ],
  },
  music: {
    label: 'Music',
    accent: '#ff8b4f',
    eyebrow: 'Cue stacks',
    prompt: 'Score stems and rhythm beds ready to drop in',
    supporting: 'Music becomes its own display wall here, with every cue treated like a featured release instead of a buried folder.',
    metricLabel: 'Signal cues',
    icon: Disc3,
    seeds: getMusicShowcaseSeeds(),
  },
  broll: {
    label: 'B-roll',
    accent: '#f2c35b',
    eyebrow: 'Scene layers',
    prompt: 'Atmosphere, texture, and cinematic inserts',
    supporting: 'The B-roll shelf leans into mood and space, helping visual inserts feel collectible and easy to scan.',
    metricLabel: 'Texture rack',
    icon: Film,
    seeds: [
      {
        title: 'Field Notes',
        subtitle: 'Wide inserts',
        description: 'Environmental shots curated for polished editor timelines.',
        year: '2026',
        runtime: '17 clips',
        genre: 'Documentary',
        badge: 'B-roll',
      },
      {
        title: 'Quiet Rooms',
        subtitle: 'Interior pack',
        description: 'Soft natural light and restrained motion for premium atmosphere.',
        year: '2025',
        runtime: '08 clips',
        genre: 'Lifestyle',
        badge: 'B-roll',
      },
      {
        title: 'Metro Echo',
        subtitle: 'City texture',
        description: 'Dense urban inserts with strong rhythm and depth.',
        year: '2026',
        runtime: '13 clips',
        genre: 'Urban',
        badge: 'B-roll',
      },
      {
        title: 'Runway Smoke',
        subtitle: 'Luxury motion',
        description: 'High-fashion movement and abstract details for upscale cuts.',
        year: '2026',
        runtime: '05 clips',
        genre: 'Fashion',
        badge: 'B-roll',
      },
      {
        title: 'Close Orbit',
        subtitle: 'Macro reel',
        description: 'Product and tactile inserts with a premium cinematic edge.',
        year: '2025',
        runtime: '10 clips',
        genre: 'Macro',
        badge: 'B-roll',
      },
      {
        title: 'Dawn Layer',
        subtitle: 'Landscape reel',
        description: 'Openers and transitions that give edits breathing room.',
        year: '2026',
        runtime: '11 clips',
        genre: 'Travel',
        badge: 'B-roll',
      },
    ],
  },
  fonts: {
    label: 'Fonts',
    accent: '#8bb7ff',
    eyebrow: 'Type kits',
    prompt: 'Title systems, credit styles, and trailer locks',
    supporting: 'Font packs are staged like featured collections so type choices feel editorial and intentional instead of purely technical.',
    metricLabel: 'Typeface deck',
    icon: Type,
    seeds: [
      {
        title: 'Monarch',
        subtitle: 'Editorial serif',
        description: 'Cinematic title family built for prestige intros and hero cards.',
        year: '2026',
        runtime: '14 weights',
        genre: 'Serif',
        badge: 'Fonts',
      },
      {
        title: 'Current Mono',
        subtitle: 'Utility system',
        description: 'Structured monospaced kit for dashboards and motion labels.',
        year: '2025',
        runtime: '08 styles',
        genre: 'Mono',
        badge: 'Fonts',
      },
      {
        title: 'After Noir',
        subtitle: 'Trailer lockup',
        description: 'High-contrast display family for bold reveal moments.',
        year: '2026',
        runtime: '06 styles',
        genre: 'Display',
        badge: 'Fonts',
      },
      {
        title: 'Signal Serif',
        subtitle: 'Founder kit',
        description: 'Refined modern serif tuned for clean premium storytelling.',
        year: '2025',
        runtime: '10 weights',
        genre: 'Serif',
        badge: 'Fonts',
      },
      {
        title: 'Arc Label',
        subtitle: 'Caps system',
        description: 'Compact uppercase family for rails, badges, and metadata.',
        year: '2026',
        runtime: '09 styles',
        genre: 'Display',
        badge: 'Fonts',
      },
      {
        title: 'Slate Text',
        subtitle: 'Longform companion',
        description: 'Readable workhorse companion for scripts and subtitles.',
        year: '2026',
        runtime: '12 weights',
        genre: 'Text',
        badge: 'Fonts',
      },
    ],
  },
  logos: {
    label: 'Logos',
    accent: '#7fc37e',
    eyebrow: 'Brand marks',
    prompt: 'Marks, lockups, and polished brand assets',
    supporting: 'Logo kits sit inside the same cinematic architecture so brand materials feel elevated enough for client review.',
    metricLabel: 'Brand vault',
    icon: Shield,
    seeds: [
      {
        title: 'Northline',
        subtitle: 'Primary lockup',
        description: 'Refined logo presentation with room for system marks and alternates.',
        year: '2026',
        runtime: '09 marks',
        genre: 'Identity',
        badge: 'Logos',
      },
      {
        title: 'Orbit Seal',
        subtitle: 'Badge family',
        description: 'Roundels and stamps built for products, social cards, and covers.',
        year: '2025',
        runtime: '07 marks',
        genre: 'Badge',
        badge: 'Logos',
      },
      {
        title: 'Signal Crest',
        subtitle: 'Premium mark',
        description: 'Hero emblem treatment with stronger contrast and depth.',
        year: '2026',
        runtime: '05 marks',
        genre: 'Luxury',
        badge: 'Logos',
      },
      {
        title: 'Dusk Icon',
        subtitle: 'Compact icon',
        description: 'Small-format symbol work ready for UI, apps, and motion cards.',
        year: '2025',
        runtime: '11 assets',
        genre: 'Icon',
        badge: 'Logos',
      },
      {
        title: 'Studio Grid',
        subtitle: 'System pack',
        description: 'Flexible lockups for different placements and screen ratios.',
        year: '2026',
        runtime: '13 marks',
        genre: 'System',
        badge: 'Logos',
      },
      {
        title: 'Anchor Mark',
        subtitle: 'Wordmark set',
        description: 'Balanced wordmark family for campaign, site, and social use.',
        year: '2026',
        runtime: '08 variants',
        genre: 'Wordmark',
        badge: 'Logos',
      },
    ],
  },
}

function buildLibraryStackItems(tab: LibraryTab, active: ShowcaseItem, showcaseItems: ShowcaseItem[]) {
  if (tab !== 'uploads') {
    return [active, ...showcaseItems.filter((item) => item.id !== active.id)].slice(0, 6)
  }

  const profile = FOUNDER_ARCHIVE_PROFILES[active.title]
  if (!profile) {
    return [active, ...showcaseItems.filter((item) => item.id !== active.id)].slice(0, 6)
  }

  return profile.shots.map((shot, index) => ({
    id: `${active.id}_archive_${index}`,
    parentId: active.id,
    title: shot.title,
    subtitle: shot.subtitle,
    description: `${active.title} archive clip tuned for ${shot.genre.toLowerCase()} storytelling and callback-ready prompts.`,
    year: active.year,
    runtime: shot.runtime,
    genre: shot.genre,
    badge: profile.badge,
    rating: Math.max(7.8, active.rating - 0.35 + index * 0.06),
    image: active.image,
    imagePosition: shot.imagePosition ?? active.imagePosition,
    accent: active.accent,
    metaLine: `${profile.badge} | ${shot.subtitle}`,
    isLocal: false,
  }))
}

function buildShowcaseItems(tab: LibraryTab, filteredAssets: AssetItem[]): ShowcaseItem[] {
  const config = TAB_CONFIG[tab]

  const localItems = filteredAssets.map((asset) => {
    const hash = hashValue(asset.name)

    return {
      id: asset.id,
      title: formatTitle(asset.name),
      subtitle: 'Local import',
      description:
        asset.tags?.join(', ') ||
        `${formatTitle(asset.name)} is staged inside the ${config.label.toLowerCase()} library and ready for focus mode.`,
      year: String(new Date(asset.createdAt).getFullYear() || 2026),
      runtime: runtimeLabelForAsset(tab, asset),
      genre: config.label,
      badge: 'Local file',
      rating: 8 + ((hash % 10) / 10),
      image: asset.url && isRenderableAssetUrl(asset.url) ? asset.url : ART_POOL[hash % ART_POOL.length],
      imagePosition: 'center',
      accent: [config.accent, '#c4547b', '#6a57c9', '#9b7eff', '#d9a56e'][hash % 5],
      metaLine: `${formatBytes(asset.sizeBytes)} | Added ${formatDate(asset.createdAt)}`,
      isLocal: true,
    } satisfies ShowcaseItem
  })

  const curatedItems = config.seeds.map((seed, index) => ({
    id: `${tab}_${index}`,
    title: seed.title,
    subtitle: seed.subtitle,
    description: seed.description,
    year: seed.year,
    runtime: seed.runtime,
    genre: seed.genre,
    badge: seed.badge,
    rating: tab === 'uploads' && index === 0 ? 9.1 : 7.6 + ((index % 4) * 0.4),
    image:
      seed.image ??
      (tab === 'uploads' && index === 0
        ? HORMOZI_HERO_IMAGE
        : ART_POOL[(index + hashValue(seed.title) + hashValue(config.label)) % ART_POOL.length]),
    imagePosition: seed.imagePosition,
    accent: [config.accent, '#c4547b', '#6a57c9', '#9b7eff', '#d9a56e'][index % 5],
    metaLine: `${seed.subtitle} | Curated shelf`,
    isLocal: false,
  }))

  return [...curatedItems, ...localItems].slice(0, 8)
}

function countAssetsByTab(assets: AssetItem[]) {
  const counts: Record<LibraryTab, number> = {
    uploads: 0,
    music: 0,
    broll: 0,
    fonts: 0,
    logos: 0,
  }

  for (const asset of assets) {
    counts[tabFromKind(asset.kind)] += 1
  }

  return counts
}

function tabFromKind(kind: AssetKind): LibraryTab {
  if (kind === 'upload') return 'uploads'
  if (kind === 'music') return 'music'
  if (kind === 'broll') return 'broll'
  if (kind === 'font') return 'fonts'
  return 'logos'
}

function runtimeLabelForAsset(tab: LibraryTab, asset: AssetItem) {
  if (tab === 'uploads' || tab === 'broll') return formatBytes(asset.sizeBytes)
  if (tab === 'music') return asset.tags?.[0] || 'Audio file'
  if (tab === 'fonts') return asset.tags?.[0] || 'Typeface'
  return asset.tags?.[0] || 'Brand asset'
}

function isRenderableAssetUrl(url: string) {
  return url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/') || /^https?:\/\//.test(url)
}

function formatTitle(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}

function formatBytes(sizeBytes?: number) {
  if (!sizeBytes) return 'Local file'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = sizeBytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value?: string) {
  if (!value) return 'Just now'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function hashValue(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}
