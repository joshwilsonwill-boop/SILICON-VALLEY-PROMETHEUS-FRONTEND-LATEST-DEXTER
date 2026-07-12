'use client'

import * as React from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Check, Music, Pause, Play, Plus, Search, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

import { LuxuryVignette } from '@/components/editor/luxury-vignette'
import { SoundtrackCard } from '@/components/editor/soundtrack-card'
import { TextReveal } from '@/components/editor/text-reveal'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { MusicPlayer } from '@/components/ui/music-player'
import { Button } from '@/components/ui/button'
import { chamberEase, chamberSpring } from '@/lib/chamber-motion'
import type { MusicRecommendation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'

const rowHoverSpring = {
  stiffness: 240,
  damping: 22,
  mass: 0.58,
}

type SelectedSongDisplay = {
  id: string
  title: string
  metadataLine: string
  artwork: string
  artworkPosition: string
  audioSrc: string
}

function buildParallaxRange(reduceMotion: boolean, output: [number, number]) {
  return reduceMotion ? [0, 0] : output
}

function buildSelectedSongDisplay(track: MusicRecommendation): SelectedSongDisplay {
  const sourceLabel = track.sourcePlatform === 'online' ? 'Streaming' : 'Prometheus Audio'
  const metadataLine = [track.artist, track.subtitle || sourceLabel, track.genre].filter(Boolean).join(' / ')

  return {
    id: track.id,
    title: track.title,
    metadataLine,
    artwork: track.coverArtUrl,
    artworkPosition: track.coverArtPosition ?? 'center',
    audioSrc: track.previewUrl,
  }
}

function PhysicsMusicDeck({
  activeTrackId,
  onFocusTrack,
  onPlayPause,
  onSelectTrack,
  playingTrackId,
  reduceMotion,
  selectedTrackId,
  tracks,
}: {
  activeTrackId: string | null
  onFocusTrack: (track: MusicRecommendation) => void
  onPlayPause: (track: MusicRecommendation) => void
  onSelectTrack: (track: MusicRecommendation) => void
  playingTrackId: string | null
  reduceMotion: boolean
  selectedTrackId: string | null
  tracks: MusicRecommendation[]
}) {
  const CARD_WIDTH = 164
  const CARD_GAP = 14
  const step = CARD_WIDTH + CARD_GAP
  const maxDrag = Math.max(0, (tracks.length - 1) * step)
  const activeIndex = Math.max(0, tracks.findIndex((track) => track.id === activeTrackId))
  const x = useMotionValue(-activeIndex * step)
  const springX = useSpring(x, { stiffness: 118, damping: 36, mass: 1.18 })
  const wheelCooldownRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    x.stop()
    x.set(-activeIndex * step)
  }, [activeIndex, step, x])

  React.useEffect(() => {
    return () => {
      if (wheelCooldownRef.current !== null) {
        window.clearTimeout(wheelCooldownRef.current)
        wheelCooldownRef.current = null
      }
    }
  }, [])

  const settleTo = React.useCallback(
    (nextIndex: number) => {
      const clampedIndex = Math.min(Math.max(nextIndex, 0), Math.max(0, tracks.length - 1))
      const nextTrack = tracks[clampedIndex]
      x.set(-clampedIndex * step)
      if (nextTrack) {
        onFocusTrack(nextTrack)
      }
    },
    [onFocusTrack, step, tracks, x],
  )

  if (!tracks.length) return null

  return (
    <div className="relative h-[15.25rem] overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.012)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-28"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.26) 0.7px, rgba(255,255,255,0) 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 84%)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(159,246,227,0.56)_48%,rgba(255,255,255,0)_100%)]" />

      <motion.div
        className="relative flex h-full cursor-grab items-center active:cursor-grabbing"
        style={{ x: springX, perspective: 900 }}
        drag={reduceMotion ? false : 'x'}
        dragMomentum={false}
        dragElastic={0.045}
        dragConstraints={{ left: -maxDrag, right: 0 }}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) return
          event.preventDefault()
          if (wheelCooldownRef.current !== null) return
          const direction = event.deltaY + event.deltaX > 0 ? 1 : -1
          settleTo(activeIndex + direction)
          wheelCooldownRef.current = window.setTimeout(() => {
            wheelCooldownRef.current = null
          }, 320)
        }}
        onDragEnd={(_, info) => {
          const projected = x.get() + info.velocity.x * 0.055
          settleTo(Math.round(Math.abs(projected) / step))
        }}
      >
        {tracks.map((track, index) => {
          const distance = index - activeIndex
          const selected = selectedTrackId === track.id
          const playing = playingTrackId === track.id
          return (
            <motion.button
              key={track.id}
              type="button"
              aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
              onClick={() => onPlayPause(track)}
              className="group relative mr-3.5 h-[13rem] w-[10.25rem] shrink-0 overflow-hidden rounded-[24px] border border-white/12 bg-black text-left shadow-[0_28px_50px_-34px_rgba(0,0,0,0.98)] outline-none"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      rotateZ: Math.max(-10, Math.min(10, distance * 3.5)),
                      y: Math.abs(distance) < 0.5 ? -7 : Math.min(18, Math.abs(distance) * 5),
                      scale: Math.abs(distance) < 0.5 ? 1 : 0.92,
                      opacity: Math.abs(distance) > 3 ? 0.42 : 1,
                    }
              }
              transition={{ type: 'spring', stiffness: 150, damping: 30, mass: 0.92 }}
              whileHover={reduceMotion ? undefined : { y: -10, scale: Math.abs(distance) < 0.5 ? 1.03 : 0.96 }}
            >
              <Image
                src={track.coverArtUrl}
                alt={track.title}
                fill
                sizes="164px"
                draggable={false}
                className="object-cover"
                style={{ objectPosition: track.coverArtPosition ?? 'center' }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.02)_28%,rgba(0,0,0,0.78)_100%)]" />
              <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0)_66%)]" />
              <div className="absolute left-3 top-3 rounded-full border border-white/12 bg-black/34 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60 backdrop-blur-md">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="absolute inset-x-3 bottom-3">
                <div className="line-clamp-2 text-sm font-semibold leading-4 text-white">{track.title}</div>
                <div className="mt-1 truncate text-[11px] text-white/50">{track.artist}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={cn(
                      'grid size-8 place-items-center rounded-full border transition-colors',
                      playing ? 'border-white bg-white text-black' : 'border-white/16 bg-black/34 text-white/72',
                    )}
                    onClick={(event) => {
                      event.stopPropagation()
                      onPlayPause(track)
                    }}
                  >
                    {playing ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
                  </span>
                  <span
                    className={cn(
                      'grid size-8 place-items-center rounded-full border transition-colors',
                      selected ? 'border-[#9ff6e3]/34 bg-[#9ff6e3]/12 text-white' : 'border-white/16 bg-black/34 text-white/72',
                    )}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectTrack(track)
                    }}
                  >
                    {selected ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  </span>
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}

