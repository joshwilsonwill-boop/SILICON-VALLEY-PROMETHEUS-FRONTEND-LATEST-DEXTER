'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock3, Sparkles, X } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { FrameTokenChip } from './frame-token-chip'
import { cn } from '@/lib/utils'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import type { FrameTarget, QueuedPreviewRevisionState, RevisionableRegion } from '@/lib/editorial-frame/types'

type FramePreviewCardProps = {
  frameTarget: FrameTarget
  region: RevisionableRegion | null
  queuedPreviewRevision?: QueuedPreviewRevisionState | null
  thumbnailUrl?: string | null
  validationNote?: string | null
  onClear: () => void
  onRetarget: () => void
  className?: string
}

function frameTargetText(frameTarget: FrameTarget) {
  return frameTarget.type === 'single'
    ? `@frame ${frameTarget.startFrame}`
    : `@frame ${frameTarget.startFrame}-${frameTarget.endFrame}`
}

export function FramePreviewCard({
  frameTarget,
  region,
  queuedPreviewRevision,
  thumbnailUrl,
  validationNote,
  onClear,
  onRetarget,
  className,
}: FramePreviewCardProps) {
  const reduceMotion = useStableReducedMotion()
  const isQueued = queuedPreviewRevision?.status === 'queued'
  const isQueueing = queuedPreviewRevision?.status === 'queueing'
  const resolvedThumbnailUrl = thumbnailUrl ?? region?.thumbnailUrl ?? null
  const assetNames = region?.assetNames?.slice(0, 3) ?? []

  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.99 }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,20,0.96)_0%,rgba(9,9,13,0.98)_100%)] p-2.5 shadow-[0_18px_36px_-26px_rgba(0,0,0,0.92),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.03]">
          {resolvedThumbnailUrl ? (
            <Image src={resolvedThumbnailUrl} alt="" fill className="object-cover" sizes="56px" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(127,242,212,0.18)_0%,rgba(127,242,212,0)_34%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.42)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(127,242,212,0.74)_50%,rgba(255,255,255,0)_100%)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-[13px] font-medium leading-5 text-white/94">
                  {region?.label ?? 'Manual frame target'}
                </div>
                <FrameTokenChip label={frameTargetText(frameTarget)} tone="blue" className="px-2.5 py-1 text-[10px]" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] leading-5 text-white/52">
                <Clock3 className="size-3.5 shrink-0 text-white/32" />
                <span>
                  {region
                    ? `${region.startFrame}-${region.endFrame} - ${region.category}${region.approximate ? ' - approximate' : ''}`
                    : `Targeting frames ${frameTarget.startFrame}-${frameTarget.endFrame}`}
                </span>
                {validationNote ? <span className="text-amber-100/72">{validationNote}</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <motion.button
                type="button"
                onClick={onRetarget}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-white/46 transition-colors hover:text-white/82"
                whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                aria-label="Retarget frame reference"
              >
                <ArrowUpRight className="size-3.5" />
              </motion.button>
              <motion.button
                type="button"
                onClick={onClear}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-white/46 transition-colors hover:text-white/82"
                whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                aria-label="Clear frame reference"
              >
                <X className="size-3.5" />
              </motion.button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {assetNames.map((assetName) => (
              <span
                key={assetName}
                className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/58"
              >
                {assetName}
              </span>
            ))}
            {region?.source ? (
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/44">
                {region.source.replace(/_/g, ' ')}
              </span>
            ) : null}
            {isQueueing ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#7ff2d4]/16 bg-[#7ff2d4]/10 px-2.5 py-1 text-[11px] text-[#c8fff2]">
                <InlineLoadingAnimation size={12} label="Preparing frame preview" />
                Preparing preview
              </span>
            ) : isQueued ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#7ff2d4]/16 bg-[#7ff2d4]/10 px-2.5 py-1 text-[11px] text-[#c8fff2]">
                <Sparkles className="size-3" />
                Preview queued
              </span>
            ) : (
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/46">
                Linked to current request
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
