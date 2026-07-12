'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Music, Pause, Play, X } from 'lucide-react'

import { useAudioStore } from '@/app/editor/stores/audio-store'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'

export function MiniPlayer() {
  const reduceMotion = useReducedMotion()
  const { close, currentTrack, isPlaying, pause, resume } = useAudioStore()
  const [imageLoaded, setImageLoaded] = React.useState(false)

  React.useEffect(() => setImageLoaded(false), [currentTrack?.coverUrl])

  if (!currentTrack) return null

  return (
    <motion.div
      className="mini-player fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[35] rounded-2xl border border-white/10 bg-black/72 p-2 text-white shadow-[0_24px_80px_-36px_rgba(0,0,0,0.95)] backdrop-blur-2xl md:hidden"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      role="region"
      aria-label="Music mini player"
    >
      <div className="flex min-h-14 items-center gap-3">
        <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/10">
          {currentTrack.coverUrl ? (
            <>
              {!imageLoaded ? (
                <>
                  <span className="absolute inset-0 bg-gray-700" aria-hidden="true" />
                  <InlineLoadingAnimation
                    className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                    size={20}
                    label={`Loading artwork for ${currentTrack.title}`}
                  />
                </>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTrack.coverUrl}
                alt=""
                className={cn('h-full w-full object-cover transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <Music className="size-5 text-white/64" aria-hidden="true" />
          )}
        </div>

        <button type="button" className="min-w-0 flex-1 text-left" aria-label={`Now playing ${currentTrack.title}`}>
          <span className="block overflow-hidden whitespace-nowrap text-sm font-semibold text-white/90">
            <span className="inline-block max-w-full truncate">{currentTrack.title}</span>
          </span>
          <span className="block truncate text-xs text-white/48">{currentTrack.artist}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isPlaying) {
              pause()
              return
            }
            void resume()
          }}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-prometheus-accent-cyan/25 bg-prometheus-accent-cyan/14 text-prometheus-accent-cyan"
          aria-label={isPlaying ? 'Pause track' : 'Play track'}
        >
          {isPlaying ? <Pause className="size-4" aria-hidden="true" /> : <Play className="ml-0.5 size-4" aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={close}
          className="grid size-9 shrink-0 place-items-center rounded-full text-white/58 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close mini player"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  )
}
