'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, RotateCcw } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { cn } from '@/lib/utils'

type SplitPreviewMediaKind = 'video' | 'image'
type SplitPanelSide = 'left' | 'right'

const PANEL_RADIUS_PX = 14

type SplitVideoSources = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  leftUrl?: string | null
  rightUrl?: string | null
}

interface ViralClipSplitPreviewProps {
  active: boolean
  animationKey: number
  previewUrl: string
  previewKind: SplitPreviewMediaKind
  title: string
  isPlaying: boolean
  currentTimeSec: number
  mediaTransformStyle?: React.CSSProperties
  objectFit: 'cover' | 'contain'
  splitVideoSources?: SplitVideoSources
  highlightRestore?: boolean
  onRestoreLandscape: () => void
}

const INITIAL_STAGE_WIDTH_PERCENT = 79.5
const MORPH_STAGE_WIDTH_PERCENT = 58
const FINAL_SIDE_WIDTH_PERCENT = 39.75
const FINAL_SIDE_INSET_PERCENT = 100 - FINAL_SIDE_WIDTH_PERCENT
const MORPH_STAGE_INSET_PERCENT = (100 - MORPH_STAGE_WIDTH_PERCENT) / 2
const LOADING_OVERLAY_DURATION_SEC = 0.82
const MORPH_DELAY_SEC = 0.08
const MORPH_DURATION_SEC = 1.28
const SPLIT_DELAY_SEC = 0.32
const SPLIT_DURATION_SEC = 1.5
const FINAL_PANEL_WIDTH_PERCENT = 25.5
const FINAL_PANEL_INSET_PERCENT = 14
const PANEL_INTERACTIVE_DELAY_MS = Math.round((SPLIT_DELAY_SEC + SPLIT_DURATION_SEC) * 1000)
const CLIP_SLICE_COUNT = 6

const SPLIT_SIDES: readonly SplitPanelSide[] = ['left', 'right'] as const

const INITIAL_SPLIT_MASK = {
  left: `inset(0% 50% 0% ${MORPH_STAGE_INSET_PERCENT}% round ${PANEL_RADIUS_PX}px)`,
  right: `inset(0% ${MORPH_STAGE_INSET_PERCENT}% 0% 50% round ${PANEL_RADIUS_PX}px)`,
} as const

const FINAL_SPLIT_MASK = {
  left: `inset(0% ${FINAL_SIDE_INSET_PERCENT}% 0% 0% round ${PANEL_RADIUS_PX}px)`,
  right: `inset(0% 0% 0% ${FINAL_SIDE_INSET_PERCENT}% round ${PANEL_RADIUS_PX}px)`,
} as const

