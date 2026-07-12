'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { cn } from '@/lib/utils'
import { InlineLoadingAnimation } from '@/components/loading-animation'

export type SourceStageStatus = 'empty' | 'loading' | 'error'

interface SourceStagePlaceholderProps {
  status: SourceStageStatus
  isDragActive?: boolean
  onPickSource: () => void
  onDragOver: React.DragEventHandler<HTMLButtonElement>
  onDragLeave: React.DragEventHandler<HTMLButtonElement>
  onDrop: React.DragEventHandler<HTMLButtonElement>
}

function SourceAddGlyph({
  isDragActive,
  isError,
  reduceMotion,
}: {
  isDragActive: boolean
  isError: boolean
  reduceMotion: boolean
}) {
  const accentClass = isError
    ? 'from-rose-300 via-rose-100 to-white'
    : isDragActive
      ? 'from-[#9ff6e3] via-white to-[#b8d7ff]'
      : 'from-white via-[#d6fff7] to-[#aeb9ff]'

  return (
    <motion.span
      aria-hidden
      className="relative grid size-[58px] place-items-center rounded-[20px]"
      animate={
        reduceMotion
          ? undefined
          : {
              y: isDragActive ? -3 : [0, -2, 0],
              scale: isDragActive ? 1.035 : 1,
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              y: { duration: isDragActive ? 0.28 : 3.4, repeat: isDragActive ? 0 : Number.POSITIVE_INFINITY, ease: 'easeInOut' },
              scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            }
      }
    >
      <span className="absolute inset-0 rounded-[20px] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.13)_0%,rgba(255,255,255,0.04)_46%,rgba(255,255,255,0.02)_100%)] shadow-[0_22px_44px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl" />
      <span className="absolute inset-[7px] rounded-[15px] border border-white/10 bg-black/38 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />
      <motion.span
        className="absolute inset-[11px] rounded-[12px] border border-white/14"
        animate={reduceMotion ? undefined : { rotate: isDragActive ? 8 : [0, 2, 0, -2, 0], opacity: isDragActive ? 0.82 : [0.42, 0.62, 0.42] }}
        transition={reduceMotion ? undefined : { duration: isDragActive ? 0.32 : 6, repeat: isDragActive ? 0 : Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <span className={cn('absolute h-[2px] w-7 rounded-full bg-gradient-to-r shadow-[0_0_18px_rgba(159,246,227,0.32)]', accentClass)} />
      <span className={cn('absolute h-7 w-[2px] rounded-full bg-gradient-to-b shadow-[0_0_18px_rgba(159,246,227,0.32)]', accentClass)} />
      <span className="absolute left-3.5 top-3.5 size-1 rounded-full bg-white/48 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
    </motion.span>
  )
}

export function SourceStagePlaceholder({
  status,
  isDragActive = false,
  onPickSource,
  onDragOver,
  onDragLeave,
  onDrop,
}: SourceStagePlaceholderProps) {
  const reduceMotion = useStableReducedMotion()
  const isLoading = status === 'loading'
  const isError = status === 'error'
  const statusLabel = isLoading
    ? 'Source preview is restoring. Choose another source if needed.'
    : isError
      ? 'Retry source upload'
      : isDragActive
        ? 'Release to stage source'
        : 'Drop or choose source'

  return (
    <button
      type="button"
      aria-label="Stage a source video"
      aria-busy={isLoading}
      onClick={onPickSource}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'group relative flex h-full min-h-[clamp(250px,40vh,460px)] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border transition-all duration-300 ease-out',
        isDragActive
          ? 'border-[#9ff6e3]/38 bg-[#9ff6e3]/[0.055] shadow-[0_0_42px_rgba(159,246,227,0.12)]'
          : isLoading
            ? 'border-white/8 bg-black hover:border-white/12'
            : isError
              ? 'border-rose-400/24 bg-rose-400/[0.055]'
              : 'border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_38%),linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0.01)_100%)] hover:border-white/18 hover:bg-white/[0.035]',
      )}
    >
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 z-0 bg-transparent flex items-center justify-center">
          <InlineLoadingAnimation size={120} label="Restoring source preview" />
        </div>
      ) : null}
      {!isLoading ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] opacity-50"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.28) 0.7px, rgba(255,255,255,0) 1px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 68%)',
            }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-[10%] z-[1] rounded-[18px] border border-dashed border-white/10"
            animate={reduceMotion ? undefined : { opacity: isDragActive ? 0.64 : [0.22, 0.42, 0.22] }}
            transition={reduceMotion ? undefined : { duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
          <span className="pointer-events-none absolute inset-x-[18%] top-0 z-[1] h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(159,246,227,0.52)_48%,rgba(255,255,255,0)_100%)]" />

          <span className="relative z-10 inline-flex">
            <SourceAddGlyph isDragActive={isDragActive} isError={isError} reduceMotion={reduceMotion} />
          </span>
        </>
      ) : null}

      <span className="sr-only">{statusLabel}</span>
    </button>
  )
}
