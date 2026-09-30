'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Sparkles, UserRound } from 'lucide-react'

import { CinematicTemplateHost } from '@/components/editor/cinematic-template-host'
import { buildPopVariants, buildRevealVariants, cinematicEase } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type {
  AnimationPlan,
  BackgroundCue,
  CounterCue,
  ExplainerCue,
  SpeechCue,
  TransitionCue,
} from '@/lib/types'

export function CinematicPreviewRuntime({
  animationPlan,
  currentTimeMs,
  aspectRatio,
  showSafeZones,
  children,
  className,
}: {
  animationPlan: AnimationPlan | null | undefined
  currentTimeMs: number
  aspectRatio: number
  showSafeZones?: boolean
  children: React.ReactNode
  className?: string
}) {
  const enabled = Boolean(animationPlan && aspectRatio > 0)

  const activeSpeechCues = React.useMemo(
    () => (enabled ? animationPlan!.speechCues.filter((cue) => isCueActive(cue.startMs, cue.endMs, currentTimeMs, 220)) : []),
    [animationPlan, currentTimeMs, enabled],
  )
  const activeTransitions = React.useMemo(
    () => (enabled ? animationPlan!.transitionCues.filter((cue) => isCueActive(cue.startMs, cue.endMs, currentTimeMs, 160)) : []),
    [animationPlan, currentTimeMs, enabled],
  )
  const activeExplainers = React.useMemo(
    () => (enabled ? animationPlan!.explainerCues.filter((cue) => isCueActive(cue.startMs, cue.endMs, currentTimeMs, 160)) : []),
    [animationPlan, currentTimeMs, enabled],
  )
  const activeBackgrounds = React.useMemo(
    () => (enabled ? animationPlan!.backgroundCues.filter((cue) => isCueActive(cue.startMs, cue.endMs, currentTimeMs, 160)) : []),
    [animationPlan, currentTimeMs, enabled],
  )
  const activeCounter = React.useMemo(
    () => (enabled ? pickLatest(animationPlan!.counterCues.filter((cue) => isCueActive(cue.startMs, cue.endMs, currentTimeMs, 100))) : null),
    [animationPlan, currentTimeMs, enabled],
  )

  const activeHeading = pickLatest(activeSpeechCues.filter((cue) => cue.variant === 'heading'))
  const activeCaption = pickLatest(activeSpeechCues.filter((cue) => cue.variant === 'caption'))
  const activeLine = pickLatest(activeTransitions.filter((cue) => cue.type === 'line' || cue.type === 'section-divider'))
  const activeSidePan = pickLatest(activeTransitions.filter((cue) => cue.type === 'side-pan'))
  const activeExplainer = pickLatest(activeExplainers)
  const activeBackgroundVideo = pickLatest(activeBackgrounds.filter((cue) => cue.kind === 'video'))
  const activeBackgroundImage = pickLatest(activeBackgrounds.filter((cue) => cue.kind === 'image'))

  const sidePanelActive = Boolean(activeExplainer?.layout === 'side-panel' || activeSidePan)
  const fullscreenExplainer = activeExplainer?.layout === 'full-frame' ? activeExplainer : null

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <motion.div
        animate={
          sidePanelActive
            ? { x: '18%', scale: 0.82, filter: 'brightness(0.74) saturate(0.9)' }
            : fullscreenExplainer
              ? { x: '0%', scale: 0.94, filter: 'brightness(0.46) saturate(0.88)' }
              : { x: '0%', scale: 1, filter: 'brightness(1) saturate(1)' }
        }
        transition={{ duration: 0.45, ease: cinematicEase }}
        className="absolute inset-0 will-change-transform"
      >
        {children}
      </motion.div>

      {activeBackgroundVideo ? <BackgroundVideo cue={activeBackgroundVideo} /> : null}
      {activeBackgroundImage ? <BackgroundImage cue={activeBackgroundImage} /> : null}
      {showSafeZones ? <SafeZoneOverlay /> : null}
      {activeLine ? <TransitionLine cue={activeLine} currentTimeMs={currentTimeMs} /> : null}
      {activeCounter ? <CounterOverlay cue={activeCounter} currentTimeMs={currentTimeMs} /> : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {activeExplainer ? (
          <motion.div
            key={activeExplainer.id}
            variants={buildRevealVariants({ distance: 18, blur: 16, duration: 0.34 })}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'pointer-events-none absolute inset-y-[7%] z-20',
              activeExplainer.layout === 'side-panel'
                ? 'left-[4%] w-[42%]'
                : 'left-1/2 top-1/2 h-[76%] w-[74%] -translate-x-1/2 -translate-y-1/2',
            )}
          >
            <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_62%)]" />
            <CinematicTemplateHost cue={activeExplainer} className="h-full w-full" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {activeHeading ? (
          <motion.div
            key={activeHeading.id}
            variants={buildRevealVariants({ distance: 18, blur: 14, duration: 0.34 })}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="pointer-events-none absolute z-30"
            style={resolveSpeechPlacement(activeHeading)}
          >
            <SpeechPanel cue={activeHeading} heading />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {activeCaption ? (
          <motion.div
            key={activeCaption.id}
            variants={buildPopVariants({ distance: 12, blur: 12, duration: 0.3 })}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="pointer-events-none absolute z-30 flex"
            style={resolveSpeechPlacement(activeCaption)}
          >
            <SpeechPanel cue={activeCaption} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function BackgroundVideo({ cue }: { cue: BackgroundCue }) {
  const rotateScale = cue.transform === 'rotateAndCover16x9' ? 1.78 : 1
  return (
    <motion.div
      variants={buildRevealVariants({ distance: 10, blur: 18, duration: 0.4 })}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ opacity: cue.opacity, mixBlendMode: cue.blendMode ?? 'normal' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_56%),linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.58)_100%)]" />
      <video
        src={cue.sourceUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute left-1/2 top-1/2 h-full w-full object-cover"
        style={{
          transform: `translate(-50%, -50%) rotate(90deg) scale(${rotateScale})`,
          transformOrigin: 'center center',
        }}
      />
    </motion.div>
  )
}

function BackgroundImage({ cue }: { cue: BackgroundCue }) {
  const placementClass =
    cue.placement === 'right-stage'
      ? 'right-[3%] top-[14%] w-[34%] h-[60%]'
      : cue.placement === 'left-stage'
        ? 'left-[3%] top-[14%] w-[34%] h-[60%]'
        : 'inset-[10%]'

  return (
    <motion.div
      variants={buildPopVariants({ distance: 16, blur: 16, duration: 0.34 })}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('pointer-events-none absolute z-20 overflow-hidden rounded-[26px]', placementClass)}
      style={{ opacity: cue.opacity, mixBlendMode: cue.blendMode ?? 'screen' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_44%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.52)_100%)]" />
      <img src={cue.sourceUrl} alt="" className="h-full w-full object-cover" />
    </motion.div>
  )
}

