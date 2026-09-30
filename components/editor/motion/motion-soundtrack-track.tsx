'use client'

import * as React from 'react'
import { Music, Plus, Volume2, VolumeX, Sparkles } from 'lucide-react'
import type { MusicRecommendation } from '@/lib/types'
import { generateBeatsForTrack, generateWaveformEnvelope, type MusicBeat } from '@/lib/editor/music-beat-engine'
import { cn } from '@/lib/utils'

export interface MotionSoundtrackTrackProps {
  track?: MusicRecommendation | null
  effectiveDuration: number
  currentTime: number
  zoom: number
  volume?: number
  isMuted?: boolean
  onVolumeChange?: (volume: number) => void
  onToggleMute?: () => void
  onOpenMusicCatalog?: () => void
  onSeek?: (timeSec: number) => void
  className?: string
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const remaining = Math.floor(safe % 60)
  const centiseconds = Math.floor((safe % 1) * 100)
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

export function MotionSoundtrackTrack({
  track,
  effectiveDuration,
  currentTime,
  zoom,
  volume = 0.5,
  isMuted = false,
  onVolumeChange,
  onToggleMute,
  onOpenMusicCatalog,
  onSeek,
  className,
}: MotionSoundtrackTrackProps) {
  const width = `${zoom * 100}%`

  const beats = React.useMemo(() => {
    return generateBeatsForTrack(track, effectiveDuration)
  }, [track, effectiveDuration])

  const waveformPoints = React.useMemo(() => {
    // 72 to 144 points scaled with zoom
    const sampleCount = Math.min(180, Math.max(64, Math.round(96 * zoom)))
    return generateWaveformEnvelope(track, effectiveDuration, sampleCount)
  }, [track, effectiveDuration, zoom])

  if (!track) {
    return (
      <div
        data-timeline-track="soundtrack"
        className={cn(
          'relative mt-2 h-9 overflow-hidden rounded border border-dashed border-white/12 bg-white/[0.02] transition-colors hover:border-white/20 hover:bg-white/[0.04]',
          className,
        )}
        style={{ width, minWidth: '100%' }}
      >
        <button
          type="button"
          onClick={onOpenMusicCatalog}
          className="flex h-full w-full items-center gap-2 px-3 text-[11px] text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#98f237]/50"
        >
          <div className="flex size-5 shrink-0 items-center justify-center rounded bg-white/5 text-[#98f237]">
            <Plus className="size-3" />
          </div>
          <span className="font-medium text-white/70">Sync soundtrack to motion</span>
          <span className="text-[10px] text-white/35">— click to browse catalog or personal audio</span>
        </button>
      </div>
    )
  }

  const bpm = track.bpm || 120

  return (
    <div
      data-timeline-track="soundtrack"
      className={cn(
        'group relative mt-2 h-9 overflow-hidden rounded border border-[#7367ef]/45 bg-[linear-gradient(90deg,rgba(47,37,117,0.95)_0%,rgba(72,55,169,0.9)_50%,rgba(35,30,105,0.95)_100%)] transition-all',
        className,
      )}
      style={{ width, minWidth: '100%' }}
    >
      {/* Background waveform visualization */}
      <div className="absolute inset-0 flex items-end gap-[1.5px] px-1 pb-1 opacity-75">
        {waveformPoints.map((point, index) => {
          const isPassed = point.time <= currentTime
          return (
            <div
              key={`wave-${index}`}
              className={cn(
                'flex-1 rounded-t-[1px] transition-colors duration-100',
                isPassed
                  ? 'bg-gradient-to-t from-[#a899ff]/70 to-[#c4b8ff]'
                  : 'bg-[#8f84f0]/65 group-hover:bg-[#a99dff]/85',
              )}
              style={{
                height: `${Math.round(point.energy * 85)}%`,
                minHeight: '2px',
              }}
            />
          )
        })}
      </div>

      {/* Beat markers overlay */}
      <div className="pointer-events-none absolute inset-0">
        {beats.map((beat) => {
          const leftPct = (beat.time / effectiveDuration) * 100
          if (leftPct < 0 || leftPct > 100) return null

          const isCurrent = Math.abs(currentTime - beat.time) < 0.15

          return (
            <div
              key={beat.id}
              style={{ left: `${leftPct}%` }}
              className={cn(
                'absolute top-0 bottom-0 w-[1.5px] -translate-x-1/2 transition-all',
                beat.type === 'climax'
                  ? 'bg-[#d4b6ff]/80 shadow-[0_0_8px_rgba(182,144,255,0.6)]'
                  : beat.type === 'downbeat'
                    ? 'bg-[#b4a7ff]/75 shadow-[0_0_6px_rgba(165,151,255,0.4)]'
                    : 'bg-white/20',
                isCurrent && 'w-[2.5px] bg-white scale-y-110 shadow-[0_0_10px_#fff]',
              )}
              title={`${beat.type.toUpperCase()} at ${formatTime(beat.time)}`}
            />
          )
        })}
      </div>

      {/* Floating Track Info & Controls overlay */}
      <div className="absolute inset-y-0 left-2 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded bg-black/75 py-0.5 pl-1 pr-2 text-[10px] text-white/90 backdrop-blur-md border border-white/10 shadow-sm">
          {track.coverArtUrl ? (
            <img
              src={track.coverArtUrl}
              alt=""
              className="size-4 rounded object-cover"
              onError={(e) => {
                // Hide broken image
                ;(e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="grid size-4 place-items-center rounded bg-[#a99dff]/20 text-[#d6ceff]">
              <Music className="size-2.5" />
            </div>
          )}
          <span className="max-w-[140px] truncate font-medium text-white sm:max-w-[200px]">
            {track.title}
          </span>
          <span className="hidden text-white/40 sm:inline">• {track.artist}</span>
          <span className="rounded bg-[#a99dff]/20 px-1 py-0.2 text-[9px] font-mono font-medium text-[#d6ceff]">
            {bpm} BPM
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {onVolumeChange ? <label className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-1 text-[9px] text-white/70"><span className="sr-only">Soundtrack volume</span><input aria-label="Soundtrack volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="h-1 w-12 accent-[#b4a7ff]" /><span className="w-6 tabular-nums">{Math.round(volume * 100)}%</span></label> : null}
          {onToggleMute ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleMute()
              }}
              title={isMuted ? 'Unmute soundtrack' : 'Mute soundtrack'}
              aria-label={isMuted ? 'Unmute soundtrack' : 'Mute soundtrack'}
              className="grid size-6 place-items-center rounded bg-black/60 text-white/70 hover:bg-black/90 hover:text-white"
            >
              {isMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
            </button>
          ) : null}

          {onOpenMusicCatalog ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenMusicCatalog()
              }}
              title="Change soundtrack track"
              className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white/70 hover:bg-black/90 hover:text-white"
            >
              Change
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
