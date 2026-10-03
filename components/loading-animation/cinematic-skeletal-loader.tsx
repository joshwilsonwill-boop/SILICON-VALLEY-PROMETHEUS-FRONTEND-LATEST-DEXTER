'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CinematicSkeletalLoaderProps {
  label?: string
  sublabel?: string
  variant?: 'stage' | 'card' | 'chat' | 'inline'
  className?: string
  showText?: boolean
  aspectRatio?: string
}

const CINEMATIC_LOADER_SRC = '/loaders/cinematic-loader.webm'

export function CinematicSkeletalLoader({
  label = 'Jarvis compiling directive on Modal...',
  sublabel,
  variant = 'stage',
  className,
  showText = true,
  aspectRatio,
}: CinematicSkeletalLoaderProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [])

  if (variant === 'inline') {
    return (
      <div className={cn('relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-black/60 px-2.5 py-1', className)}>
        <div className="relative h-4 w-7 overflow-hidden rounded">
          <video
            ref={videoRef}
            src={CINEMATIC_LOADER_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        </div>
        {showText && <span className="text-[11px] font-medium text-white/80">{label}</span>}
      </div>
    )
  }

  if (variant === 'chat') {
    return (
      <div className={cn('relative flex w-full max-w-[22rem] flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-2.5 shadow-2xl backdrop-blur-xl', className)}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            src={CINEMATIC_LOADER_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ff2d4] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7ff2d4]" />
            </span>
            <span className="text-[10px] font-medium tracking-wide uppercase text-white/80">Jarvis Dispatching</span>
          </div>
        </div>
        {showText && (
          <div className="flex flex-col px-1 pb-0.5">
            <p className="text-[12px] font-medium text-white/90">{label}</p>
            {sublabel && <p className="text-[11px] text-white/50">{sublabel}</p>}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cn('relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/70 p-2', className)}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={CINEMATIC_LOADER_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        </div>
        {showText && (
          <div className="mt-1.5 flex flex-col px-0.5">
            <span className="text-[11px] font-medium text-white/90">{label}</span>
            {sublabel && <span className="text-[10px] text-white/50">{sublabel}</span>}
          </div>
        )}
      </div>
    )
  }

  // variant === 'stage'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-black/85 backdrop-blur-xl',
        className,
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center justify-center px-6 text-center">
        {/* Cinematic Video Container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/12 bg-black shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)]">
          <video
            ref={videoRef}
            src={CINEMATIC_LOADER_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#7ff2d4] to-transparent animate-pulse" />
        </div>

        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 flex flex-col items-center gap-1"
          >
            <h4 className="text-sm font-semibold tracking-wide text-white/92">{label}</h4>
            {sublabel ? (
              <p className="text-xs text-white/50">{sublabel}</p>
            ) : (
              <p className="text-xs text-white/40">Executing instructions via Modal cloud workers</p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
