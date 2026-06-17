'use client'

import { AspectRatioDock } from '@/components/editor/AspectRatioDock'
import type { PreviewFitMode, PreviewFramePreset } from '@/lib/types'

export const logarithmicRatioStops: Array<{
  detail: string
  detent: number
  label: string
  preset: PreviewFramePreset
}> = [
  { preset: 'source', label: 'Source', detail: 'Native', detent: 0 },
  { preset: '16:9', label: '16:9', detail: 'Wide', detent: 1.12 },
  { preset: '9:16', label: '9:16', detail: 'Vertical', detent: 2.86 },
  { preset: '1:1', label: '1:1', detail: 'Square', detent: 4.28 },
]

export const magneticDetents = logarithmicRatioStops.map((stop) => stop.detent)

export interface LiquidFrameSelectorProps {
  fitMode: PreviewFitMode
  hasSourceAsset: boolean
  onFitModeChange: (mode: PreviewFitMode) => void
  onPickSource: () => void
  onPresetChange: (preset: PreviewFramePreset) => void
  value: PreviewFramePreset
}

export function LiquidFrameSelector({
  fitMode,
  onFitModeChange,
  onPickSource,
  onPresetChange,
  value,
}: LiquidFrameSelectorProps) {
  return (
    <div className="relative min-h-[96px] overflow-visible rounded-[24px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4">
      <AspectRatioDock
        value={value}
        fitMode={fitMode}
        onPresetChange={onPresetChange}
        onFitModeChange={onFitModeChange}
        onImport={onPickSource}
        className="relative bottom-auto left-auto translate-x-0"
      />
    </div>
  )
}
