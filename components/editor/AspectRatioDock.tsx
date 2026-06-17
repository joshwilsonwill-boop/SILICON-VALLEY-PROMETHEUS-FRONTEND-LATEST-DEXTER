'use client'

import * as React from 'react'
import { ArrowDownToLine, Maximize2, Minimize2, Square } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { PreviewFitMode, PreviewFramePreset } from '@/lib/types'

type DockPreset = Extract<PreviewFramePreset, 'source' | '16:9' | '9:16' | '1:1'>

interface AspectRatioDockProps {
  className?: string
  fitMode: PreviewFitMode
  onFitModeChange: (mode: PreviewFitMode) => void
  onImport: () => void
  onPresetChange: (preset: PreviewFramePreset) => void
  value: PreviewFramePreset
}

const DOCK_ITEMS: Array<
  | { kind: 'preset'; label: string; preset: DockPreset; tooltip: string }
  | { kind: 'mode'; label: string; mode: PreviewFitMode; tooltip: string }
  | { kind: 'action'; label: string; tooltip: string }
> = [
  { kind: 'preset', preset: 'source', label: 'Native', tooltip: 'Native' },
  { kind: 'preset', preset: '16:9', label: 'Wide', tooltip: 'Wide' },
  { kind: 'preset', preset: '9:16', label: 'Vertical', tooltip: 'Vertical' },
  { kind: 'preset', preset: '1:1', label: 'Square', tooltip: 'Square' },
  { kind: 'mode', mode: 'fill', label: 'Fill', tooltip: 'Fill' },
  { kind: 'mode', mode: 'fit', label: 'Fit', tooltip: 'Fit' },
  { kind: 'action', label: 'Import', tooltip: 'Import' },
]

const DOCK_ITEM_SIZE = 48

export function AspectRatioDock({
  className,
  fitMode,
  onFitModeChange,
  onImport,
  onPresetChange,
  value,
}: AspectRatioDockProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  return (
    <div
      className={cn(
        'absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] px-4 py-2 [backdrop-filter:blur(20px)] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]',
        className,
      )}
      role="toolbar"
      aria-label="Video aspect dock"
      onPointerLeave={() => setHoveredIndex(null)}
    >
      <div className="flex items-end gap-1">
        {DOCK_ITEMS.map((item, index) => {
          const active =
            item.kind === 'preset'
              ? value === item.preset
              : item.kind === 'mode'
                ? fitMode === item.mode
                : false
          const distance = hoveredIndex === null ? 99 : Math.abs(index - hoveredIndex)
          const scale = hoveredIndex === null ? 1 : distance === 0 ? 1.25 : distance === 1 ? 1.1 : distance === 2 ? 1.05 : 1

          return (
            <div key={item.label} className="relative flex flex-col items-center justify-end pb-7">
              <div
                className={cn(
                  'pointer-events-none absolute bottom-14 mb-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(20,20,22,0.9)] px-2 py-1 text-[11px] text-[#CCC] opacity-0 translate-y-1 backdrop-blur transition-all duration-150',
                  hoveredIndex === index && 'opacity-100 translate-y-0',
                )}
              >
                {item.tooltip}
              </div>
              <button
                type="button"
                aria-pressed={active}
                onPointerEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onClick={() => {
                  if (item.kind === 'preset') {
                    onPresetChange(item.preset)
                    return
                  }
                  if (item.kind === 'mode') {
                    onFitModeChange(item.mode)
                    return
                  }
                  onImport()
                }}
                className={cn(
                  'group flex size-12 items-center justify-center rounded-[14px] border transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
                  active
                    ? 'border-white/20 bg-[rgba(255,255,255,0.1)] shadow-[0_4px_12px_rgba(140,180,255,0.15)] ring-1 ring-[rgba(255,255,255,0.2)]'
                    : item.kind === 'action'
                      ? 'border-white/12 bg-[rgba(255,255,255,0.1)]'
                      : 'border-white/8 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)]',
                )}
                style={{ width: DOCK_ITEM_SIZE, height: DOCK_ITEM_SIZE, transform: `scale(${scale})` }}
              >
                {item.kind === 'preset' ? (
                  <PresetIcon preset={item.preset} active={active} />
                ) : item.kind === 'mode' ? (
                  item.mode === 'fill' ? (
                    <Maximize2 className={cn('size-4', active ? 'text-white' : 'text-white/70')} />
                  ) : (
                    <Minimize2 className={cn('size-4', active ? 'text-white' : 'text-white/70')} />
                  )
                ) : (
                  <ArrowDownToLine className="size-4 text-white/80" />
                )}
              </button>
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/64">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PresetIcon({
  active,
  preset,
}: {
  active: boolean
  preset: DockPreset
}) {
  const strokeClass = active ? 'text-white' : 'text-white/72'

  if (preset === '1:1') {
    return <Square className={cn('size-4', strokeClass)} />
  }

  if (preset === '9:16') {
    return (
      <div
        className={cn(
          'relative h-5 w-4 rounded-[5px] border-2',
          strokeClass,
        )}
        style={{ borderColor: 'currentColor' }}
      />
    )
  }

  if (preset === '16:9') {
    return (
      <div
        className={cn(
          'relative h-4 w-6 rounded-[5px] border-2',
          strokeClass,
        )}
        style={{ borderColor: 'currentColor' }}
      />
    )
  }

  return (
    <div className="relative h-5 w-5 rounded-[7px] border border-white/15 bg-[rgba(255,255,255,0.02)]">
      <span className="absolute right-1 top-1 size-1 rounded-full bg-white/80" />
    </div>
  )
}
