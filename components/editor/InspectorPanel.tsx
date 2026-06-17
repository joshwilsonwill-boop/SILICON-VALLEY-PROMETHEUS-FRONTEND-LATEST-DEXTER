'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { LuxuryVignette } from '@/components/editor/luxury-vignette'
import { buildRevealVariants } from '@/lib/motion'
import type {
  Project,
  ProcessingJob,
  PreviewFramePreset,
  BottomMode,
  PreviewMediaKind,
  AnimationPlan
} from '@/lib/types'

export interface InspectorPanelProps {
  inspectorViewportRef: React.RefObject<HTMLDivElement | null>
  project: Project | null
  job: ProcessingJob | null
  previewFramePreset: PreviewFramePreset
  clipModeActive: boolean
  fitMode: 'fill' | 'fit'
  scale: number
  offsetX: number
  offsetY: number
  sourceMetrics: any
  hasSourceAsset: boolean
  sourceStageError: string | null
  previewKind: PreviewMediaKind
  transportTime: string
  promptText: string
  previewOverlayPlan: AnimationPlan | null
  bottomMode: BottomMode
  onSetViralClipSplitPreviewActive: (active: boolean) => void
  onSetPreviewFramePreset: (preset: PreviewFramePreset) => void
  onPreviewFrameLabel: (preset: PreviewFramePreset) => string
  onSetFitMode: (mode: 'fill' | 'fit') => void
  onSetScale: (scale: number) => void
  onSetOffsetX: (offset: number) => void
  onSetOffsetY: (offset: number) => void
  onPickSource: () => void
}

export function InspectorPanel({
  inspectorViewportRef,
}: InspectorPanelProps) {
  return (
    <motion.aside
      layout
      className="glass-panel relative flex h-full min-h-0 flex-col overflow-hidden border-y-0 border-r-0 rounded-none bg-abyss/40 backdrop-blur-2xl overscroll-contain lg:col-span-1"
    >
      <LuxuryVignette tone="cool" />

      <div
        ref={inspectorViewportRef}
        className="premium-scroll-mask flex-1 overflow-y-auto px-4 py-5"
      >
        <motion.div
          variants={buildRevealVariants({ delay: 0.1, distance: 20, blur: 10, duration: 0.4 })}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative"
        />
      </div>
    </motion.aside>
  )
}

