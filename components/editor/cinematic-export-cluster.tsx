'use client'

import { Download, LoaderCircle, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

interface CinematicExportClusterProps {
  className?: string
  onExport: () => void
  isExporting?: boolean
  isCompleted?: boolean
  onDownload?: () => void
  isDownloading?: boolean
}

/** A direct, compact action for the editor command island. */
export function CinematicExportCluster({
  className,
  onExport,
  isExporting = false,
  isCompleted = false,
  onDownload,
  isDownloading = false,
}: CinematicExportClusterProps) {
  const isDownloadAction = isCompleted && Boolean(onDownload)
  const isBusy = isDownloadAction ? isDownloading : isExporting
  const label = isDownloadAction
    ? isDownloading
      ? 'Preparing'
      : 'Download'
    : isExporting
      ? 'Exporting'
      : 'Export'

  return (
    <div className={cn('inline-flex shrink-0 items-center', className)}>
      <button
        type="button"
        onClick={isDownloadAction ? onDownload : onExport}
        disabled={isBusy}
        aria-label={isDownloadAction ? 'Download completed export' : 'Export video'}
        className={cn(
          'group inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium text-white transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-wait disabled:opacity-60',
          isDownloadAction
            ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100 hover:border-emerald-200/34 hover:bg-emerald-300/[0.14] hover:shadow-[0_12px_28px_-18px_rgba(52,211,153,0.5)]'
            : 'border-white/14 bg-white/[0.06] hover:-translate-y-px hover:border-white/24 hover:bg-white/[0.11] hover:shadow-[0_14px_30px_-20px_rgba(0,0,0,0.9)]',
        )}
      >
        {isBusy ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        ) : isDownloadAction ? (
          <Download className="size-3.5" aria-hidden="true" />
        ) : (
          <Sparkles className="size-3.5 text-white/60 transition-colors group-hover:text-white" aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>
    </div>
  )
}