export function ViralClipSplitPreview({
  active,
  animationKey,
  previewUrl,
  previewKind,
  title,
  isPlaying,
  currentTimeSec,
  mediaTransformStyle,
  objectFit,
  splitVideoSources,
  highlightRestore = false,
  onRestoreLandscape,
}: ViralClipSplitPreviewProps) {
  const reduceMotion = useStableReducedMotion()
  const latestParentTimeRef = React.useRef(currentTimeSec)
  const latestParentPlayingRef = React.useRef(isPlaying)
  const fullVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const leftAnimatedVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const rightAnimatedVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const leftIndependentVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const rightIndependentVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const panelToggleCooldownRef = React.useRef<number | null>(null)
  const [panelsInteractive, setPanelsInteractive] = React.useState(reduceMotion)
  const [panelPlayback, setPanelPlayback] = React.useState<Record<SplitPanelSide, boolean>>({
    left: false,
    right: false,
  })

  const independentSplitReady =
    previewKind === 'video' &&
    splitVideoSources?.status === 'ready' &&
    Boolean(splitVideoSources.leftUrl) &&
    Boolean(splitVideoSources.rightUrl)

  React.useEffect(() => {
    latestParentTimeRef.current = currentTimeSec
  }, [currentTimeSec])

  React.useEffect(() => {
    latestParentPlayingRef.current = isPlaying
  }, [isPlaying])

  const syncVideo = React.useCallback(
    (video: HTMLVideoElement | null, targetTime: number, playing: boolean, force = false) => {
      if (previewKind !== 'video' || !video) return

      if (Number.isFinite(targetTime) && Math.abs(video.currentTime - targetTime) > (force ? 0.05 : 0.35)) {
        const maxTime =
          Number.isFinite(video.duration) && video.duration > 0 ? Math.max(0, video.duration - 0.04) : targetTime
        video.currentTime = Math.max(0, Math.min(targetTime, maxTime))
      }

      if (playing) {
        void video.play().catch(() => undefined)
      } else {
        video.pause()
      }
    },
    [previewKind],
  )

  const getAnimatedVideoRef = React.useCallback((side: SplitPanelSide) => {
    return side === 'left' ? leftAnimatedVideoRef : rightAnimatedVideoRef
  }, [])

  const getIndependentVideoRef = React.useCallback((side: SplitPanelSide) => {
    return side === 'left' ? leftIndependentVideoRef : rightIndependentVideoRef
  }, [])

  React.useEffect(() => {
    if (!active) return

    syncVideo(fullVideoRef.current, currentTimeSec, isPlaying)

    if (!panelsInteractive) {
      syncVideo(leftAnimatedVideoRef.current, currentTimeSec, isPlaying)
      syncVideo(rightAnimatedVideoRef.current, currentTimeSec, isPlaying)
    }
  }, [active, currentTimeSec, isPlaying, panelsInteractive, syncVideo])

  React.useEffect(() => {
    if (!active || !panelsInteractive || !independentSplitReady) return

    syncVideo(leftIndependentVideoRef.current, latestParentTimeRef.current, panelPlayback.left, true)
    syncVideo(rightIndependentVideoRef.current, latestParentTimeRef.current, panelPlayback.right, true)
  }, [active, independentSplitReady, panelPlayback.left, panelPlayback.right, panelsInteractive, syncVideo])

  React.useEffect(() => {
    if (!active) return

    setPanelPlayback({
      left: false,
      right: false,
    })

    if (reduceMotion) {
      setPanelsInteractive(true)
      return
    }

    setPanelsInteractive(false)
    const timer = window.setTimeout(() => {
      syncVideo(leftAnimatedVideoRef.current, latestParentTimeRef.current, false, true)
      syncVideo(rightAnimatedVideoRef.current, latestParentTimeRef.current, false, true)
      setPanelsInteractive(true)
    }, PANEL_INTERACTIVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [active, animationKey, previewUrl, reduceMotion, syncVideo])

  React.useEffect(() => {
    return () => {
      if (panelToggleCooldownRef.current !== null) {
        window.clearTimeout(panelToggleCooldownRef.current)
        panelToggleCooldownRef.current = null
      }
    }
  }, [])

  const armPanelToggleCooldown = React.useCallback(() => {
    if (panelToggleCooldownRef.current !== null) {
      window.clearTimeout(panelToggleCooldownRef.current)
    }

    panelToggleCooldownRef.current = window.setTimeout(() => {
      panelToggleCooldownRef.current = null
    }, 220)
  }, [])

  const handlePanelToggle = React.useCallback(
    (side: SplitPanelSide) => {
      if (panelToggleCooldownRef.current !== null) return
      armPanelToggleCooldown()

      const targetVideo = independentSplitReady ? getIndependentVideoRef(side).current : getAnimatedVideoRef(side).current
      if (!targetVideo || previewKind !== 'video') return

      const isPanelPlaying = panelPlayback[side]

      if (!isPanelPlaying) {
        void targetVideo.play().then(() => {
          setPanelPlayback((current) => ({
            ...current,
            [side]: true,
          }))
        }).catch(() => {
          setPanelPlayback((current) => ({
            ...current,
            [side]: false,
          }))
        })
        return
      }

      targetVideo.pause()
      setPanelPlayback((current) => ({
        ...current,
        [side]: false,
      }))
    },
    [armPanelToggleCooldown, getAnimatedVideoRef, getIndependentVideoRef, independentSplitReady, panelPlayback, previewKind],
  )

  if (!active || !previewUrl) return null

  return (
    <motion.div
      key={`viral-split-${animationKey}-${previewUrl}`}
      className="relative h-full w-full overflow-hidden rounded-[14px] bg-[#020203] text-white"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 50% 16%, rgba(44,86,120,0.16) 0%, rgba(44,86,120,0.02) 32%, rgba(0,0,0,0) 58%), linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 24%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onRestoreLandscape()
        }}
        aria-label="Return to landscape preview"
        title="Return to landscape preview"
        className={cn(
          'absolute right-3 top-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors',
          highlightRestore
            ? 'border-[#ff9d8a]/44 bg-[linear-gradient(135deg,rgba(255,146,122,0.28)_0%,rgba(255,111,92,0.18)_34%,rgba(18,10,12,0.92)_100%)] text-[#fff1ed]'
            : 'border-white/12 bg-black/72 text-white/82 hover:bg-black/86 hover:text-white',
        )}
        initial={false}
        animate={
          reduceMotion
            ? undefined
            : highlightRestore
              ? {
                  boxShadow: [
                    '0 18px 30px -22px rgba(0,0,0,0.95), 0 0 0 0 rgba(255,117,92,0)',
                    '0 22px 42px -20px rgba(255,92,72,0.38), 0 -10px 26px -18px rgba(255,140,112,0.42)',
                    '0 18px 30px -22px rgba(0,0,0,0.95), 0 0 0 0 rgba(255,117,92,0)',
                  ],
                  y: [0, -1, 0],
                  scale: [1, 1.03, 1],
                }
              : {
                  boxShadow: '0 18px 30px -22px rgba(0,0,0,0.95)',
                  y: 0,
                  scale: 1,
                }
        }
        transition={
          reduceMotion
            ? undefined
            : highlightRestore
              ? {
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }
              : {
                  duration: 0.24,
                  ease: 'easeOut',
                }
        }
      >
        <RotateCcw className="size-3.5" />
      </motion.button>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[18] flex items-center justify-center"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={
          reduceMotion
            ? { opacity: 0 }
            : {
                opacity: [0, 1, 1, 0],
                scale: [0.98, 1, 1, 0.985],
                filter: ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(6px)'],
              }
        }
        transition={{
          duration: reduceMotion ? 0 : LOADING_OVERLAY_DURATION_SEC,
          times: reduceMotion ? undefined : [0, 0.18, 0.7, 1],
          ease: reduceMotion ? undefined : [0.22, 1, 0.36, 1],
        }}
      >
        <div className="relative flex h-[76%] w-[46%] items-center justify-center">
          {SPLIT_SIDES.map((side, index) => (
            <motion.div
              key={`loading-${side}`}
              className={cn(
                'absolute top-1/2 h-full w-[37%] -translate-y-1/2 overflow-hidden rounded-[14px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,16,22,0.95)_0%,rgba(6,8,12,0.98)_100%)] shadow-[0_28px_74px_-36px_rgba(0,0,0,0.88)]',
                side === 'left' ? 'left-1/2' : 'right-1/2',
              )}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      scale: 0.84,
                      x: side === 'left' ? '2%' : '-2%',
                    }
              }
              animate={
                reduceMotion
                  ? undefined
                  : {
                      opacity: [0, 0.82, 0.5, 0],
                      scale: [0.84, 1, 1.02, 1.01],
                      x:
                        side === 'left'
                          ? ['2%', '-7%', '-14%', '-17%']
                          : ['-2%', '7%', '14%', '17%'],
                    }
              }
              transition={{
                duration: reduceMotion ? 0 : LOADING_OVERLAY_DURATION_SEC,
                delay: reduceMotion ? 0 : index * 0.04,
                times: reduceMotion ? undefined : [0, 0.22, 0.68, 1],
                ease: reduceMotion ? undefined : [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: side === 'left' ? 'right center' : 'left center' }}
            >
              <PanelBlueprintOverlay tone="loading" />
            </motion.div>
          ))}

          <motion.div
            className="absolute left-1/2 top-1/2 z-10 h-[70%] w-[8.5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,146,122,0.18)_0%,rgba(255,111,92,0.08)_34%,rgba(0,0,0,0.82)_100%)] blur-[1px]"
            initial={reduceMotion ? false : { opacity: 0, scaleY: 0.7, scaleX: 0.3 }}
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: [0, 0.88, 0.3, 0],
                    scaleY: [0.7, 1.04, 0.86, 0.3],
                    scaleX: [0.3, 0.8, 0.52, 0.08],
                  }
            }
            transition={{
              duration: reduceMotion ? 0 : LOADING_OVERLAY_DURATION_SEC,
              times: reduceMotion ? undefined : [0, 0.26, 0.72, 1],
              ease: reduceMotion ? undefined : [0.22, 1, 0.36, 1],
            }}
          />

          <motion.div
            className="absolute bottom-3 inline-flex items-center gap-2 rounded-full border border-[#ff937d]/24 bg-[linear-gradient(135deg,rgba(255,154,128,0.2)_0%,rgba(255,111,92,0.1)_32%,rgba(12,12,16,0.9)_100%)] px-3 py-2 shadow-[0_18px_46px_-26px_rgba(255,98,78,0.5)] backdrop-blur-md"
            initial={reduceMotion ? false : { y: 6 }}
            animate={reduceMotion ? undefined : { y: [6, 0, 0, -3] }}
            transition={{
              duration: reduceMotion ? 0 : LOADING_OVERLAY_DURATION_SEC,
              times: reduceMotion ? undefined : [0, 0.2, 0.72, 1],
              ease: reduceMotion ? undefined : [0.22, 1, 0.36, 1],
            }}
          >
            <InlineLoadingAnimation size={20} label="Preparing split preview" />
          </motion.div>
        </div>
      </motion.div>

      {!panelsInteractive ? (
        <>
          <ClipSliceForgeOverlay
            previewKind={previewKind}
            previewUrl={previewUrl}
            title={title}
            objectFit={objectFit}
            mediaTransformStyle={mediaTransformStyle}
            reduceMotion={reduceMotion}
          />

          <motion.div
            aria-hidden
            className="absolute inset-y-0 left-1/2 z-10 -translate-x-1/2 overflow-hidden border border-white/10 bg-black shadow-[0_22px_60px_-34px_rgba(0,0,0,0.58)]"
            initial={
              reduceMotion
                ? false
                : {
                    width: `${INITIAL_STAGE_WIDTH_PERCENT}%`,
                    opacity: 0,
                    borderRadius: PANEL_RADIUS_PX,
                  }
            }
            animate={
              reduceMotion
                ? {
                    width: `${MORPH_STAGE_WIDTH_PERCENT}%`,
                    opacity: 0,
                    borderRadius: PANEL_RADIUS_PX,
                  }
                : {
                    width: `${MORPH_STAGE_WIDTH_PERCENT}%`,
                    opacity: [0, 1, 1, 0],
                    borderRadius: [PANEL_RADIUS_PX, PANEL_RADIUS_PX, PANEL_RADIUS_PX],
                  }
            }
            transition={{
              duration: reduceMotion ? 0 : MORPH_DURATION_SEC + 0.36,
              delay: reduceMotion ? 0 : MORPH_DELAY_SEC,
              times: reduceMotion ? undefined : [0, 0.18, 0.68, 1],
              ease: reduceMotion ? undefined : [0.645, 0.045, 0.355, 1],
            }}
            style={{ borderRadius: PANEL_RADIUS_PX, willChange: 'width, opacity, border-radius' }}
          >
            <SplitMedia
              previewKind={previewKind}
              previewUrl={previewUrl}
              title={title}
              videoRef={fullVideoRef}
              onReady={() => syncVideo(fullVideoRef.current, currentTimeSec, isPlaying, true)}
              preload={previewKind === 'video' ? 'metadata' : 'auto'}
              mediaTransformStyle={mediaTransformStyle}
              className="block h-full w-full select-none bg-black"
              style={{ objectFit, objectPosition: '50% center' }}
            />
            <PanelBlueprintOverlay tone="stage" />
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 z-20 h-[74%] w-[12%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
            initial={reduceMotion ? false : { opacity: 0, scaleX: 0.2, scaleY: 0.92 }}
            animate={
              reduceMotion
                ? { opacity: 0 }
                : {
                    opacity: [0, 0.94, 0],
                    scaleX: [0.2, 1, 0.06],
                    scaleY: [0.92, 0.68, 0.05],
                  }
            }
            transition={{
              duration: reduceMotion ? 0 : 0.82,
              delay: reduceMotion ? 0 : 0.54,
              ease: reduceMotion ? undefined : [0.645, 0.045, 0.355, 1],
            }}
            style={{ willChange: 'transform, opacity' }}
          />
        </>
      ) : null}

      {SPLIT_SIDES.map((side, index) => {
        const panelLeft =
          side === 'left'
            ? `${FINAL_PANEL_INSET_PERCENT}%`
            : `${100 - FINAL_PANEL_INSET_PERCENT - FINAL_PANEL_WIDTH_PERCENT}%`
        const panelPreviewUrl =
          panelsInteractive && independentSplitReady
            ? side === 'left'
              ? splitVideoSources?.leftUrl ?? previewUrl
              : splitVideoSources?.rightUrl ?? previewUrl
            : previewUrl
        const panelVideoRef =
          panelsInteractive && independentSplitReady ? getIndependentVideoRef(side) : getAnimatedVideoRef(side)
        const panelTransformStyle =
          panelsInteractive && independentSplitReady ? undefined : mediaTransformStyle
        const panelObjectPosition =
          panelsInteractive && independentSplitReady
            ? '50% center'
            : panelsInteractive
              ? side === 'left'
                ? '42% center'
                : '58% center'
              : '50% center'

        return (
          <motion.div
            key={`split-panel-${side}`}
            className="absolute z-30 overflow-hidden border border-white/10 bg-black shadow-[0_28px_70px_-36px_rgba(0,0,0,0.82)]"
            initial={
              reduceMotion
                ? false
                : {
                    clipPath: INITIAL_SPLIT_MASK[side],
                    opacity: 0,
                    left: '0%',
                    top: '0%',
                    width: '100%',
                    height: '100%',
                  }
            }
            animate={
              panelsInteractive
                ? {
                    clipPath: `inset(0% 0% 0% 0% round ${PANEL_RADIUS_PX}px)`,
                    opacity: 1,
                    x: 0,
                    left: panelLeft,
                    top: '0%',
                    width: `${FINAL_PANEL_WIDTH_PERCENT}%`,
                    height: '100%',
                  }
                : {
                    clipPath: FINAL_SPLIT_MASK[side],
                    opacity: 1,
                    x: side === 'left' ? '-14%' : '14%',
                    left: '0%',
                    top: '0%',
                    width: '100%',
                    height: '100%',
                  }
            }
            transition={{
              duration: reduceMotion ? 0 : panelsInteractive ? 0.34 : SPLIT_DURATION_SEC,
              delay: reduceMotion ? 0 : panelsInteractive ? index * 0.03 : SPLIT_DELAY_SEC + index * 0.06,
              ease: reduceMotion ? undefined : panelsInteractive ? [0.22, 1, 0.36, 1] : [0.645, 0.045, 0.355, 1],
            }}
            style={{ borderRadius: PANEL_RADIUS_PX, willChange: 'transform, clip-path, opacity, width, left' }}
          >
            {previewKind === 'video' && panelsInteractive && independentSplitReady ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  handlePanelToggle(side)
                }}
                className="absolute inset-0 z-10 cursor-pointer"
                aria-label={panelPlayback[side] ? `Pause ${side} split reel` : `Play ${side} split reel`}
              />
            ) : null}

            <SplitMedia
              previewKind={previewKind}
              previewUrl={panelPreviewUrl}
              title={title}
              videoRef={panelVideoRef}
              onReady={() =>
                syncVideo(
                  panelVideoRef.current,
                  panelsInteractive && independentSplitReady ? latestParentTimeRef.current : currentTimeSec,
                  panelsInteractive && independentSplitReady ? panelPlayback[side] : isPlaying,
                  true,
                )
              }
              preload={panelsInteractive && independentSplitReady ? 'auto' : previewKind === 'video' ? 'metadata' : 'auto'}
              mediaTransformStyle={panelTransformStyle}
              className="block h-full w-full select-none bg-black"
              style={{ objectFit, objectPosition: panelObjectPosition }}
            />
            <PanelBlueprintOverlay tone="split" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_46%,rgba(0,0,0,0.58)_100%)]" />

            {previewKind === 'video' && panelsInteractive && independentSplitReady ? (
              <SplitPanelChrome
                side={side}
                videoRef={panelVideoRef}
                isPlaying={panelPlayback[side]}
                onToggle={() => handlePanelToggle(side)}
              />
            ) : null}

            {previewKind === 'video' && panelsInteractive && !independentSplitReady ? (
              <PanelReadyLoader status={splitVideoSources?.status ?? 'loading'} />
            ) : null}
          </motion.div>
        )
      })}
    </motion.div>
  )
}

function formatSplitTimeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function PanelBlueprintOverlay({
  tone,
}: {
  tone: 'loading' | 'stage' | 'split'
}) {
  const gridStyle =
    tone === 'loading'
      ? {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 24%, rgba(0,0,0,0.4) 100%), repeating-linear-gradient(90deg, rgba(120,170,220,0.14) 0 1px, transparent 1px 58px), repeating-linear-gradient(0deg, rgba(120,170,220,0.08) 0 1px, transparent 1px 38px)',
        }
      : tone === 'stage'
        ? {
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 26%, rgba(0,0,0,0.46) 100%), repeating-linear-gradient(90deg, rgba(120,170,220,0.11) 0 1px, transparent 1px 68px), repeating-linear-gradient(0deg, rgba(120,170,220,0.06) 0 1px, transparent 1px 44px)',
          }
        : {
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 28%, rgba(0,0,0,0.48) 100%), repeating-linear-gradient(90deg, rgba(120,170,220,0.12) 0 1px, transparent 1px 64px), repeating-linear-gradient(0deg, rgba(120,170,220,0.07) 0 1px, transparent 1px 42px)',
          }

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-90" style={gridStyle} />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-[10px] rounded-[10px] border',
          tone === 'loading' ? 'border-[#8fc6f8]/16' : 'border-white/8',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-[24%]',
          tone === 'loading'
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]',
        )}
      />
    </>
  )
}

