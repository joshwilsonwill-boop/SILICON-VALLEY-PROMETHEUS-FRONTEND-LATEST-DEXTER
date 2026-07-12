'use client'

import * as React from 'react'
import { AnimatePresence, motion, useAnimationFrame, useMotionValue } from 'framer-motion'
import { Music, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import Image from 'next/image'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { chamberEase } from '@/lib/chamber-motion'
import { cn } from '@/lib/utils'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'

const musicDisplayFont = 'tracking-[-0.035em]'
const musicMetaFont = 'font-serif'

const formatTime = (timeInSeconds: number): string => {
  if (Number.isNaN(timeInSeconds)) return '00:00'
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = Math.floor(timeInSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

type MusicPlayerProps = {
  albumArt: string
  albumArtPosition?: string
  songTitle: string
  artistName: string
  audioSrc: string
  isPlaying?: boolean
  isMuted?: boolean
  seekRequest?: { time: number; token: number } | null
  onBufferingChange?: (isBuffering: boolean) => void
  onPlayingChange?: (nextPlaying: boolean) => void
  onProgressChange?: (progress: { currentTime: number; duration: number }) => void
  onPrevious?: (options: { shuffle: boolean }) => void
  onNext?: (options: { shuffle: boolean }) => void
  canPrevious?: boolean
  canNext?: boolean
  className?: string
}

export function MusicPlayer({
  albumArt,
  albumArtPosition = 'center',
  songTitle,
  artistName,
  audioSrc,
  isPlaying: isPlayingProp,
  isMuted = false,
  seekRequest = null,
  onBufferingChange,
  onPlayingChange,
  onProgressChange,
  onPrevious,
  onNext,
  canPrevious = false,
  canNext = false,
  className,
}: MusicPlayerProps) {
  const reduceMotion = useStableReducedMotion()
  const [internalIsPlaying, setInternalIsPlaying] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [isShuffle, setIsShuffle] = React.useState(false)
  const [isRepeat, setIsRepeat] = React.useState(false)
  const [isBuffering, setIsBuffering] = React.useState(false)
  const [albumArtFailed, setAlbumArtFailed] = React.useState(false)

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const progressBarRef = React.useRef<HTMLInputElement | null>(null)
  const rotation = useMotionValue(0)
  const isControlledPlaying = typeof isPlayingProp === 'boolean'
  const isPlaying = isControlledPlaying ? isPlayingProp : internalIsPlaying

  const setPlayingState = React.useCallback(
    (nextPlaying: boolean) => {
      if (!isControlledPlaying) {
        setInternalIsPlaying(nextPlaying)
      }

      onPlayingChange?.(nextPlaying)
    },
    [isControlledPlaying, onPlayingChange],
  )

  const setBufferingState = React.useCallback(
    (nextBuffering: boolean) => {
      setIsBuffering(nextBuffering)
      onBufferingChange?.(nextBuffering)
    },
    [onBufferingChange],
  )

  const syncProgressVisual = React.useCallback((time: number, totalDuration: number) => {
    if (!progressBarRef.current) return
    const progress = totalDuration > 0 ? (time / totalDuration) * 100 : 0
    progressBarRef.current.style.setProperty('--progress', `${progress}%`)
  }, [])

  React.useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setAlbumArtFailed(false)
    setBufferingState(false)
    syncProgressVisual(0, 0)
    if (!reduceMotion) {
      rotation.set((rotation.get() + 24) % 360)
    }
  }, [audioSrc, reduceMotion, rotation, setBufferingState, syncProgressVisual])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const setAudioData = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0
      setDuration(nextDuration)
      setCurrentTime(audio.currentTime)
      syncProgressVisual(audio.currentTime, nextDuration)
      onProgressChange?.({ currentTime: audio.currentTime, duration: nextDuration })
    }

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime)
      syncProgressVisual(audio.currentTime, audio.duration)
      onProgressChange?.({ currentTime: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 })
    }

    const handleEnded = () => {
      if (isRepeat) return
      setPlayingState(false)
    }

    const handleBufferingStart = () => setBufferingState(true)
    const handleBufferingEnd = () => setBufferingState(false)
    const handleAudioError = () => {
      setBufferingState(false)
      setPlayingState(false)
    }

    audio.addEventListener('loadedmetadata', setAudioData)
    audio.addEventListener('timeupdate', setAudioTime)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadstart', handleBufferingStart)
    audio.addEventListener('waiting', handleBufferingStart)
    audio.addEventListener('canplay', handleBufferingEnd)
    audio.addEventListener('playing', handleBufferingEnd)
    audio.addEventListener('error', handleAudioError)
    if (isPlaying) {
      setBufferingState(true)
      void audio.play().catch(() => {
        setBufferingState(false)
        setPlayingState(false)
      })
    } else {
      audio.pause()
      setBufferingState(false)
    }

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData)
      audio.removeEventListener('timeupdate', setAudioTime)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadstart', handleBufferingStart)
      audio.removeEventListener('waiting', handleBufferingStart)
      audio.removeEventListener('canplay', handleBufferingEnd)
      audio.removeEventListener('playing', handleBufferingEnd)
      audio.removeEventListener('error', handleAudioError)
    }
  }, [audioSrc, isPlaying, isRepeat, onProgressChange, setBufferingState, setPlayingState, syncProgressVisual])

  React.useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = isMuted
  }, [isMuted])

  React.useEffect(() => {
    if (!audioRef.current || !seekRequest) return
    audioRef.current.currentTime = seekRequest.time
    setCurrentTime(seekRequest.time)
    syncProgressVisual(seekRequest.time, duration)
    onProgressChange?.({ currentTime: seekRequest.time, duration })
  }, [duration, onProgressChange, seekRequest, syncProgressVisual])

  useAnimationFrame((_, delta) => {
    if (reduceMotion) return
    const speed = isPlaying ? 0.013 : 0.0028
    rotation.set((rotation.get() + delta * speed) % 360)
  })

  const handleSeek = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!audioRef.current) return
      const nextTime = Number(event.target.value)
      audioRef.current.currentTime = nextTime
      setCurrentTime(nextTime)
      syncProgressVisual(nextTime, duration)
      onProgressChange?.({ currentTime: nextTime, duration })
    },
    [duration, onProgressChange, syncProgressVisual],
  )

  const handlePrevious = React.useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      syncProgressVisual(0, duration)
      onProgressChange?.({ currentTime: 0, duration })
      return
    }

    onPrevious?.({ shuffle: isShuffle })
  }, [duration, isShuffle, onPrevious, onProgressChange, syncProgressVisual])

  const handleNext = React.useCallback(() => {
    onNext?.({ shuffle: isShuffle })
  }, [isShuffle, onNext])

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col items-center overflow-hidden rounded-[26px] bg-black px-5 py-5 text-white sm:px-6',
        className,
      )}
    >
      <style>{`
        .music-player-progress {
          --progress: 0%;
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 2px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
          background: rgba(255,255,255,0.18);
          background-image: linear-gradient(rgba(255,255,255,0.96), rgba(255,255,255,0.96));
          background-size: var(--progress) 100%;
          background-repeat: no-repeat;
        }

        .music-player-progress::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          margin-top: -6px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.96);
          background: rgba(255,255,255,0.96);
          box-shadow: 0 4px 18px rgba(0,0,0,0.42);
        }

        .music-player-progress::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.96);
          background: rgba(255,255,255,0.96);
          box-shadow: 0 4px 18px rgba(0,0,0,0.42);
        }
      `}</style>

      <audio ref={audioRef} src={audioSrc} loop={isRepeat} preload="metadata" />

      <div className="relative mb-4 flex min-h-[clamp(9.5rem,28vh,13rem)] shrink items-center justify-center">
        <motion.div
          key={albumArt}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
          animate={reduceMotion ? undefined : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: chamberEase }}
          style={reduceMotion ? undefined : { rotate: rotation }}
          className="relative z-10 h-[clamp(8.75rem,24vh,11rem)] w-[clamp(8.75rem,24vh,11rem)] overflow-hidden rounded-full border border-white/8 shadow-[0_20px_42px_-30px_rgba(0,0,0,0.98)]"
        >
          {albumArtFailed ? (
            <div className="grid h-full w-full place-items-center bg-white/[0.04] text-white/24">
              <Music className="size-12" strokeWidth={1.5} />
            </div>
          ) : (
            <Image
              src={albumArt}
              alt={`${songTitle} album art`}
              fill
              sizes="192px"
              priority
              className="object-cover"
              onError={() => setAlbumArtFailed(true)}
              style={{ objectPosition: albumArtPosition }}
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_20%,rgba(0,0,0,0.4)_100%)]" />
          <div className="absolute inset-[1px] rounded-full border border-white/10" />
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black shadow-[0_0_0_8px_rgba(0,0,0,0.92)]" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${songTitle}-${artistName}`}
          initial={reduceMotion ? false : { opacity: 0, y: 8, filter: 'blur(6px)' }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: chamberEase }}
          className="w-full min-w-0 max-w-full overflow-hidden px-1"
        >
          <div className="min-w-0 text-center">
            <h2
              className={cn(musicDisplayFont, 'mx-auto max-w-full truncate text-[1.08rem] font-normal text-white sm:text-[1.18rem]')}
              title={songTitle}
            >
              {songTitle}
            </h2>
            <p
              className={cn(musicMetaFont, 'mx-auto mt-1 max-w-full truncate text-[0.82rem] font-normal text-white/72')}
              title={artistName}
            >
              {artistName}
            </p>
            <div aria-live="polite" className="mt-2 flex min-h-4 items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-white/38">
              {isBuffering && isPlaying ? (
                <>
                  <InlineLoadingAnimation size={12} label="Buffering track" />
                  <span>Buffering...</span>
                </>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 w-full max-w-[18rem]">
        <div className="mb-5 flex items-center gap-x-3">
          <span className="w-12 text-left font-mono text-[11px] text-white/78">{formatTime(currentTime)}</span>
          <input
            ref={progressBarRef}
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="music-player-progress flex-grow"
          />
          <span className="w-12 text-right font-mono text-[11px] text-white/78">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-6">
          <motion.button
            type="button"
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            onClick={() => setIsShuffle((value) => !value)}
            className={cn(
              'grid h-8 w-8 place-items-center text-white transition-colors',
              isShuffle ? 'text-white' : 'text-white/72 hover:text-white',
            )}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="size-[17px]" />
          </motion.button>

          <motion.button
            type="button"
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            onClick={handlePrevious}
            disabled={!canPrevious}
            className="grid h-9 w-9 place-items-center text-white transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous track"
          >
            <SkipBack className="size-6" strokeWidth={1.85} />
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setPlayingState(!isPlaying)}
            whileHover={reduceMotion ? undefined : { scale: 1.04 }}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-[box-shadow,background-color] duration-200 ease-out"
            aria-label={isPlaying ? 'Pause track' : 'Play track'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isPlaying ? 'pause' : 'play'}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                className="inline-flex items-center justify-center"
              >
                {isPlaying ? <Pause className="size-7" strokeWidth={1.9} /> : <Play className="ml-0.5 size-7" strokeWidth={1.9} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <motion.button
            type="button"
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            onClick={handleNext}
            disabled={!canNext}
            className="grid h-9 w-9 place-items-center text-white transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Next track"
          >
            <SkipForward className="size-6" strokeWidth={1.85} />
          </motion.button>

          <motion.button
            type="button"
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            onClick={() => setIsRepeat((value) => !value)}
            className={cn(
              'grid h-8 w-8 place-items-center text-white transition-colors',
              isRepeat ? 'text-white' : 'text-white/72 hover:text-white',
            )}
            aria-label="Toggle repeat"
          >
            <Repeat className="size-[17px]" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
