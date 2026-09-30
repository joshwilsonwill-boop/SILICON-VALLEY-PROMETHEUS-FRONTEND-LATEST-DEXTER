'use client'

import * as React from 'react'
import Image from 'next/image'
import { Check, Music, Pause, Play, Plus } from 'lucide-react'

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

function formatMood(mood: string | undefined) {
  return mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Cinematic'
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
      <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/[0.06] text-white/20">
        <Music className="size-5" />
      </div>
    )
  }

  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.04]">
      <Image
        src={track.coverArtUrl}
        alt=""
        fill
        sizes="36px"
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
        'group relative flex min-h-[56px] w-full items-center gap-3 overflow-hidden rounded-[12px] border px-3 py-2 text-left transition-all duration-200 ease-out focus:outline-none',
        isSelected
          ? 'border-[#3b82f6] bg-[rgba(20,38,68,0.52)] shadow-[0_0_24px_rgba(59,130,246,0.22)]'
          : isFocused
            ? 'border-[#3b82f6]/40 bg-[rgba(22,32,50,0.7)]'
            : 'border-white/8 bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.05]',
      )}
    >
      <style>{`
        @keyframes music-eq {
          from { transform: scaleY(0.38); opacity: 0.58; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>

      {/* Artwork */}
      <TrackArtwork track={track} broken={artBroken} onError={onArtworkError} />

      {/* Title & Artist */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-[13px] font-semibold text-white">{track.title}</div>
          {isPlaying ? <EqualizerBars /> : null}
        </div>

        <ArtistLine artist={track.artist} />
      </div>

      {/* Genre pill */}
      <span className="hidden w-[4.75rem] shrink-0 truncate rounded-full border border-white/5 bg-white/[0.05] px-2 py-1 text-center text-[10px] text-white/65 lg:block">
        {track.genre || 'Cinematic'}
      </span>

      {/* Mood pill */}
      <span className="hidden w-[4.75rem] shrink-0 truncate rounded-full border border-white/5 bg-white/[0.05] px-2 py-1 text-center text-[10px] text-white/65 lg:block">
        {formatMood(track.mood)}
      </span>

      {/* Duration */}
      <div className="hidden w-12 shrink-0 text-right text-[11px] tabular-nums text-white/50 sm:block">{formatDuration(track.durationSec)}</div>

      {/* Play/Pause Button */}
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
          isPlaying
            ? 'border-[#3b82f6] bg-[#2563eb] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white',
        )}
      >
        {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
      </button>

      {/* Action / Selection Checkmark Button */}
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
          'absolute right-[2.85rem] top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg border bg-[#111722] opacity-0 transition-all duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100',
          isSelected
            ? 'border-[#3b82f6] bg-[#2563eb] text-white shadow-[0_0_14px_rgba(37,99,235,0.45)]'
            : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:bg-white/10 hover:text-white',
        )}
      >
        {isSelected ? <Check className="size-4" strokeWidth={2.2} /> : <Plus className="size-4" />}
      </button>
    </div>
  )
}
