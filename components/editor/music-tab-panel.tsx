'use client'

import * as React from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Check, ChevronDown, FileUp, Folder, Heart, MoreHorizontal, Music, Pause, Play, Plus, Repeat, Search, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

import { LuxuryVignette } from '@/components/editor/luxury-vignette'
import { SoundtrackCard } from '@/components/editor/soundtrack-card'
import { TextReveal } from '@/components/editor/text-reveal'
import { CinematicLogoLoader } from '@/components/loading-animation/cinematic-logo-loader'
import { MusicPlayer } from '@/components/ui/music-player'
import { Button } from '@/components/ui/button'
import { chamberEase, chamberSpring } from '@/lib/chamber-motion'
import { FALLBACK_ALBUM_ART } from '@/lib/music-art'
import { createClient } from '@/lib/supabase/client'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import type { MusicRecommendation, MusicVideoContext } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'
import { writeSelectedEditorMusicRecommendation } from '@/lib/editor-music-selection'

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

type MusicCollectionTab = 'for-video' | 'trending' | 'premium' | 'my-music' | 'favorites'

type PersonalMusicFile = {
  id: string
  name: string
  sizeLabel: string
  uploadState?: 'failed' | 'uploading'
}

type PersonalMusicTrackRow = {
  id: string
  original_filename: string
  size_bytes: number
}

const PERSONAL_MUSIC_LIBRARY_STORAGE_KEY = 'prometheus.editor.personal-music.v1'

function readPersonalMusicLibrary() {
  if (typeof window === 'undefined') return { files: [] as PersonalMusicFile[], folders: [] as string[] }

  try {
    const value = window.localStorage.getItem(PERSONAL_MUSIC_LIBRARY_STORAGE_KEY)
    if (!value) return { files: [] as PersonalMusicFile[], folders: [] as string[] }
    const parsed = JSON.parse(value) as { files?: unknown; folders?: unknown }
    const files = Array.isArray(parsed.files)
      ? parsed.files.filter((file): file is PersonalMusicFile => Boolean(
        file && typeof file === 'object' &&
        typeof (file as PersonalMusicFile).id === 'string' &&
        typeof (file as PersonalMusicFile).name === 'string' &&
        typeof (file as PersonalMusicFile).sizeLabel === 'string',
      ))
      : []
    const folders = Array.isArray(parsed.folders)
      ? parsed.folders.filter((folder): folder is string => typeof folder === 'string')
      : []
    return { files, folders }
  } catch {
    return { files: [] as PersonalMusicFile[], folders: [] as string[] }
  }
}

const MUSIC_COLLECTION_TABS: Array<{ id: MusicCollectionTab; label: string; icon?: string }> = [
  { id: 'for-video', label: 'For this video' },
  { id: 'trending', label: 'Trending' },
  { id: 'premium', label: 'Premium', icon: '👑' },
  { id: 'my-music', label: 'My Music', icon: '👤' },
  { id: 'favorites', label: 'Favorites', icon: '🤍' },
]

function formatPersonalMusicSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toPersonalMusicFile(file: File): PersonalMusicFile {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    sizeLabel: formatPersonalMusicSize(file.size),
  }
}

function fromPersonalMusicTrackRow(track: PersonalMusicTrackRow): PersonalMusicFile {
  return {
    id: track.id,
    name: track.original_filename,
    sizeLabel: formatPersonalMusicSize(track.size_bytes),
  }
}

function createMusicStoragePath(userId: string) {
  return `${userId}/${crypto.randomUUID()}`
}

