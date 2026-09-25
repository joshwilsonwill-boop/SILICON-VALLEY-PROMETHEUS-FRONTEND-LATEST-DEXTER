'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { SlideDrawer } from '@/components/ui/slide-drawer'
import { MotionBrainPanel } from '@/components/editor/MotionBrainPanel'
import type { MusicRecommendation } from '@/lib/types'

export interface MotionDrawerProps {
  isOpen: boolean
  onClose: () => void
  width?: string
  track?: MusicRecommendation | null
  children?: React.ReactNode
}

export function MotionDrawer({ isOpen, onClose, width = 'min(380px, calc(100vw - 24px))', track, children }: MotionDrawerProps) {
  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      direction="right"
      width={width}
      ariaLabel="Motion Brain drawer"
      backdropBlur
    >
      <header className="flex min-h-16 items-center justify-between border-b border-white/[0.08] px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">Motion Brain</h2>
          <p className="truncate text-xs text-white/48">GSAP Animation Controls</p>
        </div>
        <button
          type="button"
          aria-label="Close Motion Brain drawer"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent-cyan"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {children ?? <MotionBrainPanel track={track} />}
      </div>
    </SlideDrawer>
  )
}