function SongRailItem({
  index,
  isFocused,
  isSelected,
  isPlaying,
  onFocus,
  onPlayPause,
  onSelect,
  reduceMotion,
  track,
}: {
  index: number
  isFocused: boolean
  isSelected: boolean
  isPlaying: boolean
  onFocus: () => void
  onPlayPause: () => void
  onSelect: () => void
  reduceMotion: boolean
  track: MusicRecommendation
}) {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const previousSelectedRef = React.useRef(isSelected)
  const [selectionBurst, setSelectionBurst] = React.useState(0)

  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], buildParallaxRange(reduceMotion, [2.4, -2.4])), rowHoverSpring)
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], buildParallaxRange(reduceMotion, [-3, 3])), rowHoverSpring)
  const bodyX = useSpring(useTransform(pointerX, [-0.5, 0.5], buildParallaxRange(reduceMotion, [-1.3, 1.3])), rowHoverSpring)
  const bodyY = useSpring(useTransform(pointerY, [-0.5, 0.5], buildParallaxRange(reduceMotion, [-1, 1])), rowHoverSpring)
  const artX = useSpring(useTransform(pointerX, [-0.5, 0.5], buildParallaxRange(reduceMotion, [-2.2, 2.2])), rowHoverSpring)
  const artY = useSpring(useTransform(pointerY, [-0.5, 0.5], buildParallaxRange(reduceMotion, [-1.8, 1.8])), rowHoverSpring)

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return

      const rect = event.currentTarget.getBoundingClientRect()
      pointerX.set((event.clientX - rect.left) / rect.width - 0.5)
      pointerY.set((event.clientY - rect.top) / rect.height - 0.5)
    },
    [pointerX, pointerY, reduceMotion],
  )

  const handlePointerLeave = React.useCallback(() => {
    pointerX.set(0)
    pointerY.set(0)
  }, [pointerX, pointerY])

  React.useEffect(() => {
    if (isSelected && !previousSelectedRef.current) {
      setSelectionBurst((value) => value + 1)
    }

    previousSelectedRef.current = isSelected
  }, [isSelected])

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(8px)' }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(5px)' }}
      transition={reduceMotion ? undefined : { ...chamberSpring, delay: 0.04 + index * 0.03 }}
      whileHover={reduceMotion ? undefined : { scale: 1.008, y: -1.5 }}
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onFocus()
        }
      }}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      style={reduceMotion ? undefined : { x: bodyX, y: bodyY, rotateX, rotateY, transformPerspective: 1100 }}
      className={cn(
        'group relative mb-2 flex items-center gap-2.5 overflow-hidden rounded-[22px] border px-2.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-220 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none',
        isSelected
          ? 'border-[#84dfff]/30 bg-[rgba(22,28,40,0.88)] shadow-[0_14px_30px_-28px_rgba(113,214,255,0.38),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : isFocused
            ? 'border-white/16 bg-[rgba(22,26,36,0.82)] shadow-[0_16px_34px_-30px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.07)]'
            : 'border-white/10 bg-[rgba(18,21,30,0.72)] shadow-[0_14px_28px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/14 hover:bg-[rgba(21,25,35,0.82)]',
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0)_28%,rgba(0,0,0,0.22)_100%)]" />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-[1px] rounded-[21px] border',
          isSelected ? 'border-[#b6efff]/18' : 'border-white/5',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-220',
          isSelected
            ? 'opacity-100 bg-[radial-gradient(circle_at_12%_50%,rgba(117,214,255,0.18)_0%,rgba(117,214,255,0.06)_24%,rgba(117,214,255,0)_54%)]'
            : 'group-hover:opacity-100 bg-[radial-gradient(circle_at_14%_26%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_40%)]',
        )}
      />

      <div className="focus-ring-glow relative z-10 flex min-w-0 flex-1 items-center gap-3 rounded-[18px] pr-1">
        <motion.div
          style={reduceMotion ? undefined : { x: artX, y: artY }}
          className="relative h-[3.5rem] w-[3.5rem] shrink-0 overflow-hidden rounded-[16px] border border-white/8 bg-black/30 shadow-[0_12px_28px_-20px_rgba(0,0,0,0.95)]"
        >
          <Image
            src={track.coverArtUrl}
            alt={track.title}
            fill
            sizes="56px"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="object-cover"
            style={{ objectPosition: track.coverArtPosition ?? 'center' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_34%,rgba(0,0,0,0.28)_100%)]" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.98rem] font-medium tracking-[-0.025em] text-white">{track.title}</div>
          <div className="mt-0.5 truncate text-[0.82rem] text-white/46">{track.artist}</div>
        </div>
      </div>

      <motion.button
        type="button"
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={(event) => {
          event.stopPropagation()
          onPlayPause()
        }}
        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        className={cn(
          'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-[border-color,background-color,color] duration-200',
          isPlaying
            ? 'border-white/22 bg-white text-black'
            : 'border-white/10 bg-white/[0.03] text-white/76 hover:border-white/18 hover:bg-white/[0.08] hover:text-white',
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={isPlaying ? `pause-${track.id}` : `play-${track.id}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: chamberEase }}
            className="inline-flex items-center justify-center"
          >
            {isPlaying ? <Pause className="size-[17px]" strokeWidth={1.9} /> : <Play className="ml-0.5 size-[17px]" strokeWidth={1.9} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <motion.button
        type="button"
        aria-label={isSelected ? `${track.title} selected for this video` : `Add ${track.title} to this video`}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: 2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        data-slot="button"
        style={{ ['--button-glow' as string]: isSelected ? '127 242 255' : '255 255 255' }}
        className={cn(
          'relative z-10 grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[16px] border backdrop-blur-xl transition-[background-color,border-color,color,box-shadow] duration-220',
          isSelected
            ? 'border-[#86e7ff]/32 bg-[rgba(74,121,170,0.24)] text-white shadow-[0_14px_24px_-22px_rgba(101,213,255,0.32)]'
            : 'border-white/10 bg-white/[0.06] text-white/64 hover:border-white/16 hover:bg-white/[0.1] hover:text-white',
        )}
      >
        <AnimatePresence>
          {selectionBurst > 0 && isSelected ? (
            <motion.span
              key={`pulse-${selectionBurst}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: [0, 0.36, 0], scale: [0.7, 1.2, 1.34] }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.46, ease: chamberEase }}
              className="pointer-events-none absolute inset-[-3px] rounded-[18px] border border-[#8ce7ff]/32"
            />
          ) : null}
        </AnimatePresence>
        <span aria-hidden className="pointer-events-none absolute inset-[1px] rounded-[15px] bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_34%,rgba(255,255,255,0)_100%)]" />
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={isSelected ? `selected-${track.id}` : `add-${track.id}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.78, rotate: -14 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72, rotate: 18 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: chamberEase }}
            className="inline-flex items-center justify-center"
          >
            {isSelected ? (
              <Check className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  )
}

type CatalogApiTrack = {
  id: string
  title: string
  artist: string | null
  album?: string
  category: string
  genreTags: string[]
  moodTags: string[]
  durationSec?: number
  audioPreviewUrl?: string
  thumbnailUrl?: string
}

type CatalogApiResponse = {
  tracks?: CatalogApiTrack[]
  total?: number
  limit?: number
  offset?: number
}

type MusicMatchResponse = {
  matchedTrackIds?: string[]
  reasoningSummary?: string
  source?: 'groq' | 'heuristic'
}

const FALLBACK_COVER_ART = '/style-previews/dark-cinematic-1.jpg'
const CATALOG_PAGE_SIZE = 200
const INITIAL_VISIBLE_TRACKS = 50
const VISIBLE_TRACK_INCREMENT = 50

function mapCatalogApiTrack(track: CatalogApiTrack): MusicRecommendation {
  const genre = track.genreTags[0] ?? track.category ?? 'Soundtrack'
  const artist = track.artist?.trim() || 'Unknown Artist'

  return {
    id: track.id,
    title: track.title,
    subtitle: track.album || track.category,
    description: [track.album, track.category, track.genreTags.join(' ')].filter(Boolean).join(' '),
    album: track.album,
    artist,
    producer: 'Prometheus',
    genre,
    bpm: 100,
    vibeTags: [...track.genreTags, ...track.moodTags].filter(Boolean),
    coverArtUrl: track.thumbnailUrl || FALLBACK_COVER_ART,
    coverArtPosition: 'center',
    previewUrl: track.audioPreviewUrl ?? `/api/music/preview?trackId=${encodeURIComponent(track.id)}`,
    reason: 'Loaded from the Prometheus music catalog.',
    mood: 'cinematic',
    energy: 'medium',
    sourcePlatform: 'local',
    durationSec: track.durationSec ?? 0,
  }
}

function NowPlayingBar({
  currentTime,
  duration,
  isBuffering,
  isMuted,
  isPlaying,
  onMuteToggle,
  onPlayPause,
  onSeek,
  track,
}: {
  currentTime: number
  duration: number
  isBuffering: boolean
  isMuted: boolean
  isPlaying: boolean
  onMuteToggle: () => void
  onPlayPause: () => void
  onSeek: (nextTime: number) => void
  track: MusicRecommendation | null
}) {
  const [artBroken, setArtBroken] = React.useState(false)

  React.useEffect(() => {
    setArtBroken(false)
  }, [track?.id, track?.coverArtUrl])

  if (!track) return null

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  return (
    <div className="absolute inset-x-4 bottom-4 z-30 glass-panel border-white/10 bg-abyss/80 p-3 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-void">
          {artBroken || !track.coverArtUrl ? (
            <div className="grid h-full w-full place-items-center text-white/20">
              <Music className="size-5" />
            </div>
          ) : (
            <Image
              src={track.coverArtUrl || FALLBACK_COVER_ART}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
              onError={() => setArtBroken(true)}
              style={{ objectPosition: track.coverArtPosition ?? 'center' }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-tight text-white">{track.title}</div>
          <div className="truncate text-[11px] uppercase tracking-widest text-white/40 font-bold">
            {isBuffering && isPlaying ? 'Buffering' : track.artist}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPlayPause}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-blue text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95"
          >
            {isBuffering && isPlaying ? (
              <InlineLoadingAnimation size={16} label={`Buffering ${track.title}`} />
            ) : isPlaying ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="ml-0.5 size-4 fill-current" />
            )}
          </button>
          
          <button
            type="button"
            onClick={onMuteToggle}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-white/40 transition-colors hover:text-white"
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          if (duration <= 0) return
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
          onSeek(ratio * duration)
        }}
        className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5"
      >
        <span className="block h-full rounded-full bg-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
      </button>
    </div>
  )
}


export function MusicTabPanel({
  tracks,
  projectTitle,
  selectedTrackId,
  onSelectTrack,
  variant = 'desktop',
}: {
  tracks: MusicRecommendation[]
  projectTitle: string
  selectedTrackId: string | null
  onSelectTrack: (track: MusicRecommendation) => void
  variant?: 'desktop' | 'mobile'
}) {
  const reduceMotion = useStableReducedMotion()
  const [catalogTracks, setCatalogTracks] = React.useState<MusicRecommendation[]>([])
  const [catalogLoading, setCatalogLoading] = React.useState(false)
  const [catalogReady, setCatalogReady] = React.useState(false)
  const [localSelectedTrackId, setLocalSelectedTrackId] = React.useState<string | null>(selectedTrackId ?? tracks[0]?.id ?? null)
  const [focusedTrackId, setFocusedTrackId] = React.useState<string | null>(selectedTrackId ?? tracks[0]?.id ?? null)
  const [playingTrackId, setPlayingTrackId] = React.useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = React.useState<Set<string>>(() => new Set())
  const [searchQuery, setSearchQuery] = React.useState('')
  const [visibleTrackCount, setVisibleTrackCount] = React.useState(INITIAL_VISIBLE_TRACKS)
  const [brokenArtworkIds, setBrokenArtworkIds] = React.useState<Record<string, true>>({})
  const [isMuted, setIsMuted] = React.useState(false)
  const [isAutoMatching, setIsAutoMatching] = React.useState(false)
  const [isPlayerBuffering, setIsPlayerBuffering] = React.useState(false)
  const [playerProgress, setPlayerProgress] = React.useState({ currentTime: 0, duration: 0 })
  const [seekRequest, setSeekRequest] = React.useState<{ time: number; token: number } | null>(null)

  React.useEffect(() => {
    let disposed = false

    async function loadCatalog() {
      setCatalogLoading(true)
      try {
        const nextTracks: MusicRecommendation[] = []
        let offset = 0
        let total = Number.POSITIVE_INFINITY

        while (!disposed && offset < total) {
          const response = await fetch(`/api/music/catalog?limit=${CATALOG_PAGE_SIZE}&offset=${offset}&includeUnsafe=true`, { cache: 'no-store' })
          if (!response.ok) throw new Error('Unable to load music catalog')
          const data = (await response.json()) as CatalogApiResponse
          const pageTracks = Array.isArray(data.tracks) ? data.tracks.map(mapCatalogApiTrack) : []
          nextTracks.push(...pageTracks)

          total = typeof data.total === 'number' && Number.isFinite(data.total) ? data.total : nextTracks.length
          const nextOffset = offset + (typeof data.limit === 'number' && data.limit > 0 ? data.limit : pageTracks.length)
          if (!pageTracks.length || nextOffset <= offset) break
          offset = nextOffset
        }

        if (!disposed) {
          setCatalogTracks(nextTracks)
          setCatalogReady(true)
        }
      } catch (error) {
        if (!disposed) {
          setCatalogTracks([])
          setCatalogReady(true)
          toast.error(error instanceof Error ? error.message : 'Unable to load music catalog')
        }
      } finally {
        if (!disposed) setCatalogLoading(false)
      }
    }

    void loadCatalog()

    return () => {
      disposed = true
    }
  }, [])

  const displayTracks = React.useMemo(() => {
    const sourceTracks = catalogReady ? catalogTracks : []
    const seen = new Set<string>()
    return sourceTracks.filter((track) => {
      if (seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
  }, [catalogReady, catalogTracks])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredTracks = React.useMemo(() => {
    if (!normalizedQuery) return displayTracks
    return displayTracks.filter((track) => {
      const title = track.title.toLowerCase()
      const artist = track.artist.toLowerCase()

      return title.includes(normalizedQuery) || artist.includes(normalizedQuery)
    })
  }, [displayTracks, normalizedQuery])
  const visibleTracks = React.useMemo(() => filteredTracks.slice(0, visibleTrackCount), [filteredTracks, visibleTrackCount])

  React.useEffect(() => {
    setVisibleTrackCount(INITIAL_VISIBLE_TRACKS)
  }, [normalizedQuery])

  React.useEffect(() => {
    const trackIds = new Set(displayTracks.map((track) => track.id))
    if (!trackIds.size) {
      setLocalSelectedTrackId(null)
      setFocusedTrackId(null)
      return
    }

    const fallbackTrackId = selectedTrackId && trackIds.has(selectedTrackId) ? selectedTrackId : displayTracks[0]?.id ?? null
    setLocalSelectedTrackId((current) => (current && trackIds.has(current) ? current : fallbackTrackId))
    setFocusedTrackId((current) => (current && trackIds.has(current) ? current : fallbackTrackId))
  }, [displayTracks, selectedTrackId])

  const selectedTrack = React.useMemo(
    () => displayTracks.find((track) => track.id === localSelectedTrackId) ?? displayTracks.find((track) => track.id === selectedTrackId) ?? null,
    [displayTracks, localSelectedTrackId, selectedTrackId],
  )
  const focusedTrack = React.useMemo(
    () => filteredTracks.find((track) => track.id === focusedTrackId) ?? selectedTrack ?? filteredTracks[0] ?? displayTracks[0] ?? null,
    [displayTracks, filteredTracks, focusedTrackId, selectedTrack],
  )
  const activeTrack = selectedTrack ?? focusedTrack
  const selectedSong = React.useMemo(() => (activeTrack ? buildSelectedSongDisplay(activeTrack) : null), [activeTrack])
  const currentPlayerTrack = React.useMemo(
    () => displayTracks.find((track) => track.id === playingTrackId) ?? selectedTrack ?? null,
    [displayTracks, playingTrackId, selectedTrack],
  )

  const handleTrackFocus = React.useCallback(
    (track: MusicRecommendation) => {
      setLocalSelectedTrackId(track.id)
      setFocusedTrackId(track.id)
      setPlayingTrackId((current) => (current && current !== track.id ? null : current))
      onSelectTrack(track)
    },
    [onSelectTrack],
  )

  const handleTrackActivate = React.useCallback(
    (track: MusicRecommendation) => {
      setLocalSelectedTrackId(track.id)
      setFocusedTrackId(track.id)
      setPlayingTrackId(track.id)
      onSelectTrack(track)
    },
    [onSelectTrack],
  )

  const handleTrackPlayPause = React.useCallback(
    (track: MusicRecommendation) => {
      setLocalSelectedTrackId(track.id)
      setFocusedTrackId(track.id)
      onSelectTrack(track)
      setPlayingTrackId((current) => (current === track.id ? null : track.id))
    },
    [onSelectTrack],
  )

  const handlePlayerStep = React.useCallback(
    (direction: 'previous' | 'next', options: { shuffle: boolean }) => {
      const playlist = filteredTracks.length ? filteredTracks : displayTracks
      const governingTrack = currentPlayerTrack
      if (!playlist.length || !governingTrack) return

      const nextTrack = options.shuffle && playlist.length > 1
        ? playlist.filter((track) => track.id !== governingTrack.id)[Math.floor(Math.random() * (playlist.length - 1))]
        : playlist[(Math.max(0, playlist.findIndex((track) => track.id === governingTrack.id)) + (direction === 'next' ? 1 : -1) + playlist.length) % playlist.length]

      if (!nextTrack) return
      setLocalSelectedTrackId(nextTrack.id)
      setFocusedTrackId(nextTrack.id)
      setPlayingTrackId((current) => (current ? nextTrack.id : current))
      onSelectTrack(nextTrack)
    },
    [currentPlayerTrack, displayTracks, filteredTracks, onSelectTrack],
  )

  const toggleMultiSelect = React.useCallback((trackId: string) => {
    setSelectedTrackIds((current) => {
      const next = new Set(current)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }, [])

  const handleAutoMatch = React.useCallback(async () => {
    const trackIds = Array.from(selectedTrackIds)
    if (!trackIds.length) return

    setIsAutoMatching(true)
    try {
      const response = await fetch('/api/music/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds, projectTitle }),
      })
      if (!response.ok) throw new Error('Unable to run AI Auto-Match')
      const data = (await response.json()) as MusicMatchResponse
      const matchedTrackIds = Array.isArray(data.matchedTrackIds)
        ? data.matchedTrackIds.filter((trackId): trackId is string => typeof trackId === 'string' && trackId.length > 0)
        : []
      const topMatch = matchedTrackIds.length ? displayTracks.find((track) => track.id === matchedTrackIds[0]) ?? null : null

      if (matchedTrackIds.length) {
        setSelectedTrackIds(new Set(matchedTrackIds))
      }

      if (topMatch) {
        handleTrackFocus(topMatch)
      }

      toast.success(topMatch ? `AI matched ${topMatch.title} as the top fit` : `AI ranked ${trackIds.length} selected tracks`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to run AI Auto-Match')
    } finally {
      setIsAutoMatching(false)
    }
  }, [displayTracks, handleTrackFocus, projectTitle, selectedTrackIds])

  if (!catalogReady || (catalogLoading && !displayTracks.length)) {
    return (
      <section className="premium-ambient-panel premium-vignette-surface flex w-full max-w-[1060px] self-center rounded-[30px] px-5 py-5 shadow-[0_28px_64px_-38px_rgba(0,0,0,0.95)]">
        <LuxuryVignette tone="music" />
        <div className="relative z-10 flex min-h-[220px] w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <InlineLoadingAnimation size={72} label="Loading music catalog" />
          <p className="text-sm text-white/52">Preparing Cloudflare soundtrack imagery.</p>
        </div>
      </section>
    )
  }

  if (!displayTracks.length) {
    return (
      <section className="premium-ambient-panel premium-vignette-surface flex w-full max-w-[1060px] self-center rounded-[30px] px-5 py-5 shadow-[0_28px_64px_-38px_rgba(0,0,0,0.95)]">
        <LuxuryVignette tone="music" />
        <div className="relative z-10">
          <TextReveal as="div" text="Music" className="text-[11px] uppercase tracking-[0.22em] text-white/56" />
          <TextReveal as="div" text="Soundtrack options will appear here" delay={0.08} className="editor-display-soft mt-4 text-lg text-white" />
          <TextReveal as="p" text="Prometheus will surface the song picker once the edit context is ready." delay={0.12} className="mt-2 max-w-[36rem] text-sm leading-6 text-white/52" />
        </div>
      </section>
    )
  }

  if (variant === 'mobile') {
    return (
      <motion.section
        key="mobile-editor-music-tab-panel"
        aria-label={`${projectTitle} mobile soundtrack selector`}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: chamberEase }}
        className="premium-ambient-panel premium-vignette-surface editorial-light-effect relative flex h-full min-h-[34rem] w-full flex-col overflow-hidden rounded-[24px] border border-white/8 bg-black pb-28"
      >
        <style>{`
          @keyframes music-eq {
            from { transform: scaleY(0.38); opacity: 0.58; }
            to { transform: scaleY(1); opacity: 1; }
          }
        `}</style>
        <LuxuryVignette tone="music" />

        {selectedSong ? (
          <div className="pointer-events-none absolute -left-16 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
            <MusicPlayer
              albumArt={selectedSong.artwork || FALLBACK_COVER_ART}
              albumArtPosition={selectedSong.artworkPosition}
              songTitle={selectedSong.title}
              artistName={selectedSong.metadataLine}
              audioSrc={selectedSong.audioSrc}
              isMuted={isMuted}
              seekRequest={seekRequest}
              isPlaying={playingTrackId === selectedSong.id}
              onBufferingChange={setIsPlayerBuffering}
              onProgressChange={setPlayerProgress}
              onPlayingChange={(nextPlaying) => {
                setPlayingTrackId(nextPlaying ? selectedSong.id : null)
              }}
              onPrevious={({ shuffle }) => handlePlayerStep('previous', { shuffle })}
              onNext={({ shuffle }) => handlePlayerStep('next', { shuffle })}
              canPrevious={(filteredTracks.length || displayTracks.length) > 1}
              canNext={(filteredTracks.length || displayTracks.length) > 1}
              className="h-px w-px"
            />
          </div>
        ) : null}

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-[18px] border border-white/16 bg-white/[0.06] pl-10 pr-10 text-[16px] text-white/90 outline-none transition-colors placeholder:text-white/42 focus:border-[#6366f1]/70 focus:ring-2 focus:ring-[#6366f1]/20"
              placeholder="Search title or artist"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear music search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-white/42 transition-all duration-150 ease-out hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-2">
            <div className="mb-2 flex items-center justify-between px-1 text-xs text-white/48">
              <span>{selectedTrackIds.size ? `${selectedTrackIds.size} selected` : 'Select tracks to compare'}</span>
              <span>{filteredTracks.length} songs</span>
            </div>
            <Button
              type="button"
              disabled={!selectedTrackIds.size || isAutoMatching}
              onClick={() => void handleAutoMatch()}
              className="h-11 w-full border-[#6366f1]/80 bg-[#6366f1] text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)] transition-[box-shadow,transform,border-color,background-color] duration-200 ease-out hover:border-[#818cf8] hover:bg-[#5558e8] hover:shadow-[0_0_34px_rgba(99,102,241,0.42)] disabled:border-white/10 disabled:bg-white/[0.05] disabled:text-white/42 disabled:shadow-none"
            >
              {isAutoMatching ? (
                <InlineLoadingAnimation size={16} label="Matching selected tracks" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isAutoMatching ? 'Analyzing compatibility...' : 'AI Auto-Match'}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2 pb-4">
              {catalogLoading && !visibleTracks.length ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
                  <InlineLoadingAnimation size={72} label="Loading music catalog" />
                  <p className="text-sm text-white/52">Preparing soundtrack previews.</p>
                </div>
              ) : null}
              {visibleTracks.map((track) => (
                <SoundtrackCard
                  key={track.id}
                  track={track}
                  artBroken={Boolean(brokenArtworkIds[track.id])}
                  isFocused={focusedTrack?.id === track.id}
                  isPlaying={playingTrackId === track.id}
                  isSelected={selectedTrackIds.has(track.id)}
                  onArtworkError={() => setBrokenArtworkIds((current) => ({ ...current, [track.id]: true }))}
                  onFocus={() => handleTrackActivate(track)}
                  onPlayPause={() => handleTrackPlayPause(track)}
                  onToggleSelected={() => toggleMultiSelect(track.id)}
                />
              ))}
              {!catalogLoading && !filteredTracks.length ? (
                <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
                  <div>
                    <div className="text-base font-medium text-white/78">No soundtracks found</div>
                    <div className="mt-2 text-sm text-white/42">Try a different song, artist, or soundtrack phrase.</div>
                  </div>
                </div>
              ) : null}
              {filteredTracks.length > visibleTrackCount ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2 h-11 w-full"
                  onClick={() => setVisibleTrackCount((current) => current + VISIBLE_TRACK_INCREMENT)}
                >
                  Load more
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <NowPlayingBar
          track={currentPlayerTrack}
          isPlaying={Boolean(currentPlayerTrack && playingTrackId === currentPlayerTrack.id)}
          isBuffering={isPlayerBuffering}
          isMuted={isMuted}
          currentTime={playerProgress.currentTime}
          duration={playerProgress.duration || currentPlayerTrack?.durationSec || 0}
          onMuteToggle={() => setIsMuted((current) => !current)}
          onPlayPause={() => {
            if (!currentPlayerTrack) return
            handleTrackPlayPause(currentPlayerTrack)
          }}
          onSeek={(time) => setSeekRequest({ time, token: Date.now() })}
        />
      </motion.section>
    )
  }

  return (
    <motion.section
      key="editor-music-tab-panel"
      aria-label={`${projectTitle} soundtrack selector`}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: chamberEase }}
      className="premium-ambient-panel premium-vignette-surface editorial-light-effect relative flex min-h-0 w-full max-w-[1080px] flex-1 self-center overflow-hidden rounded-[32px] border border-white/8 bg-black px-4 pb-28 pt-4 sm:px-5 sm:pt-5"
    >
      <style>{`
        @keyframes music-eq {
          from { transform: scaleY(0.38); opacity: 0.58; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
      <LuxuryVignette tone="music" />
      <div className="relative z-10 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,1.04fr)_minmax(21rem,0.9fr)] xl:grid-cols-[minmax(20rem,1.08fr)_minmax(22rem,0.92fr)]">
        <div className="flex min-h-0 min-w-0">
          {selectedSong ? (
            <div className="music-hero-shell music-disc-safe-stage relative flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/8 bg-black p-4 shadow-[0_24px_54px_-44px_rgba(0,0,0,0.98)] sm:p-5">
              <MusicPlayer
                albumArt={selectedSong.artwork || FALLBACK_COVER_ART}
                albumArtPosition={selectedSong.artworkPosition}
                songTitle={selectedSong.title}
                artistName={selectedSong.metadataLine}
                audioSrc={selectedSong.audioSrc}
                isMuted={isMuted}
                seekRequest={seekRequest}
                isPlaying={playingTrackId === selectedSong.id}
                onBufferingChange={setIsPlayerBuffering}
                onProgressChange={setPlayerProgress}
                onPlayingChange={(nextPlaying) => {
                  setPlayingTrackId(nextPlaying ? selectedSong.id : null)
                }}
                onPrevious={({ shuffle }) => handlePlayerStep('previous', { shuffle })}
                onNext={({ shuffle }) => handlePlayerStep('next', { shuffle })}
                canPrevious={(filteredTracks.length || displayTracks.length) > 1}
                canNext={(filteredTracks.length || displayTracks.length) > 1}
                className="relative z-10 min-h-0 flex-1 overflow-hidden"
              />
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col pl-2 pr-1 pt-1 sm:pl-3 sm:pr-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-[18px] border border-white/16 bg-white/[0.06] pl-10 pr-10 text-sm text-white/90 outline-none transition-colors placeholder:text-white/42 focus:border-[#6366f1]/70 focus:ring-2 focus:ring-[#6366f1]/20"
              placeholder="Search title or artist"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear music search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/42 transition-all duration-150 ease-out hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2 pb-4">
              {catalogLoading && !visibleTracks.length ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
                  <InlineLoadingAnimation size={72} label="Loading music catalog" />
                  <p className="text-sm text-white/52">Preparing soundtrack previews.</p>
                </div>
              ) : null}
              {visibleTracks.map((track) => (
                <SoundtrackCard
                  key={track.id}
                  track={track}
                  artBroken={Boolean(brokenArtworkIds[track.id])}
                  isFocused={focusedTrack?.id === track.id}
                  isPlaying={playingTrackId === track.id}
                  isSelected={selectedTrackIds.has(track.id)}
                  onArtworkError={() => setBrokenArtworkIds((current) => ({ ...current, [track.id]: true }))}
                  onFocus={() => handleTrackActivate(track)}
                  onPlayPause={() => handleTrackPlayPause(track)}
                  onToggleSelected={() => toggleMultiSelect(track.id)}
                />
              ))}
              {!catalogLoading && !filteredTracks.length ? (
                <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
                  <div>
                    <div className="text-base font-medium text-white/78">No soundtracks found</div>
                    <div className="mt-2 text-sm text-white/42">Try a different song, artist, or soundtrack phrase.</div>
                  </div>
                </div>
              ) : null}
              {filteredTracks.length > visibleTrackCount ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() => setVisibleTrackCount((current) => current + VISIBLE_TRACK_INCREMENT)}
                >
                  Load more
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTrackIds.size > 0 ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 18 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: chamberEase }}
            className="absolute inset-x-4 bottom-24 z-40 flex flex-col gap-3 rounded-[22px] border border-white/12 bg-[#111116]/[0.92] p-3 shadow-[0_34px_90px_-58px_rgba(0,0,0,0.95)] backdrop-blur-[24px] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-sm font-medium text-white">{selectedTrackIds.size} tracks selected</div>
            <Button
              type="button"
              disabled={isAutoMatching}
              onClick={() => void handleAutoMatch()}
              className="border-[#6366f1]/80 bg-[#6366f1] text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)] transition-[box-shadow,transform,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#818cf8] hover:bg-[#5558e8] hover:shadow-[0_0_34px_rgba(99,102,241,0.42)]"
            >
              {isAutoMatching ? (
                <InlineLoadingAnimation size={16} label="Matching selected tracks" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isAutoMatching ? 'Analyzing compatibility…' : 'AI Auto-Match'}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <NowPlayingBar
        track={currentPlayerTrack}
        isPlaying={Boolean(currentPlayerTrack && playingTrackId === currentPlayerTrack.id)}
        isBuffering={isPlayerBuffering}
        isMuted={isMuted}
        currentTime={playerProgress.currentTime}
        duration={playerProgress.duration || currentPlayerTrack?.durationSec || 0}
        onMuteToggle={() => setIsMuted((current) => !current)}
        onPlayPause={() => {
          if (!currentPlayerTrack) return
          handleTrackPlayPause(currentPlayerTrack)
        }}
        onSeek={(time) => setSeekRequest({ time, token: Date.now() })}
      />
    </motion.section>
  )
}
