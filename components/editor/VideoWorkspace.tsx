'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

import { AspectRatioDock } from '@/components/editor/AspectRatioDock'
import { InfinityLoader } from '@/components/editor/InfinityLoader'
import { cn } from '@/lib/utils'
import type { PreviewFitMode, PreviewFramePreset } from '@/lib/types'

interface VideoWorkspaceProps {
  aspectPreset: PreviewFramePreset
  children?: React.ReactNode
  className?: string
  fitMode: PreviewFitMode
  hasMedia: boolean
  isDragActive?: boolean
  loading?: boolean
  onAspectPresetChange: (preset: PreviewFramePreset) => void
  onEmptyClick: () => void
  onEmptyDragLeave: React.DragEventHandler<HTMLButtonElement>
  onEmptyDragOver: React.DragEventHandler<HTMLButtonElement>
  onEmptyDrop: React.DragEventHandler<HTMLButtonElement>
  onFitModeChange: (mode: PreviewFitMode) => void
  onImport: () => void
}

export function VideoWorkspace({
  aspectPreset,
  children,
  className,
  fitMode,
  hasMedia,
  isDragActive = false,
  loading = false,
  onAspectPresetChange,
  onEmptyClick,
  onEmptyDragLeave,
  onEmptyDragOver,
  onEmptyDrop,
  onFitModeChange,
  onImport,
}: VideoWorkspaceProps) {
  return (
    <>
      <section
        className={cn(
          'relative overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]',
          'h-[clamp(250px,40vh,460px)] w-full',
          className,
        )}
      >
        {hasMedia ? (
          children
        ) : (
          <button
            type="button"
            aria-label="Import source media"
            aria-busy={loading}
            onClick={onEmptyClick}
            onDragLeave={onEmptyDragLeave}
            onDragOver={onEmptyDragOver}
            onDrop={onEmptyDrop}
            className={cn(
              'group relative flex h-full w-full items-center justify-center overflow-hidden text-[#444] transition-colors duration-300',
              isDragActive ? 'bg-[rgba(159,246,227,0.06)]' : 'bg-[rgba(255,255,255,0.01)]',
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[10%] rounded-[18px] border border-dashed border-white/10"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(255,255,255,0.28) 0.7px, rgba(255,255,255,0) 1px)',
                backgroundSize: '22px 22px',
                maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 68%)',
              }}
            />
            <motion.span
              aria-hidden
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              className="prometheus-empty-pulse relative z-10 grid size-12 place-items-center rounded-[16px] border border-white/10 bg-[rgba(255,255,255,0.03)]"
            >
              <Plus className="size-6" />
            </motion.span>
            <style>{`
              @keyframes prometheus-empty-pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
              }

              .prometheus-empty-pulse {
                animation: prometheus-empty-pulse 2s ease-in-out infinite;
              }
            `}</style>
          </button>
        )}

        {hasMedia ? (
          <AspectRatioDock
            value={aspectPreset}
            fitMode={fitMode}
            onPresetChange={onAspectPresetChange}
            onFitModeChange={onFitModeChange}
            onImport={onImport}
          />
        ) : null}
      </section>

      <InfinityLoader visible={loading} mode="infinity" />
    </>
  )
}
