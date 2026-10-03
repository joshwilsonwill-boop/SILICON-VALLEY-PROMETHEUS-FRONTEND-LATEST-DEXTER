'use client'

import * as React from 'react'
import {
  Bookmark,
  Columns2,
  Copy,
  Maximize2,
  Minimize2,
  Magnet,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EditorialTimelineToolbarProps {
  currentTimeSec: number
  effectiveDuration: number
  zoom: number
  onZoomChange: (zoom: number) => void
  activeTool?: 'select' | 'razor'
  onSelectTool?: (tool: 'select' | 'razor') => void
  onSplitClip?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onDeleteClip?: () => void
  onDuplicateClip?: () => void
  onAddMarker?: () => void
  onToggleSnapping?: () => void
  snapping?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  onToggleLayout?: () => void
  playing?: boolean
  onTogglePlayback?: () => void
  canUndo?: boolean
  canRedo?: boolean
  className?: string
}

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export function EditorialTimelineToolbar({
  currentTimeSec,
  effectiveDuration,
  zoom,
  onZoomChange,
  activeTool = 'select',
  onSelectTool,
  onSplitClip,
  onUndo,
  onRedo,
  onDeleteClip,
  onDuplicateClip,
  onAddMarker,
  onToggleSnapping,
  snapping = true,
  isFullscreen = false,
  onToggleFullscreen,
  onToggleLayout,
  playing = false,
  onTogglePlayback,
  canUndo = false,
  canRedo = false,
  className,
}: EditorialTimelineToolbarProps) {
  return (
    <div
      data-editorial-timeline-toolbar
      className={cn(
        'flex h-11 shrink-0 items-center justify-between border-b border-white/8 bg-[#090d14] px-3 sm:px-4',
        className,
      )}
    >
      {/* Left side: NLE Editorial Tools matching 9103 Reference */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Selection cursor tool (active indicator) */}
        <button
          type="button"
          onClick={() => onSelectTool?.('select')}
          data-tool="select"
          aria-label="Selection Tool"
          title="Selection Tool (V)"
          className={cn(
            'grid size-8 place-items-center rounded-md transition-all',
            activeTool === 'select'
              ? 'border border-[#9df65a]/60 bg-[#9df65a]/15 text-[#9df65a] shadow-[0_0_8px_rgba(157,246,90,0.25)]'
              : 'border border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
          )}
        >
          <MousePointer2 className="size-3.5 fill-current" />
        </button>

        {/* Razor / Split tool */}
        <button
          type="button"
          onClick={() => {
            onSelectTool?.('razor')
            onSplitClip?.()
          }}
          data-tool="razor"
          data-action="split-clip"
          aria-label="Razor / Split Clip"
          title="Razor / Split Clip at Playhead (S)"
          className={cn(
            'grid size-8 place-items-center rounded-md transition-all',
            activeTool === 'razor'
              ? 'border border-[#9df65a]/60 bg-[#9df65a]/15 text-[#9df65a]'
              : 'border border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
          )}
        >
          <Scissors className="size-3.5" />
        </button>

        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!onUndo || !canUndo}
          data-action="undo"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
        >
          <Undo2 className="size-3.5" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!onRedo || !canRedo}
          data-action="redo"
          aria-label="Redo"
          title="Redo (Ctrl+Y)"
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
        >
          <Redo2 className="size-3.5" />
        </button>

        {/* Trash / Delete selected */}
        <button
          type="button"
          onClick={onDeleteClip}
          disabled={!onDeleteClip}
          data-action="delete-clip"
          aria-label="Delete selected clip"
          title="Delete selected clip (Backspace / Delete)"
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-red-400/30 hover:bg-red-950/20 hover:text-red-300"
        >
          <Trash2 className="size-3.5" />
        </button>

        {/* Duplicate selected */}
        <button
          type="button"
          onClick={onDuplicateClip}
          disabled={!onDuplicateClip}
          data-action="duplicate-clip"
          aria-label="Duplicate selected clip"
          title="Duplicate selected clip (Ctrl+D)"
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
        >
          <Copy className="size-3.5" />
        </button>

        {/* Add Marker */}
        <button
          type="button"
          data-action="add-marker"
          onClick={onAddMarker}
          disabled={!onAddMarker}
          aria-label="Add Timeline Marker"
          title="Add Timeline Marker (M)"
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
        >
          <Bookmark className="size-3.5" />
        </button>

        {/* Magnet / Snap toggle */}
        <button
          type="button"
          onClick={onToggleSnapping}
          data-action="toggle-snapping"
          aria-label={snapping ? 'Disable timeline snapping' : 'Enable timeline snapping'}
          title={snapping ? 'Snapping Enabled (N)' : 'Snapping Disabled (N)'}
          className={cn(
            'grid size-8 place-items-center rounded-md transition-all',
            snapping
              ? 'text-[#9df65a] hover:bg-[#9df65a]/10'
              : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80',
          )}
        >
          <Magnet className="size-3.5" />
        </button>

        <div className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />

        {/* Optional Play/Pause toggle in toolbar */}
        {onTogglePlayback ? (
          <button
            type="button"
            onClick={onTogglePlayback}
            aria-label={playing ? 'Pause timeline' : 'Play timeline'}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
            className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-white/80 transition-all hover:border-white/20 hover:text-white"
          >
            {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
          </button>
        ) : null}

        {/* Timecode display */}
        <div className="ml-1 flex items-center font-mono text-xs tabular-nums text-white/90">
          <span className="font-semibold text-white">{formatTimecode(currentTimeSec)}</span>
          <span className="mx-1 text-white/30">/</span>
          <span className="text-white/55">{formatTimecode(effectiveDuration)}</span>
        </div>
      </div>

      {/* Right side: Zoom slider, Layout view, Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-3">
        <label className="flex items-center gap-1.5 text-white/55">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.7, zoom - 0.2))}
            aria-label="Zoom Out"
            className="grid size-7 place-items-center rounded hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <input
            aria-label="Timeline zoom"
            type="range"
            min="0.7"
            max="2.5"
            step="0.05"
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#9df65a] transition-all sm:w-24"
          />
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(2.5, zoom + 0.2))}
            aria-label="Zoom In"
            className="grid size-7 place-items-center rounded hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </label>

        <div className="hidden h-4 w-px bg-white/10 sm:block" />

        {/* Layout toggle */}
        <button
          type="button"
          onClick={onToggleLayout}
          aria-label="Toggle split view"
          title="Toggle preview layout"
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
        >
          <Columns2 className="size-3.5" />
        </button>

        {/* Fullscreen / expand timeline */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen timeline' : 'Fullscreen timeline'}
          title={isFullscreen ? 'Exit fullscreen timeline' : 'Fullscreen timeline'}
          className="grid size-8 place-items-center rounded-md border border-transparent text-white/55 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}
