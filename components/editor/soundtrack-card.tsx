'use client'

import * as React from 'react'
import Image from 'next/image'
import { Check, Music, Pause, Play } from 'lucide-react'

import type { MusicRecommendation } from '@/lib/types'
import { cn } from '@/lib/utils'

type SoundtrackCardProps = {
  artBroken: boolean
  isFocused: boolean
  isPlaying: boolean
  isSelected: boolean
  onArtworkError: () => void
  onFocus: () => void
  onPlayPause: () => void
  onToggleSelected: () => void
  track: MusicRecommendation
}

function formatDuration(durationSec: number | undefined) {
  const safeDuration = Number.isFinite(durationSec) ? Math.max(0, Math.floor(durationSec ?? 0)) : 0
  const minutes = Math.floor(safeDuration / 60)
  const seconds = safeDuration % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function EqualizerBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="w-1 rounded-full bg-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.42)]"
          style={{
            height: `${7 + index * 3}px`,
            animation: `music-eq 0.72s ease-out ${index * 0.12}s infinite alternate`,
          }}
        />
      ))}
    </span>
  )
}

function TrackArtwork({
  broken,
  onError,
  track,
}: {
  broken: boolean
  onError: () => void
  track: MusicRecommendation
}) {
  if (broken || !track.coverArtUrl) {
    return (
      <div className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/[0.06] text-white/20">
        <Music className="size-5" />
      </div>
    )
  }

  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04]">
      <Image
        src={track.coverArtUrl}
        alt=""
        fill
        sizes="40px"
        className="object-cover"
        onError={onError}
        style={{ objectPosition: track.coverArtPosition ?? 'center' }}
      />
    </div>
  )
}

function ArtistLine({ artist }: { artist: string }) {
  const displayArtist = artist.trim() || 'Unknown Artist'

  return (
    <div className="relative mt-0.5 min-w-0 truncate text-xs text-neutral-400" title={displayArtist}>
      {displayArtist}
    </div>
  )
}

export function SoundtrackCard({
  artBroken,
  isFocused,
  isPlaying,
  isSelected,
  onArtworkError,
  onFocus,
  onPlayPause,
  onToggleSelected,
  track,
}: SoundtrackCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-track-id={track.id}
      data-autonomous-target="music-track"
      onClick={onFocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onFocus()
        }
      }}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border bg-white/[0.03] px-4 py-3 text-left transition-all duration-200 ease-out focus:outline-none',
        isSelected
          ? 'border-[#6366f1]/36 bg-[#6366f1]/14 shadow-[0_0_30px_rgba(99,102,241,0.18)]'
          : isFocused
            ? 'border-white/16 bg-white/[0.06]'
            : 'border-white/10 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.05]',
      )}
    >
      <style>{`
        @keyframes music-eq {
          from { transform: scaleY(0.38); opacity: 0.58; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      {isSelected ? <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#6366f1]" /> : null}

      <button
        type="button"
        data-action="select-track"
        data-autonomous-target="music-select"
        aria-label={isSelected ? `Deselect ${track.title}` : `Select ${track.title}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleSelected()
        }}
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-150 ease-out md:opacity-0 md:group-hover:opacity-100',
          isSelected ? 'border-[#6366f1]/36 bg-[#6366f1] text-white opacity-100' : 'border-white/12 bg-black/30 text-white/42 hover:text-white',
        )}
      >
        {isSelected ? <Check className="size-3.5" /> : null}
      </button>

      <TrackArtwork track={track} broken={artBroken} onError={onArtworkError} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-medium text-white">{track.title}</div>
          {isPlaying ? <EqualizerBars /> : null}
          {isSelected ? (
            <span className="hidden rounded-full border border-[#6366f1]/36 bg-[#6366f1]/14 px-2 py-0.5 text-[10px] text-[#c7d2fe] sm:inline-flex">
              Selected
            </span>
          ) : null}
        </div>

        <ArtistLine artist={track.artist} />
      </div>

      <div className="hidden w-12 shrink-0 text-right text-xs text-white/40 sm:block">{formatDuration(track.durationSec)}</div>

      <button
        type="button"
        data-action="play-track"
        data-autonomous-target="music-play"
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={(event) => {
          event.stopPropagation()
          onPlayPause()
        }}
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-150 ease-out',
          isPlaying ? 'border-[#6366f1]/36 bg-[#6366f1] text-white' : 'border-white/12 bg-black/30 text-white/72 hover:bg-white/[0.08] hover:text-white',
        )}
      >
        {isPlaying ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
      </button>
    </div>
  )
}
