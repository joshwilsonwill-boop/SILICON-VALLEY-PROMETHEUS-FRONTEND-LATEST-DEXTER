'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pause, Plus } from 'lucide-react'

import { MusicCoverBubble } from '@/components/editor/music-cover-bubble'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { buildRevealVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { MusicRecommendation } from '@/lib/types'

export function MusicRecommendationCard({
  recommendation,
  isPreviewing,
  isStaged,
  onPreviewToggle,
  onAdd,
  viewportRoot,
  revealDelay = 0,
}: {
  recommendation: MusicRecommendation
  isPreviewing: boolean
  isStaged: boolean
  onPreviewToggle: (recommendation: MusicRecommendation) => void
  onAdd: (recommendation: MusicRecommendation) => void
  viewportRoot?: React.RefObject<HTMLDivElement | null>
  revealDelay?: number
}) {
  const reduceMotion = useStableReducedMotion()
  const [isHovered, setIsHovered] = React.useState(false)
  const showExpandedPreview = isHovered || isPreviewing
  const producerLabel =
    recommendation.producer.trim() &&
    recommendation.producer.trim().toLowerCase() !== recommendation.artist.trim().toLowerCase()
      ? recommendation.producer.trim()
      : ''
  const revealVariants = React.useMemo(
    () => buildRevealVariants({ delay: revealDelay, distance: 16, scale: 0.985, blur: 10, duration: 0.3 }),
    [revealDelay],
  )
  const tone = getRecommendationTone(recommendation.groupKey)
  const scoreLabel = typeof recommendation.matchScore === 'number' ? `${Math.round(recommendation.matchScore)}% fit` : ''
  const tempoLabel =
    recommendation.tempoWindow?.length === 2
      ? `${recommendation.tempoWindow[0]}-${recommendation.tempoWindow[1]} BPM`
      : `${recommendation.bpm} BPM`

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      exit={reduceMotion ? undefined : 'exit'}
      viewport={reduceMotion ? undefined : { root: viewportRoot, once: false, amount: 0.35 }}
      variants={reduceMotion ? undefined : revealVariants}
      className={cn(
        'group relative w-full overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(12,12,16,0.98)_0%,rgba(8,8,12,0.96)_100%)] p-3 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.88)]',
        tone.border,
        isPreviewing && tone.previewBorder,
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => onPreviewToggle(recommendation)}
          aria-label={
            isPreviewing ? `Pause preview for ${recommendation.title}` : `Play preview for ${recommendation.title}`
          }
          whileHover={reduceMotion ? undefined : { y: -1, scale: 1.01 }}
          whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          className={cn(
            'flex h-14 min-w-0 flex-1 items-center overflow-hidden rounded-full bg-black px-3 text-left transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            isPreviewing ? tone.previewShadow : 'shadow-[0_10px_24px_-18px_rgba(0,0,0,0.9)]',
          )}
        >
          <motion.div
            className="relative shrink-0"
            animate={isPreviewing ? { scale: 1.03 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <MusicCoverBubble
              src={recommendation.coverArtUrl}
              alt={recommendation.title}
              position={recommendation.coverArtPosition ?? 'center'}
              className={cn(
                'h-10 w-10',
                isPreviewing ? tone.previewBubble : 'shadow-[0_10px_24px_rgba(0,0,0,0.45)]',
              )}
            />
          </motion.div>

          <div className="min-w-0 flex-1 pl-3">
            <div className="truncate text-[14px] font-semibold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-grand-cru), serif' }}>
              {recommendation.title}
            </div>
            <div className="truncate text-[12px] leading-tight text-white/60" style={{ fontFamily: 'var(--font-bellavoir-serif), serif' }}>
              {recommendation.artist}
              {producerLabel ? ` - ${producerLabel}` : ''}
            </div>
            <p className="truncate text-[11px] leading-4 text-white/42">{recommendation.reason}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {scoreLabel ? <MetaChip label={scoreLabel} tone={tone.chipTone} /> : null}
              {recommendation.groupLabel ? <MetaChip label={recommendation.groupLabel} tone={tone.chipTone} /> : null}
              <MetaChip label={tempoLabel} tone="slate" />
            </div>
            {typeof recommendation.matchScore === 'number' ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  className={cn('h-full rounded-full bg-[linear-gradient(90deg,rgba(127,242,212,0.45)_0%,rgba(255,255,255,0.8)_52%,rgba(255,196,102,0.42)_100%)]', tone.bar)}
                  animate={reduceMotion ? undefined : { width: `${Math.max(12, Math.min(100, Math.round(recommendation.matchScore)))}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: `${Math.max(12, Math.min(100, Math.round(recommendation.matchScore)))}%` }}
                />
              </div>
            ) : null}
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => onAdd(recommendation)}
          aria-label={
            isStaged
              ? `Remove ${recommendation.title} from staged music`
              : `Add ${recommendation.title} to staged music`
          }
          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className={cn(
            'relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[15px] border bg-black text-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.9)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            isStaged ? 'border-emerald-400/14 text-emerald-100' : 'border-white/10 text-white',
          )}
        >
          <span className="absolute inset-0 rounded-[15px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_100%)]" />
          <span
            className={cn(
              'absolute inset-0 rounded-[15px] bg-[radial-gradient(circle_at_35%_25%,rgba(127,242,212,0.45)_0%,rgba(88,140,255,0.24)_40%,rgba(88,140,255,0)_74%)] opacity-0 transition-opacity duration-300',
              'group-hover:opacity-100',
            )}
          />
          <AnimatePresence initial={false} mode="wait">
            {isStaged ? (
              <motion.span
                key="added"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.78, rotate: -12 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.78, rotate: 10 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10"
              >
                <Check className="size-4" />
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.78, rotate: -12 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.78, rotate: 10 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10"
              >
                <Plus className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {showExpandedPreview ? (
          <motion.div
            key="preview-panel"
            initial={reduceMotion ? false : { opacity: 0, height: 0, y: -4, scale: 0.985 }}
            animate={reduceMotion ? undefined : { opacity: 1, height: 'auto', y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -4, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-[20px] border border-[#7ff2d4]/14 bg-[linear-gradient(180deg,rgba(7,14,12,0.96)_0%,rgba(8,10,14,0.96)_100%)] px-3 py-2.5">
              <button
                type="button"
                onClick={() => onPreviewToggle(recommendation)}
                className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-white/68"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Pause className="size-3.5 text-[#7ff2d4]" />
                  Pause preview
                </span>
                <span className="tabular-nums text-white/48">{recommendation.durationSec}s sample</span>
              </button>

              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[linear-gradient(90deg,rgba(127,242,212,0.55)_0%,rgba(255,255,255,0.82)_50%,rgba(147,108,255,0.45)_100%)]"
                  animate={reduceMotion ? undefined : { x: ['-35%', '150%'] }}
                  transition={reduceMotion ? undefined : { duration: 1.45, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/42">
                <MetaChip label={recommendation.genre} tone={tone.chipTone} />
                <MetaChip label={tempoLabel} tone="slate" />
                <MetaChip label="Tap the card to pause" tone="slate" />
              </div>

              {recommendation.fitReasons?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recommendation.fitReasons.slice(0, 3).map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/54"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  )
}

function MetaChip({ label, tone }: { label: string; tone: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'ice' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-400/18 bg-emerald-400/10 text-emerald-100'
      : tone === 'cyan'
        ? 'border-cyan-400/18 bg-cyan-400/10 text-cyan-100'
        : tone === 'amber'
          ? 'border-amber-400/18 bg-amber-400/10 text-amber-100'
          : tone === 'rose'
            ? 'border-rose-400/18 bg-rose-400/10 text-rose-100'
            : tone === 'ice'
              ? 'border-sky-300/18 bg-sky-300/10 text-sky-100'
              : 'border-white/10 bg-white/[0.04] text-white/70'

  return <span className={cn('rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em]', toneClass)}>{label}</span>
}

function getRecommendationTone(groupKey?: string | null) {
  switch (groupKey) {
    case 'safe-fit':
      return {
        border: 'border-cyan-400/14',
        previewBorder: 'border-cyan-400/26',
        previewShadow: 'shadow-[0_12px_28px_-20px_rgba(74,222,128,0.18)]',
        previewBubble: 'border-cyan-300/36 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(103,232,249,0.16)]',
        chipTone: 'cyan' as const,
        bar: 'bg-[linear-gradient(90deg,rgba(103,232,249,0.45)_0%,rgba(255,255,255,0.8)_52%,rgba(127,242,212,0.42)_100%)]',
      }
    case 'creative-stretch':
      return {
        border: 'border-amber-400/14',
        previewBorder: 'border-amber-400/26',
        previewShadow: 'shadow-[0_12px_28px_-20px_rgba(251,191,36,0.18)]',
        previewBubble: 'border-amber-300/36 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,191,36,0.16)]',
        chipTone: 'amber' as const,
        bar: 'bg-[linear-gradient(90deg,rgba(251,191,36,0.45)_0%,rgba(255,255,255,0.8)_52%,rgba(255,255,255,0.24)_100%)]',
      }
    case 'high-energy-alternative':
      return {
        border: 'border-rose-400/14',
        previewBorder: 'border-rose-400/26',
        previewShadow: 'shadow-[0_12px_28px_-20px_rgba(244,63,94,0.18)]',
        previewBubble: 'border-rose-300/36 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(251,113,133,0.16)]',
        chipTone: 'rose' as const,
        bar: 'bg-[linear-gradient(90deg,rgba(251,113,133,0.45)_0%,rgba(255,255,255,0.8)_52%,rgba(255,255,255,0.24)_100%)]',
      }
    case 'cinematic-alternative':
      return {
        border: 'border-sky-300/14',
        previewBorder: 'border-sky-300/26',
        previewShadow: 'shadow-[0_12px_28px_-20px_rgba(56,189,248,0.18)]',
        previewBubble: 'border-sky-200/36 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(125,211,252,0.16)]',
        chipTone: 'ice' as const,
        bar: 'bg-[linear-gradient(90deg,rgba(125,211,252,0.45)_0%,rgba(255,255,255,0.8)_52%,rgba(255,255,255,0.24)_100%)]',
      }
    case 'minimal-ambient-alternative':
      return {
        border: 'border-white/10',
        previewBorder: 'border-white/18',
        previewShadow: 'shadow-[0_12px_28px_-20px_rgba(255,255,255,0.12)]',
        previewBubble: 'border-white/18 shadow-[0_10px_24px_rgba(0,0,0,0.45)]',
        chipTone: 'slate' as const,
        bar: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.2)_0%,rgba(127,242,212,0.35)_52%,rgba(255,255,255,0.22)_100%)]',
      }
    case 'best-fit':
    default:
      return {
        border: 'border-emerald-400/14',
        previewBorder: 'border-emerald-400/26',
        previewShadow: 'shadow-[0_12px_28px_-20px_rgba(127,242,212,0.18)]',
        previewBubble: 'border-emerald-300/36 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(127,242,212,0.16)]',
        chipTone: 'emerald' as const,
        bar: 'bg-[linear-gradient(90deg,rgba(127,242,212,0.45)_0%,rgba(255,255,255,0.8)_52%,rgba(255,196,102,0.42)_100%)]',
      }
  }
}