function TransitionLine({
  cue,
  currentTimeMs,
}: {
  cue: TransitionCue
  currentTimeMs: number
}) {
  const progress = normalizeProgress(cue.startMs, cue.endMs, currentTimeMs)
  const expansion = progress <= 0.5 ? progress * 2 : (1 - progress) * 2

  return (
    <div className="pointer-events-none absolute left-1/2 top-[20%] z-30 h-px w-[46%] -translate-x-1/2 overflow-visible">
      <motion.div
        className="h-full w-full rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.92)_22%,rgba(183,255,102,0.9)_50%,rgba(255,255,255,0.92)_78%,rgba(255,255,255,0)_100%)] shadow-[0_0_24px_rgba(177,255,96,0.4)]"
        style={{
          opacity: Math.max(0.2, expansion),
          transform: `scaleX(${Math.max(0.08, expansion)})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}

function CounterOverlay({
  cue,
  currentTimeMs,
}: {
  cue: CounterCue
  currentTimeMs: number
}) {
  const progress = normalizeProgress(cue.startMs, cue.endMs, currentTimeMs)
  const value = Math.round(cue.from + (cue.to - cue.from) * progress)
  const formatted = formatCounterValue(cue, value)
  const Icon = cue.icon === 'user' ? UserRound : cue.icon === 'chart' ? BarChart3 : Sparkles

  return (
    <motion.div
      variants={buildPopVariants({ distance: 16, blur: 14, duration: 0.34 })}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="pointer-events-none absolute left-1/2 top-[12%] z-30 -translate-x-1/2"
    >
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)] px-6 py-4 text-center shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-white text-black shadow-[0_12px_24px_-18px_rgba(255,255,255,0.95)]">
          <Icon className="size-5" />
        </div>
        <div className="bg-[linear-gradient(90deg,#93ff6f_0%,#11d84e_100%)] bg-clip-text text-[clamp(1.7rem,4vw,3.2rem)] font-black tracking-[-0.05em] text-transparent drop-shadow-[0_0_18px_rgba(66,255,120,0.4)]">
          {formatted}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.26em] text-white/55">{cue.label}</div>
      </div>
    </motion.div>
  )
}

function SpeechPanel({
  cue,
  heading = false,
}: {
  cue: SpeechCue
  heading?: boolean
}) {
  const mainText = (typeof cue.text === 'string' ? cue.text.trim() : '') || cue.accentText?.trim() || ''
  const accentToneClass =
    cue.tone === 'lime'
      ? 'from-[#e9ff7a] to-[#5fef63] text-[#10240b]'
      : cue.tone === 'rose'
        ? 'from-[#ffc0d6] to-[#ff7bb0] text-[#2c1020]'
        : cue.tone === 'ice'
          ? 'from-[#e7f6ff] to-[#a5dfff] text-[#072635]'
          : 'from-[#ffe6b8] to-[#ffb347] text-[#3d2505]'

  return (
    <div
      className={cn(
        'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,11,16,0.72)_0%,rgba(7,7,10,0.2)_100%)] px-4 py-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-md',
        heading ? 'bg-transparent px-0 py-0 border-0 shadow-none backdrop-blur-0' : '',
      )}
      style={{ maxWidth: `${Math.max(20, Math.min(100, cue.maxWidthPct ?? 80))}%` }}
    >
      {cue.leadText ? (
        <div className={cn('text-white', heading ? 'text-[clamp(2rem,5vw,3.8rem)] font-black leading-[0.92] tracking-[-0.06em]' : 'text-[clamp(1rem,2vw,1.7rem)] font-bold leading-[1.02] tracking-[-0.04em]')}>
          {cue.leadText}
        </div>
      ) : null}
      {mainText ? (
        <div
          className={cn(
            'max-w-full whitespace-pre-wrap break-words rounded-[16px] bg-gradient-to-r bg-clip-padding px-3 py-1.5 font-black tracking-[-0.06em]',
            accentToneClass,
            heading ? 'mt-2 text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.9] italic' : 'mt-1 text-[clamp(1.25rem,2.2vw,2rem)] leading-tight italic',
          )}
          style={{
            textDecoration: cue.treatment === 'underline' ? 'underline' : undefined,
            textDecorationThickness: cue.treatment === 'underline' ? '0.16em' : undefined,
          }}
        >
          {mainText}
        </div>
      ) : null}
      {cue.trailingText ? (
        <div className={cn('text-white/92', heading ? 'mt-2 text-lg font-semibold tracking-[-0.02em]' : 'mt-1 text-base font-medium')}>
          {cue.trailingText}
        </div>
      ) : null}
    </div>
  )
}

function resolveSpeechPlacement(cue: SpeechCue): React.CSSProperties {
  const alignment = cue.alignment === 'left' ? 'flex-start' : cue.alignment === 'right' ? 'flex-end' : 'center'
  const maxWidth = `${Math.max(20, Math.min(100, cue.maxWidthPct ?? 80))}%`

  switch (cue.region) {
    case 'safe-upper-third':
      return { left: '6%', right: '6%', top: '6%', justifyContent: alignment, maxWidth: '88%' }
    case 'center-stage':
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', justifyContent: alignment, maxWidth }
    case 'left-panel':
      return { left: '4%', top: '50%', transform: 'translateY(-50%)', width: '42%', justifyContent: alignment }
    case 'right-panel':
      return { right: '4%', top: '50%', transform: 'translateY(-50%)', width: '42%', justifyContent: alignment }
    case 'full-frame':
      return { inset: '8%', alignItems: 'center', justifyContent: alignment }
    case 'background-wash':
    case 'safe-lower-third':
    default:
      return {
        left: '6%',
        right: '6%',
        bottom: `${Math.max(5, Math.min(35, cue.bottomPaddingPct ?? 13))}%`,
        justifyContent: alignment,
        maxWidth: '88%',
      }
  }
}

function SafeZoneOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-x-[6%] bottom-[13%] h-[18%] rounded-[22px] border border-dashed border-[#f4eb72]/45 bg-[#f4eb72]/[0.03]" />
      <div className="absolute inset-x-[4.5%] inset-y-[5.5%] rounded-[24px] border border-dashed border-white/12" />
    </div>
  )
}

function formatCounterValue(cue: CounterCue, value: number) {
  if (cue.format === 'currency') {
    return `${cue.prefix ?? '$'}${value.toLocaleString()}${cue.suffix ?? ''}`
  }
  if (cue.format === 'percent') {
    return `${cue.prefix ?? ''}${value.toLocaleString()}${cue.suffix || '%'}`
  }
  return `${cue.prefix ?? ''}${value.toLocaleString()}${cue.suffix ?? ''}`
}

function isCueActive(startMs: number, endMs: number, currentTimeMs: number, paddingMs = 0) {
  return currentTimeMs >= startMs - paddingMs && currentTimeMs <= endMs + paddingMs
}

function normalizeProgress(startMs: number, endMs: number, currentTimeMs: number) {
  if (endMs <= startMs) return 1
  const progress = (currentTimeMs - startMs) / (endMs - startMs)
  return Math.max(0, Math.min(1, progress))
}

function pickLatest<T extends { startMs: number }>(items: T[]) {
  if (items.length === 0) return null
  return [...items].sort((left, right) => right.startMs - left.startMs)[0] ?? null
}
