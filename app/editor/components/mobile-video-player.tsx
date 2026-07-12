'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  Maximize,
  Minimize2,
  MoreVertical,
  Pause,
  Play,
  Settings,
  SunMedium,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { usePlayerGestures } from '@/lib/hooks/use-gestures'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import {
  formatPlayerTime,
  getProgressPercent,
  PLAYER_SPEEDS,
  useYoutubePlayer,
} from '@/lib/hooks/use-youtube-player'
import { cn } from '@/lib/utils'

type MobileVideoPlayerProps = {
  className?: string
  poster?: string
  src?: string | null
}

type SeekFeedbackDirection = 'forward' | 'backward' | null

export function MobileVideoPlayer({ className, poster, src }: MobileVideoPlayerProps) {
  const reduceMotion = useReducedMotion()
  const {
    adjustBrightness,
    adjustVolume,
    bindVideoEvents,
    brightnessLevel,
    brightnessOverlayValue,
    bufferedEnd,
    containerRef,
    currentTime,
    duration,
    isFullscreen,
    muted,
    pauseAutoHide,
    play,
    playbackRate,
    resumeAutoHide,
    seek,
    seekBy,
    setPlaybackRate,
    showCenterControl,
    showControls,
    showControlsNow,
    status,
    toggleFullscreen,
    toggleMuted,
    togglePlayback,
    videoRef,
    volumeOverlayValue,
  } = useYoutubePlayer(src)
  const [autoplayEnabled, setAutoplayEnabled] = React.useState(false)
  const [captionsEnabled, setCaptionsEnabled] = React.useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [isSurfaceScrubbing, setIsSurfaceScrubbing] = React.useState(false)
  const [isTimelineScrubbing, setIsTimelineScrubbing] = React.useState(false)
  const [seekFeedback, setSeekFeedback] = React.useState<SeekFeedbackDirection>(null)
  const progressRef = React.useRef<HTMLDivElement | null>(null)
  const seekFeedbackTimerRef = React.useRef<number | null>(null)

  const isPlaying = status === 'playing'
  const isWaiting = status === 'waiting'
  const isScrubbing = isSurfaceScrubbing || isTimelineScrubbing
  const playedPercent = getProgressPercent(currentTime, duration)
  const bufferedPercent = getProgressPercent(bufferedEnd, duration)

  const clearSeekFeedbackTimer = React.useCallback(() => {
    if (seekFeedbackTimerRef.current !== null) {
      window.clearTimeout(seekFeedbackTimerRef.current)
      seekFeedbackTimerRef.current = null
    }
  }, [])

  const showSeekFeedback = React.useCallback(
    (direction: Exclude<SeekFeedbackDirection, null>) => {
      setSeekFeedback(direction)
      clearSeekFeedbackTimer()
      seekFeedbackTimerRef.current = window.setTimeout(() => {
        setSeekFeedback(null)
      }, 650)
    },
    [clearSeekFeedbackTimer],
  )

  React.useEffect(() => {
    if (!autoplayEnabled || status !== 'ended') return
    seek(0)
    void play()
  }, [autoplayEnabled, play, seek, status])

  React.useEffect(() => {
    if (isSettingsOpen) {
      pauseAutoHide()
      showControlsNow(false)
      return
    }

    if (!isScrubbing) {
      resumeAutoHide()
    }
  }, [isScrubbing, isSettingsOpen, pauseAutoHide, resumeAutoHide, showControlsNow])

  React.useEffect(() => {
    return () => clearSeekFeedbackTimer()
  }, [clearSeekFeedbackTimer])

  const handleSingleTap = React.useCallback(() => {
    setIsSettingsOpen(false)
    showControlsNow(true)
    togglePlayback()
  }, [showControlsNow, togglePlayback])

  const handleDoubleTap = React.useCallback(
    (side: 'left' | 'right') => {
      const delta = side === 'right' ? 10 : -10
      setIsSettingsOpen(false)
      showControlsNow(false)
      seekBy(delta)
      showSeekFeedback(side === 'right' ? 'forward' : 'backward')
    },
    [seekBy, showControlsNow, showSeekFeedback],
  )

  const gestureHandlers = usePlayerGestures({
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    onDoubleTap: handleDoubleTap,
    onHorizontalScrub: (nextTime, done) => {
      pauseAutoHide()
      setIsSettingsOpen(false)
      setIsSurfaceScrubbing(!done)
      seek(nextTime)
      showControlsNow(false)
      if (done) {
        resumeAutoHide()
      }
    },
    onSingleTap: handleSingleTap,
    onVerticalSwipe: (kind, delta) => {
      pauseAutoHide()
      setIsSettingsOpen(false)
      showControlsNow(false)
      if (kind === 'brightness') {
        adjustBrightness(delta)
        return
      }
      adjustVolume(delta)
    },
  })

  const updateSeekFromClientX = React.useCallback(
    (clientX: number) => {
      const progress = progressRef.current
      if (!progress || duration <= 0) return

      const rect = progress.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      seek(ratio * duration)
    },
    [duration, seek],
  )

  const handleProgressPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      pauseAutoHide()
      setIsTimelineScrubbing(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      updateSeekFromClientX(event.clientX)
      showControlsNow(false)
    },
    [pauseAutoHide, showControlsNow, updateSeekFromClientX],
  )

  const handleProgressPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      updateSeekFromClientX(event.clientX)
    },
    [updateSeekFromClientX],
  )

  const handleProgressPointerEnd = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation()
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      setIsTimelineScrubbing(false)
      resumeAutoHide()
    },
    [resumeAutoHide],
  )

  const handleToggleFullscreen = React.useCallback(async () => {
    setIsSettingsOpen(false)
    showControlsNow(false)
    await toggleFullscreen()
  }, [showControlsNow, toggleFullscreen])

  const handlePlaybackRateChange = React.useCallback(
    (speed: number) => {
      setPlaybackRate(speed)
      setIsSettingsOpen(false)
      showControlsNow(false)
      resumeAutoHide()
    },
    [resumeAutoHide, setPlaybackRate, showControlsNow],
  )

  return (
    <section
      ref={containerRef}
      className={cn('relative aspect-video w-full overflow-hidden bg-black', className)}
      aria-label="Video preview player"
    >
      {src ? (
        <div className="absolute inset-0" style={{ filter: `brightness(${brightnessLevel})` }}>
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            controls={false}
            playsInline
            poster={poster}
            preload="metadata"
            src={src}
            {...bindVideoEvents}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      <div className="absolute inset-0" {...gestureHandlers} style={{ touchAction: 'none' }} />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2" aria-hidden="true" />

      {src ? null : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-white/72">
          Add source video
        </div>
      )}

      <AnimatePresence>
        {isWaiting ? (
          <motion.div
            className="absolute inset-0 z-10 grid place-items-center bg-black/18"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InlineLoadingAnimation size={40} label="Buffering video" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showCenterControl ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              onClick={handleSingleTap}
              className="pointer-events-auto grid size-16 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause className="size-8" aria-hidden="true" /> : <Play className="ml-1 size-8" aria-hidden="true" />}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {seekFeedback ? (
          <motion.div
            className={cn(
              'pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/45 px-5 py-3 text-xl font-semibold text-white backdrop-blur-sm',
              seekFeedback === 'forward' ? 'right-6' : 'left-6',
            )}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.16 }}
          >
            {seekFeedback === 'forward' ? '+10s' : '-10s'}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {brightnessOverlayValue !== null ? (
          <motion.div
            className="pointer-events-none absolute left-4 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full bg-black/48 px-3 py-4 text-white backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SunMedium className="size-5" aria-hidden="true" />
            <div className="relative h-28 w-2 overflow-hidden rounded-full bg-white/18">
              <div
                className="absolute inset-x-0 bottom-0 rounded-full bg-sky-400"
                style={{ height: `${Math.round(brightnessOverlayValue * 100)}%` }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {volumeOverlayValue !== null ? (
          <motion.div
            className="pointer-events-none absolute right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full bg-black/48 px-3 py-4 text-white backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {muted || volumeOverlayValue <= 0 ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
            <div className="relative h-28 w-2 overflow-hidden rounded-full bg-white/18">
              <div
                className="absolute inset-x-0 bottom-0 rounded-full bg-sky-400"
                style={{ height: `${Math.round(volumeOverlayValue * 100)}%` }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isSurfaceScrubbing ? (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-full bg-black/48 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showControls ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAutoplayEnabled((current) => !current)
                  showControlsNow(false)
                }}
                className={cn(
                  'flex h-8 items-center gap-2 rounded-full border border-white/12 px-3 text-[11px] font-medium text-white',
                  autoplayEnabled ? 'bg-white/15' : 'bg-black/20',
                )}
                aria-pressed={autoplayEnabled}
                aria-label="Toggle autoplay"
              >
                <span>Autoplay</span>
                <span
                  className={cn(
                    'relative h-4 w-7 rounded-full transition-colors',
                    autoplayEnabled ? 'bg-sky-400' : 'bg-white/25',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 size-3 rounded-full bg-white transition-transform',
                      autoplayEnabled ? 'translate-x-3.5' : 'translate-x-0.5',
                    )}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={() => showControlsNow(false)}
                className="grid size-9 place-items-center rounded-full bg-black/20 text-white"
                aria-label="More player actions"
              >
                <MoreVertical className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0">
              <div className="pointer-events-auto relative px-4 pb-3 pt-12">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-sm font-medium text-white">
                    {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        toggleMuted()
                        showControlsNow(false)
                      }}
                      className="grid size-9 place-items-center rounded-full text-white"
                      aria-label={muted ? 'Unmute video' : 'Mute video'}
                    >
                      {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCaptionsEnabled((current) => !current)
                        showControlsNow(false)
                      }}
                      className={cn(
                        'grid h-9 min-w-9 place-items-center rounded-full px-2 text-[11px] font-semibold tracking-[0.16em] text-white',
                        captionsEnabled && 'bg-white/12',
                      )}
                      aria-label="Toggle captions"
                      aria-pressed={captionsEnabled}
                    >
                      CC
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSettingsOpen((current) => !current)}
                        className="grid size-9 place-items-center rounded-full text-white"
                        aria-label="Playback settings"
                        aria-expanded={isSettingsOpen}
                      >
                        <Settings className="size-5" aria-hidden="true" />
                      </button>

                      <AnimatePresence>
                        {isSettingsOpen ? (
                          <motion.div
                            className="absolute bottom-11 right-0 w-36 overflow-hidden rounded-2xl bg-black/86 p-1.5 shadow-2xl backdrop-blur-sm"
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                          >
                            {PLAYER_SPEEDS.map((speed) => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => handlePlaybackRateChange(speed)}
                                className={cn(
                                  'flex h-9 w-full items-center justify-between rounded-xl px-3 text-sm text-white/80',
                                  playbackRate === speed && 'bg-sky-400/16 text-white',
                                )}
                              >
                                <span>{speed}x</span>
                                {playbackRate === speed ? <Check className="size-4" aria-hidden="true" /> : null}
                              </button>
                            ))}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleFullscreen()}
                      className="grid size-9 place-items-center rounded-full text-white"
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? <Minimize2 className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={progressRef}
                className="pointer-events-auto absolute inset-x-0 bottom-0 h-6 cursor-pointer touch-none"
                onPointerDown={handleProgressPointerDown}
                onPointerMove={handleProgressPointerMove}
                onPointerUp={handleProgressPointerEnd}
                onPointerCancel={handleProgressPointerEnd}
                role="slider"
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={currentTime}
                style={{ touchAction: 'none' }}
              >
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 overflow-hidden rounded-full bg-white/30 transition-[height]',
                    isScrubbing ? 'h-1.5' : 'h-1',
                  )}
                >
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${bufferedPercent}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-sky-400" style={{ width: `${playedPercent}%` }} />
                </div>

                <div
                  className={cn(
                    'absolute bottom-0 -translate-x-1/2 translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-[height,width,box-shadow,transform]',
                    isScrubbing ? 'size-4 shadow-[0_0_16px_rgba(56,189,248,0.75)]' : 'size-3',
                  )}
                  style={{ left: `${playedPercent}%` }}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