function ClipSliceForgeOverlay({
  previewKind,
  previewUrl,
  title,
  objectFit,
  mediaTransformStyle,
  reduceMotion,
}: {
  previewKind: SplitPreviewMediaKind
  previewUrl: string
  title: string
  objectFit: 'cover' | 'contain'
  mediaTransformStyle?: React.CSSProperties
  reduceMotion: boolean
}) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-[7%] z-[24] overflow-hidden rounded-[18px] border border-[#9fcfff]/14 bg-black/18 shadow-[0_32px_80px_-44px_rgba(86,160,255,0.34)]"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.985, filter: 'blur(12px)' }}
      animate={
        reduceMotion
          ? { opacity: 0 }
          : {
              opacity: [0, 1, 1, 0],
              scale: [0.985, 1, 1.006, 1.012],
              filter: ['blur(12px)', 'blur(0px)', 'blur(0px)', 'blur(10px)'],
            }
      }
      transition={{
        duration: reduceMotion ? 0 : SPLIT_DELAY_SEC + SPLIT_DURATION_SEC + 0.24,
        times: reduceMotion ? undefined : [0, 0.16, 0.72, 1],
        ease: reduceMotion ? undefined : [0.22, 1, 0.36, 1],
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[18px]">
        {Array.from({ length: CLIP_SLICE_COUNT }, (_, index) => {
          const width = 100 / CLIP_SLICE_COUNT
          const centerOffset = index - (CLIP_SLICE_COUNT - 1) / 2

          return (
            <motion.div
              key={`clip-slice-${index}`}
              className="absolute inset-y-0 overflow-hidden border-x border-white/8 bg-black"
              style={{
                left: `${index * width}%`,
                width: `${width}%`,
                transformOrigin: `${centerOffset < 0 ? 'right' : 'left'} center`,
              }}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 0,
                      x: 0,
                      scaleY: 0.96,
                    }
              }
              animate={
                reduceMotion
                  ? undefined
                  : {
                      opacity: [0, 1, 1, 0.72, 0],
                      x: [0, centerOffset * 3, centerOffset * 10, centerOffset * 17],
                      y: [0, index % 2 === 0 ? -3 : 4, index % 2 === 0 ? -8 : 9, 0],
                      scaleY: [0.96, 1, 1.03, 0.88],
                      rotateZ: [0, centerOffset * 0.28, centerOffset * 0.72, centerOffset * 0.4],
                    }
              }
              transition={{
                duration: reduceMotion ? 0 : SPLIT_DURATION_SEC + 0.46,
                delay: reduceMotion ? 0 : 0.18 + index * 0.035,
                times: reduceMotion ? undefined : [0, 0.18, 0.68, 1],
                ease: reduceMotion ? undefined : [0.645, 0.045, 0.355, 1],
              }}
            >
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${-index * 100}%`,
                  width: `${CLIP_SLICE_COUNT * 100}%`,
                  ...mediaTransformStyle,
                }}
              >
                {previewKind === 'image' ? (
                  <img
                    src={previewUrl}
                    alt={`${title} slice ${index + 1}`}
                    className="h-full w-full select-none bg-black"
                    draggable={false}
                    style={{ objectFit }}
                  />
                ) : (
                  <video
                    src={previewUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full select-none bg-black"
                    style={{ objectFit }}
                  />
                )}
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.02)_28%,rgba(0,0,0,0.55)_100%)]" />
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(159,207,255,0.18) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 24px)',
                }}
              />
              <motion.div
                className="absolute inset-y-0 w-[70%] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0)_100%)]"
                animate={reduceMotion ? undefined : { x: ['-120%', '210%'] }}
                transition={{
                  duration: 1.08,
                  delay: index * 0.05,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          )
        })}
      </div>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-full border border-white/12 bg-black/58 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/72 backdrop-blur-md">
        <span className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#9fcfff]" />
          Equal candidate cut
        </span>
        <span>{CLIP_SLICE_COUNT} panels</span>
      </div>
    </motion.div>
  )
}

function PanelReadyLoader({
  status,
}: {
  status: SplitVideoSources['status']
}) {
  const label = status === 'error' ? 'Split preview unavailable' : 'Preparing split reels'

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center pb-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#ff937d]/20 bg-black/72 px-3 py-1.5 text-[10px] font-medium tracking-[0.16em] text-white/84 shadow-[0_18px_34px_-24px_rgba(0,0,0,0.95)] backdrop-blur-md">
        {status !== 'error' ? (
          <InlineLoadingAnimation size={16} label={label} />
        ) : null}
        <span>{label}</span>
      </div>
    </div>
  )
}

function SplitPanelChrome({
  side,
  videoRef,
  isPlaying,
  onToggle,
}: {
  side: SplitPanelSide
  videoRef: React.RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  onToggle: () => void
}) {
  const displayTime = useSplitPanelClock(videoRef)

  return (
    <>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 inline-flex items-center rounded-full border border-white/12 bg-black/68 px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-white/82 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.95)] backdrop-blur-md">
        {formatSplitTimeLabel(displayTime)}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className="absolute bottom-3 right-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-black/72 text-white/88 shadow-[0_18px_30px_-22px_rgba(0,0,0,0.95)] backdrop-blur-md transition-colors hover:bg-black/84 hover:text-white"
        aria-label={isPlaying ? `Pause ${side} reel` : `Play ${side} reel`}
      >
        {isPlaying ? <Pause className="size-3 fill-current" /> : <Play className="size-3 fill-current" />}
      </button>
    </>
  )
}

function useSplitPanelClock(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [displayTime, setDisplayTime] = React.useState(0)

  React.useEffect(() => {
    const update = () => {
      setDisplayTime(videoRef.current?.currentTime ?? 0)
    }

    update()
    const interval = window.setInterval(update, 300)

    return () => window.clearInterval(interval)
  }, [videoRef])

  return displayTime
}

function SplitMedia({
  previewKind,
  previewUrl,
  title,
  videoRef,
  onReady,
  preload = 'metadata',
  mediaTransformStyle,
  className,
  style,
}: {
  previewKind: SplitPreviewMediaKind
  previewUrl: string
  title: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  onReady: () => void
  preload?: 'none' | 'metadata' | 'auto'
  mediaTransformStyle?: React.CSSProperties
  className: string
  style: React.CSSProperties
}) {
  if (previewKind === 'image') {
    return (
      <div className="absolute inset-0" style={mediaTransformStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={`${title} split preview`}
          className={className}
          style={style}
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div className="absolute inset-0" style={mediaTransformStyle}>
      <video
        ref={videoRef}
        src={previewUrl}
        muted
        playsInline
        controls={false}
        preload={preload}
        onLoadedMetadata={onReady}
        onLoadedData={onReady}
        onCanPlay={onReady}
        className={`pointer-events-none ${className}`}
        style={style}
      />
    </div>
  )
}