function MusicCollectionTabs({
  activeTab,
  onChange,
  moodFilter,
  onMoodChange,
  genreFilter,
  onGenreChange,
  durationFilter,
  onDurationChange,
  availableGenres,
  hasRecommendations = false,
  compact = false,
}: {
  activeTab: MusicCollectionTab
  onChange: (tab: MusicCollectionTab) => void
  moodFilter?: string
  onMoodChange?: (mood: string) => void
  genreFilter?: string
  onGenreChange?: (genre: string) => void
  durationFilter?: string
  onDurationChange?: (duration: string) => void
  availableGenres?: string[]
  hasRecommendations?: boolean
  compact?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/10 pb-2" role="tablist" aria-label="Music collections">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {MUSIC_COLLECTION_TABS.filter((tab) => tab.id !== 'for-video' || hasRecommendations).map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50',
                active
                  ? 'bg-white/[0.12] text-white shadow-inner'
                  : 'text-white/45 hover:bg-white/[0.05] hover:text-white/80',
              )}
            >
              {tab.icon ? <span className="text-xs">{tab.icon}</span> : null}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {!compact ? <div className="flex items-center gap-2">
        {/* Mood dropdown */}
        <div className="relative">
          <select
            value={moodFilter ?? ''}
            onChange={(e) => onMoodChange?.(e.target.value)}
            className="appearance-none rounded-full border border-white/10 bg-white/[0.03] pl-3 pr-7 py-1.5 text-xs text-white/70 hover:border-white/20 hover:text-white outline-none cursor-pointer focus:border-[#3b82f6]"
          >
            <option value="" className="bg-[#121622] text-white">Mood ⌵</option>
            <option value="cinematic" className="bg-[#121622] text-white">Cinematic</option>
            <option value="uplifting" className="bg-[#121622] text-white">Uplifting</option>
            <option value="peaceful" className="bg-[#121622] text-white">Peaceful</option>
            <option value="dark" className="bg-[#121622] text-white">Energetic</option>
            <option value="minimal" className="bg-[#121622] text-white">Chill</option>
            <option value="playful" className="bg-[#121622] text-white">Happy</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-white/40" />
        </div>

        {/* Genre dropdown */}
        <div className="relative">
          <select
            value={genreFilter ?? ''}
            onChange={(e) => onGenreChange?.(e.target.value)}
            className="appearance-none rounded-full border border-white/10 bg-white/[0.03] pl-3 pr-7 py-1.5 text-xs text-white/70 hover:border-white/20 hover:text-white outline-none cursor-pointer focus:border-[#3b82f6]"
          >
            <option value="" className="bg-[#121622] text-white">Genre ⌵</option>
            {(availableGenres ?? ['Cinematic', 'Electronic', 'Ambient', 'Acoustic', 'Pop']).map((g) => (
              <option key={g} value={g} className="bg-[#121622] text-white">{g}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-white/40" />
        </div>

        {/* Duration dropdown */}
        <div className="relative">
          <select
            value={durationFilter ?? ''}
            onChange={(e) => onDurationChange?.(e.target.value)}
            className="appearance-none rounded-full border border-white/10 bg-white/[0.03] pl-3 pr-7 py-1.5 text-xs text-white/70 hover:border-white/20 hover:text-white outline-none cursor-pointer focus:border-[#3b82f6]"
          >
            <option value="" className="bg-[#121622] text-white">Duration ⌵</option>
            <option value="short" className="bg-[#121622] text-white">&lt; 3 mins</option>
            <option value="medium" className="bg-[#121622] text-white">3 - 5 mins</option>
            <option value="long" className="bg-[#121622] text-white">&gt; 5 mins</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-white/40" />
        </div>
      </div> : null}
    </div>
  )
}

function MyMusicShelf({
  files,
  folders,
  query,
  onCreateFolder,
  onFilesSelected,
}: {
  files: PersonalMusicFile[]
  folders: string[]
  query: string
  onCreateFolder: () => void
  onFilesSelected: React.ChangeEventHandler<HTMLInputElement>
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const matchingFiles = files.filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <section className="min-h-[26rem] space-y-4 rounded-[16px] border border-white/10 bg-white/[0.025] p-4" aria-label="My Music library">
      <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={onFilesSelected} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/88">Your music</p>
          <p className="mt-1 text-xs text-white/42">Upload a soundtrack or keep a private working folder.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[10px] text-white/48">{files.length} tracks</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-28 items-center justify-center gap-2 rounded-[12px] border border-dashed border-white/24 bg-white/[0.025] px-3 text-sm font-medium text-white/78 transition hover:border-[#4d9dff]/70 hover:bg-[#4d9dff]/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d9dff]/50"
        >
          <FileUp className="size-5" /> Tap to upload
        </button>
        <button
          type="button"
          onClick={onCreateFolder}
          className="inline-flex min-h-28 items-center justify-center gap-2 rounded-[12px] border border-white/16 bg-white/[0.025] px-3 text-sm font-medium text-white/72 transition hover:border-white/35 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
        >
          <Folder className="size-5" /> New folder
        </button>
      </div>

      {folders.length ? (
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => <span key={folder} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-[10px] text-white/58"><Folder className="size-3" />{folder}</span>)}
        </div>
      ) : null}

      <div className="border-t border-white/8 pt-2">
        {matchingFiles.length ? (
          <div className="space-y-1.5">
            {matchingFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm text-white/74">
                <span className="flex min-w-0 items-center gap-2 truncate"><Music className="size-3.5 shrink-0 text-[#a5b4fc]" /> <span className="truncate">{file.name}</span></span>
                <span className={cn('shrink-0 font-mono text-[10px]', file.uploadState === 'failed' ? 'text-red-300/70' : 'text-white/35')}>
                  {file.uploadState === 'uploading' ? 'Uploading…' : file.uploadState === 'failed' ? 'Upload failed' : file.sizeLabel}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-1 py-8 text-center text-xs leading-5 text-white/42">Your uploaded tracks and folders will live here.</p>
        )}
      </div>
    </section>
  )
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

const FALLBACK_COVER_ART = FALLBACK_ALBUM_ART
const CATALOG_PAGE_SIZE = 200
const INITIAL_VISIBLE_TRACKS = 50
const VISIBLE_TRACK_INCREMENT = 50

const musicCatalogScrollbarStyles = `
  .music-catalog-scrollbar {
    scrollbar-color: rgba(74, 158, 255, 0.56) transparent;
    scrollbar-width: thin;
  }

  .music-catalog-scrollbar::-webkit-scrollbar {
    width: 10px;
  }

  .music-catalog-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-left: 1px solid rgba(118, 170, 226, 0.13);
    margin-block: 8px;
    transition: border-color 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .music-catalog-scrollbar::-webkit-scrollbar-thumb {
    min-height: 32px;
    border: 3px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
    background-color: rgba(74, 158, 255, 0.56);
    transition: background-color 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .music-catalog-scrollbar:hover {
    scrollbar-color: rgba(103, 188, 255, 0.94) transparent;
  }

  .music-catalog-scrollbar:hover::-webkit-scrollbar-track {
    border-color: rgba(118, 181, 255, 0.27);
  }

  .music-catalog-scrollbar:hover::-webkit-scrollbar-thumb {
    background-color: rgba(103, 188, 255, 0.94);
    box-shadow: 0 0 10px rgba(66, 156, 255, 0.48);
  }
`

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

let cachedCatalogTracks: MusicRecommendation[] | null = null
let catalogRequest: Promise<MusicRecommendation[]> | null = null

async function fetchCatalogTracks(): Promise<MusicRecommendation[]> {
  const nextTracks: MusicRecommendation[] = []
  let offset = 0
  let total = Number.POSITIVE_INFINITY

  while (offset < total) {
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

  return nextTracks
}

/**
 * Session-level catalog cache. The paginated result (and any in-flight
 * request) survives unmount/remount of the panel, so the loader only appears
 * on the first visit. The underlying fetch still runs with `no-store`; this
 * is just in-session memory.
 */
function getCatalogTracks(): Promise<MusicRecommendation[]> {
  if (cachedCatalogTracks) return Promise.resolve(cachedCatalogTracks)
  if (!catalogRequest) {
    catalogRequest = fetchCatalogTracks()
      .then((tracks) => {
        cachedCatalogTracks = tracks
        return tracks
      })
      .catch((error: unknown) => {
        catalogRequest = null
        throw error
      })
  }
  return catalogRequest
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
  volume = 80,
  onVolumeChange,
  onReplaceCurrent,
  onAddToTimeline,
  onPlayFromStart,
  compact = false,
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
  volume?: number
  onVolumeChange?: (v: number) => void
  onReplaceCurrent?: () => void
  onAddToTimeline?: () => void
  onPlayFromStart?: () => void
  compact?: boolean
}) {
  const [artBroken, setArtBroken] = React.useState(false)
  const [showActions, setShowActions] = React.useState(false)

  React.useEffect(() => {
    setArtBroken(false)
  }, [track?.id, track?.coverArtUrl])

  if (!track) return null

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const tags = (((track as any).vibeTags || [track.genre, ...((track as any).tags || [])]).filter(Boolean) as string[]).slice(0, 3)

  return (
    <div className={cn('absolute inset-x-4 bottom-4 z-30 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-[#0d131f]/95 p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl', compact && 'inset-x-5 flex-nowrap gap-3 rounded-[13px] p-2.5')}>
      {/* Left Track Info */}
      <div className="flex min-w-0 items-center gap-3.5">
        <div className={cn('relative size-12 shrink-0 overflow-hidden rounded-[14px] border border-white/10 bg-void shadow-md', compact && 'size-10 rounded-[10px]')}>
          {artBroken || !track.coverArtUrl ? (
            <div className="grid h-full w-full place-items-center text-white/20">
              <Music className="size-5" />
            </div>
          ) : (
            <Image
              src={track.coverArtUrl || FALLBACK_COVER_ART}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              onError={() => setArtBroken(true)}
              style={{ objectPosition: track.coverArtPosition ?? 'center' }}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className={cn('truncate text-sm font-semibold tracking-tight text-white', compact && 'text-[12px]')}>{track.title}</div>
          <div className={cn('truncate text-xs text-white/50', compact && 'text-[10px]')}>
            {isBuffering && isPlaying ? 'Buffering…' : `${track.artist || 'Unknown Artist'} • ${formatDuration(duration || track.durationSec || 0)}`}
          </div>
          {!compact && tags.length ? (
            <div className="mt-1 flex items-center gap-1.5">
              {tags.map((tag: string) => (
                <span key={tag} className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/55">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Center Left: Preview & Play from start */}
      <div className={cn('flex items-center gap-3', compact && 'ml-auto mr-auto')}>
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className={cn('grid size-11 place-items-center rounded-full bg-[#2563eb] text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] transition-all hover:bg-[#1d4ed8] active:scale-95', compact && 'size-8 bg-transparent shadow-none hover:bg-white/10')}
        >
          {isBuffering && isPlaying ? (
            <CinematicLogoLoader variant="inline" size={16} label={`Buffering ${track.title}`} />
          ) : isPlaying ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="ml-0.5 size-5 fill-current" />
          )}
        </button>
        {!compact ? <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">Preview</span>
          <button
            type="button"
            onClick={onPlayFromStart ?? (() => onSeek(0))}
            className="text-[11px] text-white/45 transition-colors hover:text-white text-left underline-offset-2 hover:underline"
          >
            Play from start
          </button>
        </div> : null}
      </div>

      {/* Center Right: Music Volume */}
      {!compact ? <div className="hidden items-center gap-3 md:flex">
        <span className="text-xs font-medium text-white/60">Music Volume</span>
        <button
          type="button"
          onClick={onMuteToggle}
          aria-label={isMuted ? 'Unmute soundtrack preview' : 'Mute soundtrack preview'}
          className="text-white/50 transition-colors hover:text-white"
        >
          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(event) => onVolumeChange?.(Number(event.target.value))}
          className="h-1.5 w-24 cursor-pointer accent-[#3b82f6] bg-white/10 rounded-full"
          aria-label="Music Volume"
        />
        <span className="w-8 text-right font-mono text-xs text-white/50">{isMuted ? '0%' : `${volume}%`}</span>
      </div> : null}

      {/* Right: Actions */}
      {compact ? (
        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button type="button" aria-label="More music actions" aria-expanded={showActions} onClick={() => setShowActions((open) => !open)} className="grid size-8 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white">
              <MoreHorizontal className="size-4" />
            </button>
            {showActions ? (
              <div className="absolute bottom-10 right-0 z-50 grid min-w-40 gap-1 rounded-lg border border-white/12 bg-[#171a22] p-1.5 shadow-xl">
                <button type="button" onClick={() => { onReplaceCurrent?.(); setShowActions(false) }} className="rounded-md px-2.5 py-2 text-left text-[11px] text-white/75 hover:bg-white/[0.07]">Replace current</button>
                <button type="button" onClick={() => { onAddToTimeline?.(); setShowActions(false) }} className="rounded-md px-2.5 py-2 text-left text-[11px] text-white/75 hover:bg-white/[0.07]">Add to timeline</button>
                <button type="button" onClick={() => { onPlayFromStart?.(); setShowActions(false) }} className="rounded-md px-2.5 py-2 text-left text-[11px] text-white/75 hover:bg-white/[0.07]">Play from start</button>
                <button type="button" onClick={() => { onMuteToggle(); setShowActions(false) }} className="rounded-md px-2.5 py-2 text-left text-[11px] text-white/75 hover:bg-white/[0.07]">{isMuted ? 'Unmute preview' : 'Mute preview'}</button>
                <label className="flex items-center gap-2 border-t border-white/[0.08] px-2.5 pt-2 text-[10px] text-white/55">
                  <span>Volume</span>
                  <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={(event) => onVolumeChange?.(Number(event.target.value))} aria-label="Music preview volume" className="w-20 accent-[#4d9dff]" />
                </label>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={onMuteToggle} aria-label={isMuted ? 'Unmute soundtrack preview' : 'Mute soundtrack preview'} className="grid size-8 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white">
            {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>
        </div>
      ) : <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onReplaceCurrent}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <span>⇄</span>
          <span>Replace Current</span>
        </button>
        <button
          type="button"
          onClick={onAddToTimeline}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#3b82f6]/40 bg-[#2563eb] px-4 py-2 text-xs font-medium text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] transition-all hover:bg-[#1d4ed8] active:scale-95"
        >
          <Plus className="size-3.5" />
          <span>Add to Timeline</span>
        </button>
      </div>}

      {/* Progress track seeker */}
      <button
        type="button"
        aria-label={`Seek ${track.title}`}
        onClick={(event) => {
          if (duration <= 0) return
          const rect = event.currentTarget.getBoundingClientRect()
          const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
          onSeek(ratio * duration)
        }}
        className={cn('absolute inset-x-0 bottom-0 h-1 w-full overflow-hidden rounded-b-[18px] bg-white/5 transition-all hover:h-1.5', compact && 'rounded-b-[13px]')}
      >
        <span className="block h-full rounded-full bg-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.6)]" style={{ width: `${progress}%` }} />
      </button>
    </div>
  )
}


const formatTime = (timeInSeconds: number): string => {
  if (Number.isNaN(timeInSeconds) || !Number.isFinite(timeInSeconds)) return '00:00'
  const minutes = Math.floor(Math.max(0, timeInSeconds) / 60)
  const seconds = Math.floor(Math.max(0, timeInSeconds) % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function MusicLibraryReferencePlayer({
  track,
  isPlaying,
  isFavorite,
  onToggleFavorite,
  onPlayPause,
  onPrevious,
  onNext,
  isShuffle,
  onShuffle,
  isRepeat,
  onRepeat,
  currentTime,
  duration,
  onSeek,
  isMuted,
  onMute,
  volume,
  onVolumeChange,
}: {
  track: MusicRecommendation
  isPlaying: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  onPlayPause: () => void
  onPrevious: () => void
  onNext: () => void
  isShuffle: boolean
  onShuffle: () => void
  isRepeat: boolean
  onRepeat: () => void
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  isMuted: boolean
  onMute: () => void
  volume: number
  onVolumeChange: (value: number) => void
}) {
  const safeDuration = duration || track.durationSec || 1
  const tags = [track.genre, track.mood, ...track.vibeTags]
    .filter((tag, index, all): tag is string => Boolean(tag) && all.indexOf(tag) === index)
    .slice(0, 4)

  return (
    <div className="relative flex min-h-[23rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[15px] border border-white/[0.08] bg-black px-4 py-3.5 shadow-[0_20px_55px_-40px_rgba(0,0,0,0.95)] sm:px-5">
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/75">
        <span aria-hidden>🔥</span> Trending
      </div>
      <button type="button" onClick={onToggleFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} className={cn('absolute right-3 top-3 grid size-7 place-items-center rounded-lg border transition-colors', isFavorite ? 'border-red-500/30 bg-red-500/20 text-red-400' : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white')}>
        <Heart className={cn('size-4', isFavorite && 'fill-current')} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center pt-8 text-center">
        <div className="relative aspect-square w-[min(10rem,34vh)] overflow-hidden rounded-[10px] border border-white/10 bg-[#111722] shadow-[0_18px_38px_-20px_rgba(0,0,0,.8)] sm:w-[min(11rem,36vh)]">
          <Image src={track.coverArtUrl || FALLBACK_COVER_ART} alt={`${track.title} album cover`} fill sizes="176px" className="object-cover" style={{ objectPosition: track.coverArtPosition ?? 'center' }} />
        </div>
        <h2 className="mt-2.5 max-w-full truncate text-[15px] font-semibold text-white">{track.title}</h2>
        <p className="mt-0.5 max-w-full truncate text-[11px] text-white/55">{track.artist || 'Unknown Artist'}</p>
        <div className="mt-2 flex max-w-full flex-wrap justify-center gap-1.5">
          {tags.map((tag) => <span key={tag} className="max-w-24 truncate rounded-full border border-white/[0.08] bg-white/[0.045] px-2.5 py-1 text-[9px] text-white/65">{tag}</span>)}
        </div>
      </div>

      <div className="space-y-1.5">
        <input type="range" min="0" max={safeDuration} value={Math.min(currentTime, safeDuration)} onChange={(event) => onSeek(Number(event.target.value))} aria-label={`Seek ${track.title}`} className="h-1.5 w-full cursor-pointer accent-[#3b82f6]" />
        <div className="flex items-center justify-between font-mono text-[10px] text-white/50">
          <span>{formatTime(currentTime)}</span>
          <span>{formatDuration(duration || track.durationSec)}</span>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-center gap-3 sm:gap-4">
        <button type="button" onClick={onShuffle} aria-label="Toggle shuffle" aria-pressed={isShuffle} className={cn('grid size-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white', isShuffle && 'text-[#3b82f6]')}><Shuffle className="size-4" /></button>
        <button type="button" onClick={onPrevious} aria-label="Previous track" className="grid size-8 place-items-center rounded-full text-white/70 transition-colors hover:text-white"><SkipBack className="size-5" /></button>
        <button type="button" onClick={onPlayPause} aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`} className="grid size-10 place-items-center rounded-full border border-[#3b82f6]/70 bg-[#2563eb] text-white shadow-[0_0_18px_rgba(37,99,235,.3)] transition-colors hover:bg-[#1d4ed8] active:scale-95">{isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}</button>
        <button type="button" onClick={onNext} aria-label="Next track" className="grid size-8 place-items-center rounded-full text-white/70 transition-colors hover:text-white"><SkipForward className="size-5" /></button>
        <button type="button" onClick={onRepeat} aria-label="Toggle repeat" aria-pressed={isRepeat} className={cn('grid size-8 place-items-center rounded-full text-white/55 transition-colors hover:text-white', isRepeat && 'text-[#3b82f6]')}><Repeat className="size-4" /></button>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-white/[0.07] pt-2">
        <button type="button" onClick={onMute} aria-label={isMuted ? 'Unmute soundtrack preview' : 'Mute soundtrack preview'} className="grid size-5 shrink-0 place-items-center text-white/50 hover:text-white">{isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}</button>
        <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={(event) => onVolumeChange(Number(event.target.value))} aria-label="Music preview volume" className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#3b82f6]" />
        <span className="w-7 text-right text-[9px] text-white/45">{isMuted ? 0 : volume}%</span>
      </div>
    </div>
  )
}

const formatDuration = (timeInSeconds: number | undefined): string => {
  if (!timeInSeconds || Number.isNaN(timeInSeconds) || !Number.isFinite(timeInSeconds)) return '0:00'
  const minutes = Math.floor(Math.max(0, timeInSeconds) / 60)
  const seconds = Math.floor(Math.max(0, timeInSeconds) % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function MusicTabPanel({
  tracks,
  projectTitle,
  initialPrompt = '',
  videoContext = null,
  selectedTrackId,
  onSelectTrack: onSelectTrackProp,
  variant = 'desktop',
}: {
  tracks: MusicRecommendation[]
  projectTitle: string
  initialPrompt?: string
  videoContext?: MusicVideoContext | null
  selectedTrackId: string | null
  onSelectTrack: (track: MusicRecommendation) => void
  variant?: 'desktop' | 'mobile'
}) {
  const editorial = useEditorialTimeline()
  const onSelectTrack = React.useCallback((track: MusicRecommendation) => {
    onSelectTrackProp(track)
    writeSelectedEditorMusicRecommendation(editorial.projectId, track)
    try {
      editorial.patch({ type: 'music', track: track as any })
    } catch {
      // Safe fallback if schema difference occurs
    }
  }, [editorial.patch, editorial.projectId, onSelectTrackProp])
  const reduceMotion = useStableReducedMotion()
  const [catalogTracks, setCatalogTracks] = React.useState<MusicRecommendation[]>(() => cachedCatalogTracks ?? [])
  const [catalogLoading, setCatalogLoading] = React.useState(() => cachedCatalogTracks === null)
  const [catalogReady, setCatalogReady] = React.useState(() => cachedCatalogTracks !== null)
  const [localSelectedTrackId, setLocalSelectedTrackId] = React.useState<string | null>(selectedTrackId)
  const [focusedTrackId, setFocusedTrackId] = React.useState<string | null>(selectedTrackId)
  const [playingTrackId, setPlayingTrackId] = React.useState<string | null>(null)
  const [selectedTrackIds, setSelectedTrackIds] = React.useState<Set<string>>(() => new Set())
  const [activeCollection, setActiveCollection] = React.useState<MusicCollectionTab>(tracks.length ? 'for-video' : 'trending')
  const userChoseMusicCollection = React.useRef(false)
  const [personalMusicFiles, setPersonalMusicFiles] = React.useState<PersonalMusicFile[]>(() => readPersonalMusicLibrary().files)
  const [personalMusicFolders, setPersonalMusicFolders] = React.useState<string[]>(() => readPersonalMusicLibrary().folders)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFilters, setShowFilters] = React.useState(false)
  const [genreFilter, setGenreFilter] = React.useState('')
  const [visibleTrackCount, setVisibleTrackCount] = React.useState(INITIAL_VISIBLE_TRACKS)
  const [brokenArtworkIds, setBrokenArtworkIds] = React.useState<Record<string, true>>({})
  const [isMuted, setIsMuted] = React.useState(false)
  const [isAutoMatching, setIsAutoMatching] = React.useState(false)
  const [isPlayerBuffering, setIsPlayerBuffering] = React.useState(false)
  const [playerProgress, setPlayerProgress] = React.useState({ currentTime: 0, duration: 0 })
  const [seekRequest, setSeekRequest] = React.useState<{ time: number; token: number } | null>(null)
  const selectionTrayRef = React.useRef<HTMLDivElement | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [moodFilter, setMoodFilter] = React.useState('')
  const [durationFilter, setDurationFilter] = React.useState('')
  const [volume, setVolume] = React.useState(0.8)
  const [isShuffle, setIsShuffle] = React.useState(false)
  const [isRepeat, setIsRepeat] = React.useState(false)
  const [favoriteTrackIds, setFavoriteTrackIds] = React.useState<Set<string>>(() => new Set(['amelie-adventures']))

  React.useEffect(() => {
    if (tracks.length && !userChoseMusicCollection.current) setActiveCollection('for-video')
  }, [tracks.length])

  const toggleFavorite = React.useCallback((trackId: string) => {
    setFavoriteTrackIds((current) => {
      const next = new Set(current)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }, [])

  React.useEffect(() => {
    const trackId = editorial.timeline?.music?.track.id ?? selectedTrackId
    if (trackId) {
      setLocalSelectedTrackId(trackId)
      setFocusedTrackId(trackId)
    } else {
      setLocalSelectedTrackId(null)
      setFocusedTrackId(null)
    }
  }, [editorial.timeline?.music?.track.id, selectedTrackId])

  React.useEffect(() => {
    try {
      window.localStorage.setItem(PERSONAL_MUSIC_LIBRARY_STORAGE_KEY, JSON.stringify({
        files: personalMusicFiles,
        folders: personalMusicFolders,
      }))
    } catch {
      // Browser storage is an enhancement: the in-session library remains usable without it.
    }
  }, [personalMusicFiles, personalMusicFolders])

  React.useEffect(() => {
    let disposed = false

    async function loadPersonalMusic() {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) return

        const { data, error } = await supabase
          .from('user_music_tracks')
          .select('id, original_filename, size_bytes')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (!disposed && data) setPersonalMusicFiles(data.map((track) => fromPersonalMusicTrackRow(track as PersonalMusicTrackRow)))
      } catch {
        // Local storage keeps the shelf useful until Supabase is configured or the migration is applied.
      }
    }

    void loadPersonalMusic()
    return () => {
      disposed = true
    }
  }, [])

  const handlePersonalMusicUpload = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(async (event) => {
    const nextFiles = Array.from(event.target.files ?? [])
    if (!nextFiles.length) return
    event.target.value = ''

    const optimisticFiles = nextFiles.map((file) => ({ ...toPersonalMusicFile(file), uploadState: 'uploading' as const }))
    setPersonalMusicFiles((current) => [
      ...optimisticFiles,
      ...current.filter((currentFile) => !optimisticFiles.some((file) => file.id === currentFile.id)),
    ])

    if (!isSupabaseConfigured()) {
      setPersonalMusicFiles((current) => current.map((currentFile) => (
        optimisticFiles.some((file) => file.id === currentFile.id)
          ? { ...currentFile, uploadState: undefined }
          : currentFile
      )))
      return
    }

    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Sign in to save music to your library.')

      const uploadedFiles = await Promise.all(nextFiles.map(async (file) => {
        const storagePath = createMusicStoragePath(user.id)
        const { error: storageError } = await supabase.storage
          .from('user-music')
          .upload(storagePath, file, { contentType: file.type || 'audio/mpeg', upsert: false })
        if (storageError) throw storageError

        const { data, error: insertError } = await supabase
          .from('user_music_tracks')
          .insert({
            user_id: user.id,
            original_filename: file.name,
            storage_path: storagePath,
            mime_type: file.type || null,
            size_bytes: file.size,
          })
          .select('id, original_filename, size_bytes')
          .single()

        if (insertError) {
          await supabase.storage.from('user-music').remove([storagePath])
          throw insertError
        }
        return fromPersonalMusicTrackRow(data as PersonalMusicTrackRow)
      }))

      setPersonalMusicFiles((current) => [
        ...uploadedFiles,
        ...current.filter((currentFile) => !optimisticFiles.some((file) => file.id === currentFile.id)),
      ])
    } catch (error) {
      setPersonalMusicFiles((current) => current.map((currentFile) => (
        optimisticFiles.some((file) => file.id === currentFile.id)
          ? { ...currentFile, uploadState: 'failed' }
          : currentFile
      )))
      toast.error(error instanceof Error ? error.message : 'Unable to upload music')
    }
  }, [])

  const createPersonalMusicFolder = React.useCallback(() => {
    const name = window.prompt('Name this music folder')?.trim()
    if (!name) return
    setPersonalMusicFolders((current) => current.includes(name) ? current : [...current, name])
  }, [])

  React.useEffect(() => {
    let disposed = false

    getCatalogTracks()
      .then((nextTracks) => {
        if (disposed) return
        setCatalogTracks(nextTracks)
        setCatalogReady(true)
      })
      .catch((error: unknown) => {
        if (disposed) return
        setCatalogTracks([])
        setCatalogReady(true)
        toast.error(error instanceof Error ? error.message : 'Unable to load music catalog')
      })
      .finally(() => {
        if (!disposed) setCatalogLoading(false)
      })

    return () => {
      disposed = true
    }
  }, [])

  const displayTracks = React.useMemo(() => {
    const sourceTracks = [...tracks, ...(catalogReady && catalogTracks.length ? catalogTracks : [])]
    const seen = new Set<string>()
    return sourceTracks.filter((track) => {
      if (seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
  }, [catalogReady, catalogTracks, tracks])

  const availableGenres = React.useMemo(() => Array.from(new Set(displayTracks.map((track) => track.genre).filter(Boolean))).sort(), [displayTracks])

  const collectionTracks = React.useMemo(() => {
    if (activeCollection === 'favorites') {
      const favs = displayTracks.filter((track) => favoriteTrackIds.has(track.id))
      return favs.length ? favs : displayTracks.slice(0, 4)
    }

    if (activeCollection === 'for-video') return tracks

    if (activeCollection === 'premium') {
      const premium = displayTracks
        .filter((track) => (
          (track.qualityScore ?? 0) >= 88 ||
          track.license === 'owned' ||
          track.license === 'licensed' ||
          track.vibeTags.some((tag) => /cinematic|luxury|editorial/i.test(tag))
        ))
        .sort((left, right) => (right.qualityScore ?? 0) - (left.qualityScore ?? 0))
      return premium.length ? premium : [...displayTracks].sort((left, right) => (right.qualityScore ?? 0) - (left.qualityScore ?? 0)).slice(0, 8)
    }

    if (activeCollection === 'trending') {
      return [...displayTracks].sort((left, right) => (right.freshnessScore ?? 0) - (left.freshnessScore ?? 0))
    }

    return displayTracks
  }, [activeCollection, displayTracks, favoriteTrackIds, tracks])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredTracks = React.useMemo(() => {
    let list = collectionTracks
    if (genreFilter) {
      list = list.filter((track) => track.genre?.toLowerCase() === genreFilter.toLowerCase())
    }
    if (moodFilter) {
      list = list.filter((track) => {
        const moodTags = (track as any).moodTags as string[] | undefined
        const vibeTags = (track as any).vibeTags as string[] | undefined
        return (
          track.mood?.toLowerCase() === moodFilter.toLowerCase() ||
          Boolean(moodTags?.some((m: string) => m.toLowerCase().includes(moodFilter.toLowerCase()))) ||
          Boolean(vibeTags?.some((v: string) => v.toLowerCase().includes(moodFilter.toLowerCase())))
        )
      })
    }
    if (durationFilter) {
      if (durationFilter === 'short') list = list.filter((track) => (track.durationSec ?? 0) < 180)
      else if (durationFilter === 'medium') list = list.filter((track) => (track.durationSec ?? 0) >= 180 && (track.durationSec ?? 0) <= 300)
      else if (durationFilter === 'long') list = list.filter((track) => (track.durationSec ?? 0) > 300)
    }
    if (!normalizedQuery) return list
    return list.filter((track) => {
      const anyTrack = track as unknown as Record<string, unknown>
      const title = track.title.toLowerCase()
      const artist = track.artist.toLowerCase()
      const genre = (track.genre ?? '').toLowerCase()
      const mood = (typeof track.mood === 'string' ? track.mood : '').toLowerCase()
      const category = (typeof anyTrack.category === 'string' ? anyTrack.category : '').toLowerCase()
      const genreTags = Array.isArray(anyTrack.genreTags) ? (anyTrack.genreTags as string[]) : []
      const moodTags = Array.isArray(anyTrack.moodTags) ? (anyTrack.moodTags as string[]) : []
      const tags = [
        ...genreTags,
        ...moodTags,
        ...(track.vibeTags ?? []),
      ].map((t) => t.toLowerCase())

      // 1. Direct substring match on any metadata field
      if (
        title.includes(normalizedQuery) ||
        artist.includes(normalizedQuery) ||
        genre.includes(normalizedQuery) ||
        mood.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        tags.some((t) => t.includes(normalizedQuery) || normalizedQuery.includes(t))
      ) {
        return true
      }

      // 2. Tokenized multi-word search
      const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 2)
      if (queryTokens.length > 0) {
        return queryTokens.some(
          (token) =>
            title.includes(token) ||
            artist.includes(token) ||
            genre.includes(token) ||
            mood.includes(token) ||
            category.includes(token) ||
            tags.some((t) => t.includes(token))
        )
      }

      return false
    })
  }, [collectionTracks, durationFilter, genreFilter, moodFilter, normalizedQuery])
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

    const resolvedSelectedTrackId = selectedTrackId && trackIds.has(selectedTrackId) ? selectedTrackId : null
    setLocalSelectedTrackId((current) => resolvedSelectedTrackId ?? (current && trackIds.has(current) ? current : null))
    setFocusedTrackId((current) => resolvedSelectedTrackId ?? (current && trackIds.has(current) ? current : null))
  }, [displayTracks, selectedTrackId])

  const selectedTrack = React.useMemo(
    () => displayTracks.find((track) => track.id === localSelectedTrackId) ?? displayTracks.find((track) => track.id === selectedTrackId) ?? null,
    [displayTracks, localSelectedTrackId, selectedTrackId],
  )
  const focusedTrack = React.useMemo(
    () => filteredTracks.find((track) => track.id === focusedTrackId) ?? selectedTrack,
    [filteredTracks, focusedTrackId, selectedTrack],
  )
  const activeTrack = selectedTrack ?? focusedTrack
  const currentPlayerTrack = React.useMemo(
    () => displayTracks.find((track) => track.id === playingTrackId) ?? selectedTrack,
    [displayTracks, playingTrackId, selectedTrack],
  )
  // The deck is a playback surface: its spinning artwork must follow audio, not
  // merely the track last focused in the catalog.
  const selectedSong = React.useMemo(
    () => (currentPlayerTrack ? buildSelectedSongDisplay(currentPlayerTrack) : null),
    [currentPlayerTrack],
  )
  const currentCardTrack = currentPlayerTrack ?? activeTrack
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

  React.useEffect(() => {
    if (!selectedTrackIds.size) return

    const dismissSelection = (event: PointerEvent) => {
      if (event.target instanceof Node && selectionTrayRef.current?.contains(event.target)) return
      setSelectedTrackIds(new Set())
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTrackIds(new Set())
    }

    document.addEventListener('pointerdown', dismissSelection, true)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissSelection, true)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [selectedTrackIds.size])

  const handleAutoMatch = React.useCallback(async () => {
    const trackIds = Array.from(selectedTrackIds)
    if (!trackIds.length) return

    setIsAutoMatching(true)
    try {
      const response = await fetch('/api/music/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds, projectTitle, initialPrompt, videoContext }),
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
      setSelectedTrackIds(new Set())
    }
  }, [displayTracks, handleTrackFocus, initialPrompt, projectTitle, selectedTrackIds, videoContext])

  const showCatalogLoader = activeCollection !== 'my-music' && !displayTracks.length && (!catalogReady || catalogLoading)

  return (
    <>
      <CinematicLogoLoader variant="overlay" ready={catalogReady || tracks.length > 0 || activeCollection === 'my-music'} />
      {showCatalogLoader ? null : !displayTracks.length && activeCollection !== 'my-music' ? (
      <section className="premium-ambient-panel premium-vignette-surface flex w-full max-w-[1060px] self-center rounded-[30px] px-5 py-5 shadow-[0_28px_64px_-38px_rgba(0,0,0,0.95)]">
        <LuxuryVignette tone="music" />
        <div className="relative z-10">
          <TextReveal as="div" text="Music" className="text-[11px] uppercase tracking-[0.22em] text-white/56" />
          <TextReveal as="div" text="Soundtrack options will appear here" delay={0.08} className="editor-display-soft mt-4 text-lg text-white" />
          <TextReveal as="p" text="Prometheus will surface the song picker once the edit context is ready." delay={0.12} className="mt-2 max-w-[36rem] text-sm leading-6 text-white/52" />
        </div>
      </section>
      ) : variant === 'mobile' ? (
      <motion.section
        key="mobile-editor-music-tab-panel"
        aria-label={`${projectTitle} mobile soundtrack selector`}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: chamberEase }}
      className="premium-ambient-panel premium-vignette-surface editorial-light-effect relative flex h-full min-h-[38rem] w-full flex-col overflow-hidden rounded-[18px] border border-white/8 bg-black pb-28"
      >
        <style>{`
          @keyframes music-eq {
            from { transform: scaleY(0.38); opacity: 0.58; }
            to { transform: scaleY(1); opacity: 1; }
          }
          ${musicCatalogScrollbarStyles}
        `}</style>
        <LuxuryVignette tone="music" />

        {selectedSong ? (
          <div className="pointer-events-none absolute -left-16 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
            <MusicPlayer
              albumArt={selectedSong.artwork || FALLBACK_COVER_ART}
              albumArtPosition={selectedSong.artworkPosition}
              songTitle={selectedSong.title}
              audioSrc={selectedSong.audioSrc}
              isMuted={isMuted}
              volume={volume / 100}
              repeat={isRepeat}
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
          <MusicCollectionTabs activeTab={activeCollection} onChange={(tab) => { userChoseMusicCollection.current = true; setActiveCollection(tab) }} hasRecommendations={tracks.length > 0} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              data-autonomous-target="music-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-[18px] border border-white/16 bg-white/[0.06] pl-10 pr-10 text-[16px] text-white/90 outline-none transition-colors placeholder:text-white/42 focus:border-[#4d9dff]/70 focus:ring-2 focus:ring-[#4d9dff]/20"
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

          {activeCollection === 'my-music' ? (
            <MyMusicShelf
              files={personalMusicFiles}
              folders={personalMusicFolders}
              query={searchQuery}
              onCreateFolder={createPersonalMusicFolder}
              onFilesSelected={handlePersonalMusicUpload}
            />
          ) : (
            <>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-2">
            <div className="mb-2 flex items-center justify-between px-1 text-xs text-white/48">
              <span>{selectedTrackIds.size ? `${selectedTrackIds.size} selected` : 'Select tracks to compare'}</span>
              <span>{filteredTracks.length} songs</span>
            </div>
            <Button
              type="button"
              disabled={!selectedTrackIds.size || isAutoMatching}
              onClick={() => void handleAutoMatch()}
              className="h-11 w-full border-[#4d9dff]/80 bg-[#3288ee] text-white shadow-[0_18px_54px_-24px_rgba(77,157,255,0.72)] transition-[box-shadow,transform,border-color,background-color] duration-200 ease-out hover:border-[#8bc5ff] hover:bg-[#4d9dff] hover:shadow-[0_0_34px_rgba(77,157,255,0.28)] disabled:border-white/10 disabled:bg-white/[0.05] disabled:text-white/42 disabled:shadow-none"
            >
              {isAutoMatching ? (
                <CinematicLogoLoader variant="inline" size={16} label="Matching selected tracks" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isAutoMatching ? 'Analyzing compatibility...' : 'AI Auto-Match'}
            </Button>
          </div>

          <div className="music-catalog-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2 pb-4">
              {catalogLoading && !visibleTracks.length ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
                  <CinematicLogoLoader variant="inline" size={72} label="Loading music catalog" />
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
            </>
          )}
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
      ) : (
    <motion.section
      key="editor-music-tab-panel"
      aria-label={`${projectTitle} soundtrack selector`}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: chamberEase }}
      className="premium-ambient-panel premium-vignette-surface editorial-light-effect relative flex h-full min-h-0 w-full max-w-[1280px] flex-1 self-center overflow-hidden rounded-[18px] border border-[#29486c]/60 bg-[#080c14] px-3 pb-28 pt-3 shadow-[0_32px_90px_-58px_rgba(0,0,0,0.98)] sm:px-5 sm:pt-4 md:-mx-4 md:-my-4"
    >
        <style>{`
          @keyframes music-eq {
            from { transform: scaleY(0.38); opacity: 0.58; }
            to { transform: scaleY(1); opacity: 1; }
          }
          ${musicCatalogScrollbarStyles}
        `}</style>
      <LuxuryVignette tone="music" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3">
        {/* Compact title row, matching the reference composition. */}
        <div className="grid shrink-0 gap-3 border-b border-white/10 px-1 pb-3 md:grid-cols-[minmax(15rem,0.68fr)_minmax(20rem,1.32fr)] md:items-center">
          <div>
            <div className="text-[25px] font-semibold tracking-[-0.04em] text-white sm:text-[28px]">Music Library</div>
            <p className="mt-1 text-xs text-white/45">Find the perfect soundtrack for your video with AI-curated music.</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input data-autonomous-target="music-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-10 w-full rounded-[10px] border border-white/12 bg-white/[0.045] pl-10 pr-10 text-xs text-white placeholder:text-white/40 focus:border-[#4d9dff]/70 focus:outline-none" placeholder="Search music, artist, mood, or genre..." aria-label="Search music, artist, mood, or genre" />
              {searchQuery ? (
                <button type="button" aria-label="Clear music search" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/40 hover:text-white"><X className="size-3.5" /></button>
              ) : null}
            </div>
            <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="grid size-10 shrink-0 place-items-center rounded-[9px] border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white" aria-label="Open music filters" title="Music filters">
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>

        {/* Subheader: Collections Tabs & Filters Row */}
        <div className="shrink-0 px-1">
          <MusicCollectionTabs
            activeTab={activeCollection}
            onChange={(tab) => { userChoseMusicCollection.current = true; setActiveCollection(tab) }}
            hasRecommendations={tracks.length > 0}
            moodFilter={moodFilter}
            onMoodChange={setMoodFilter}
            genreFilter={genreFilter}
            onGenreChange={setGenreFilter}
            durationFilter={durationFilter}
            onDurationChange={setDurationFilter}
            availableGenres={availableGenres}
          />
        </div>

        {showFilters ? (
          <div className="absolute right-5 top-[4.75rem] z-30 grid w-60 gap-2 rounded-xl border border-white/15 bg-[#171a22]/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,.6)] backdrop-blur-xl">
            <label htmlFor="music-genre-filter" className="text-[10px] font-medium uppercase tracking-wide text-white/45">Genre</label>
            <select id="music-genre-filter" value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} className="h-8 w-full rounded-md border border-white/15 bg-[#252934] px-2 text-xs text-white outline-none focus:border-[#4d9dff]">
              <option value="">All genres</option>
              {availableGenres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
            <label htmlFor="music-mood-filter" className="text-[10px] font-medium uppercase tracking-wide text-white/45">Mood</label>
            <select id="music-mood-filter" value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)} className="h-8 w-full rounded-md border border-white/15 bg-[#252934] px-2 text-xs text-white outline-none focus:border-[#4d9dff]">
              <option value="">All moods</option>
              <option value="cinematic">Cinematic</option><option value="uplifting">Uplifting</option><option value="peaceful">Peaceful</option><option value="dark">Energetic</option><option value="minimal">Chill</option><option value="playful">Happy</option>
            </select>
            <label htmlFor="music-duration-filter" className="text-[10px] font-medium uppercase tracking-wide text-white/45">Duration</label>
            <select id="music-duration-filter" value={durationFilter} onChange={(event) => setDurationFilter(event.target.value)} className="h-8 w-full rounded-md border border-white/15 bg-[#252934] px-2 text-xs text-white outline-none focus:border-[#4d9dff]">
              <option value="">Any length</option><option value="short">Under 3 min</option><option value="medium">3–5 min</option><option value="long">Over 5 min</option>
            </select>
            {genreFilter || moodFilter || durationFilter ? <button type="button" onClick={() => { setGenreFilter(''); setMoodFilter(''); setDurationFilter('') }} className="mt-1 text-left text-[11px] text-[#91c6ff] hover:text-white">Clear filters</button> : null}
          </div>
        ) : null}

        {/* 2-Column Grid */}
        <div className="grid min-h-0 flex-1 gap-3 pb-24 !pb-0 lg:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)] xl:gap-4">
          {/* Left column: focused artwork player. */}
          <div className="flex min-h-0 min-w-0 flex-col">
            {/* Background audio player engine */}
            {selectedSong ? (
              <div className="pointer-events-none absolute -left-16 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden>
                <MusicPlayer
                  albumArt={selectedSong.artwork || FALLBACK_COVER_ART}
                  albumArtPosition={selectedSong.artworkPosition}
                  songTitle={selectedSong.title}
                  audioSrc={selectedSong.audioSrc}
                  isMuted={isMuted}
                  volume={volume / 100}
                  repeat={isRepeat}
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

            {currentCardTrack ? (
              <>
              <MusicLibraryReferencePlayer
                track={currentCardTrack}
                isPlaying={playingTrackId === currentCardTrack.id}
                isFavorite={favoriteTrackIds.has(currentCardTrack.id)}
                onToggleFavorite={() => toggleFavorite(currentCardTrack.id)}
                onPlayPause={() => handleTrackPlayPause(currentCardTrack)}
                onPrevious={() => handlePlayerStep('previous', { shuffle: isShuffle })}
                onNext={() => handlePlayerStep('next', { shuffle: isShuffle })}
                isShuffle={isShuffle}
                onShuffle={() => setIsShuffle((value) => !value)}
                isRepeat={isRepeat}
                onRepeat={() => setIsRepeat((value) => !value)}
                currentTime={playerProgress.currentTime}
                duration={playerProgress.duration || currentCardTrack.durationSec || 0}
                onSeek={(time) => setSeekRequest({ time, token: Date.now() })}
                isMuted={isMuted}
                onMute={() => setIsMuted((muted) => !muted)}
                volume={volume}
                onVolumeChange={setVolume}
              />
              <div style={{ display: 'none' }} aria-hidden className="relative h-[226px] shrink-0 flex-col overflow-hidden rounded-[15px] border border-white/[0.08] bg-black px-5 py-4 shadow-[0_20px_55px_-40px_rgba(0,0,0,0.95)]">
                {/* Card Header: Trending Badge & Heart Favorite */}
                <div className="absolute inset-y-3 right-3 w-px bg-white/[0.045]" aria-hidden />
                <div className="relative flex min-h-0 flex-1 items-center justify-center">
                  <div className={cn('relative size-[58px] rounded-full border border-[#8b9aa8]/50 bg-[repeating-radial-gradient(circle_at_center,#111_0px,#111_2px,#30343a_3px,#101115_5px)] shadow-[0_0_16px_rgba(160,190,215,0.12)]', playingTrackId === currentCardTrack.id && 'animate-[spin_7s_linear_infinite] motion-reduce:animate-none')}>
                    <div className="absolute inset-[8px] rounded-full border border-white/15 bg-black/75" />
                    <div className="absolute inset-[15px] overflow-hidden rounded-full border border-white/20 bg-[#222]">
                      <Image src={currentCardTrack.coverArtUrl || '/music-covers/amelie-adventures-art.png'} alt="" fill sizes="28px" className="object-cover" />
                    </div>
                    <div className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-1 ring-white/50" />
                  </div>
                  <span className="hidden">
                    🔥 Trending
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFavoriteTrackIds((current) => {
                        const next = new Set(current)
                        if (next.has(currentCardTrack.id)) next.delete(currentCardTrack.id)
                        else next.add(currentCardTrack.id)
                        return next
                      })
                    }}
                    aria-label="Toggle favorite"
                    className={cn(
                      'absolute right-1 top-1 grid size-7 place-items-center rounded-full border transition-colors',
                      favoriteTrackIds.has(currentCardTrack.id)
                        ? 'border-red-500/30 bg-red-500/20 text-red-400'
                        : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white',
                    )}
                  >
                    <Heart className={cn('size-4', favoriteTrackIds.has(currentCardTrack.id) ? 'fill-current' : '')} />
                  </button>
                </div>

                {/* Scrubber / Progress Bar */}
                <div className="space-y-1">
                  <div
                    className="relative h-px w-full cursor-pointer rounded-full bg-white/30 hover:h-0.5 transition-all"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                      const dur = playerProgress.duration || currentCardTrack.durationSec || 293
                      setSeekRequest({ time: ratio * dur, token: Date.now() })
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-[#4d9dff]"
                      style={{
                        width: `${
                          (playerProgress.duration || currentCardTrack.durationSec)
                            ? Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((playerProgress.currentTime || (currentCardTrack.id === 'track-ref-2' ? 42 : 0)) /
                                    (playerProgress.duration || currentCardTrack.durationSec || 293)) *
                                    100,
                                ),
                              )
                            : 14
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-white/50">
                    <span>{formatTime(playerProgress.currentTime || (currentCardTrack.id === 'track-ref-2' ? 42 : 0))}</span>
                    <span>{formatDuration(playerProgress.duration || currentCardTrack.durationSec || 293)}</span>
                  </div>
                </div>

                {/* Transport Controls */}
                <div className="mt-2 flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={() => setIsShuffle((v) => !v)}
                    className={cn('p-2 text-white/50 transition-colors hover:text-white', isShuffle && 'text-[#3b82f6]')}
                    aria-label="Toggle shuffle"
                    title="Shuffle"
                  >
                    <Shuffle className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayerStep('previous', { shuffle: isShuffle })}
                    className="p-2 text-white/70 transition-colors hover:text-white"
                    aria-label="Previous track"
                    title="Previous track"
                  >
                    <SkipBack className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTrackPlayPause(currentCardTrack)}
                    aria-label={playingTrackId === currentCardTrack.id ? `Pause ${currentCardTrack.title}` : `Play ${currentCardTrack.title}`}
                    className="grid size-8 place-items-center rounded-full text-white transition-colors hover:bg-white/10 active:scale-95"
                  >
                    {playingTrackId === currentCardTrack.id ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayerStep('next', { shuffle: isShuffle })}
                    className="p-2 text-white/70 transition-colors hover:text-white"
                    aria-label="Next track"
                    title="Next track"
                  >
                    <SkipForward className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRepeat((v) => !v)}
                    className={cn('p-2 text-white/50 transition-colors hover:text-white', isRepeat && 'text-[#3b82f6]')}
                    aria-label="Toggle repeat"
                    title="Repeat"
                  >
                    <Repeat className="size-4" />
                  </button>
                </div>

              </div>
              </>
            ) : null}
          </div>

          {/* Right Column: Track Table */}
          <div className="flex min-h-0 min-w-0 flex-col">
            {activeCollection === 'my-music' ? (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <MyMusicShelf
                  files={personalMusicFiles}
                  folders={personalMusicFolders}
                  query={searchQuery}
                  onCreateFolder={createPersonalMusicFolder}
                  onFilesSelected={handlePersonalMusicUpload}
                />
              </div>
            ) : (
              <div className="music-catalog-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-2 pb-4">
                  <div className="hidden items-center gap-3 px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35 lg:flex">
                    <span className="w-6">#</span>
                    <span className="w-9" aria-hidden />
                    <span className="min-w-0 flex-1">Title / Artist</span>
                    <span className="w-[4.75rem] text-center">Genre</span>
                    <span className="w-[4.75rem] text-center">Mood</span>
                    <span className="w-12 text-right">Duration</span>
                    <span className="w-8" />
                  </div>
                  {catalogLoading && !visibleTracks.length ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 text-center">
                      <CinematicLogoLoader variant="inline" size={72} label="Loading music catalog" />
                      <p className="text-sm text-white/52">Preparing soundtrack previews.</p>
                    </div>
                  ) : null}
                  {visibleTracks.map((track, index) => (
                    <SoundtrackCard
                      key={track.id}
                      desktopIndex={index + 1}
                      track={track}
                      artBroken={Boolean(brokenArtworkIds[track.id])}
                      isFocused={focusedTrack?.id === track.id}
                      isPlaying={playingTrackId === track.id}
                      isSelected={selectedTrack?.id === track.id || selectedTrackIds.has(track.id)}
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
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTrackIds.size > 0 ? (
          <motion.div
            ref={selectionTrayRef}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 18 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: chamberEase }}
            className="absolute inset-x-4 bottom-24 z-40 flex flex-col gap-3 rounded-[14px] border border-white/12 bg-[#111116]/[0.92] p-3 shadow-[0_34px_90px_-58px_rgba(0,0,0,0.95)] backdrop-blur-[24px] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <span>{selectedTrackIds.size} tracks selected</span>
              <button
                type="button"
                onClick={() => setSelectedTrackIds(new Set())}
                className="grid size-7 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Clear selected tracks"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <Button
              type="button"
              disabled={isAutoMatching}
              onClick={() => void handleAutoMatch()}
              className="border-[#4d9dff]/80 bg-[#3288ee] text-white shadow-[0_18px_54px_-24px_rgba(77,157,255,0.72)] transition-[box-shadow,transform,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#8bc5ff] hover:bg-[#4d9dff] hover:shadow-[0_0_34px_rgba(77,157,255,0.28)]"
            >
              {isAutoMatching ? (
                <CinematicLogoLoader variant="inline" size={16} label="Matching selected tracks" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isAutoMatching ? 'Analyzing compatibility…' : 'AI Auto-Match'}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <NowPlayingBar
        track={currentPlayerTrack || currentCardTrack}
        isPlaying={Boolean(currentPlayerTrack && playingTrackId === currentPlayerTrack.id)}
        isBuffering={isPlayerBuffering}
        isMuted={isMuted}
        volume={volume}
        onVolumeChange={setVolume}
        currentTime={playerProgress.currentTime}
        duration={playerProgress.duration || currentPlayerTrack?.durationSec || currentCardTrack?.durationSec || 0}
        onMuteToggle={() => setIsMuted((current) => !current)}
        onPlayPause={() => {
          const t = currentPlayerTrack || currentCardTrack
          if (!t) return
          handleTrackPlayPause(t)
        }}
        onSeek={(time) => setSeekRequest({ time, token: Date.now() })}
        onReplaceCurrent={() => {
          const t = currentPlayerTrack || currentCardTrack
          if (!t) return
          onSelectTrack(t)
          toast.success(`Replaced soundtrack with ${t.title}`)
        }}
        onAddToTimeline={() => {
          const t = currentPlayerTrack || currentCardTrack
          if (!t) return
          onSelectTrack(t)
          toast.success(`Added ${t.title} to timeline`)
        }}
        onPlayFromStart={() => {
          const t = currentPlayerTrack || currentCardTrack
          if (!t) return
          setSeekRequest({ time: 0, token: Date.now() })
          if (playingTrackId !== t.id) {
            handleTrackPlayPause(t)
          }
        }}
      />
    </motion.section>
      )}
    </>
  )
}
