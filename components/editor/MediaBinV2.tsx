'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Clock, Film, GripVertical, MoreVertical, Music, Search, Type } from 'lucide-react'
import { AccessibleLabel } from '@/components/editor/a11y/accessible-label'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import {
  formatBytes,
  getSourceAssetDisplayName,
  type SourceAssetV2,
  useSourceAssets,
} from '@/hooks/use-source-assets'
import { useDurableJobs } from '@/hooks/use-durable-jobs'
import { cn } from '@/lib/utils'

type MediaBinV2Tab = 'clips' | 'audio' | 'text' | 'assets'

export interface MediaBinV2Props {
  projectId: string
  className?: string
}

const tabs = [
  { id: 'clips', label: 'Clips', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'assets', label: 'Assets', icon: Box },
] as const

function getAssetType(asset: SourceAssetV2): 'clip' | 'audio' | 'text' | 'asset' {
  const mimeType = String(asset.mime_type ?? asset.type ?? '').toLowerCase()
  const name = getSourceAssetDisplayName(asset).toLowerCase()

  if (mimeType.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/.test(name)) return 'clip'
  if (mimeType.startsWith('audio/') || /\.(wav|mp3|aac|m4a|flac)$/.test(name)) return 'audio'
  if (mimeType.startsWith('text/') || /\.(txt|srt|vtt|md)$/.test(name)) return 'text'
  return 'asset'
}

function getTabType(tab: MediaBinV2Tab) {
  if (tab === 'clips') return 'clip'
  if (tab === 'audio') return 'audio'
  if (tab === 'text') return 'text'
  return 'asset'
}

function formatDuration(seconds: unknown) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function hasActiveUploadStatus(status: string | null | undefined) {
  return status === 'queued' || status === 'processing' || status === 'uploading'
}

export function MediaBinV2({ projectId, className }: MediaBinV2Props) {
  const [activeTab, setActiveTab] = React.useState<MediaBinV2Tab>('clips')
  const [search, setSearch] = React.useState('')
  const [width, setWidth] = React.useState(280)
  const [isResizing, setIsResizing] = React.useState(false)
  const { assets, loading, error, storageUsedLabel, storageQuotaLabel, empty } = useSourceAssets(projectId)
  const { jobs } = useDurableJobs(projectId)

  const activeUpload = jobs.some((job) => {
    const type = String(job.type ?? '').toLowerCase()
    return type.includes('upload') && hasActiveUploadStatus(job.status)
  })

  const filteredAssets = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const currentType = getTabType(activeTab)

    return assets.filter((asset) => {
      const name = getSourceAssetDisplayName(asset)
      const matchesTab = getAssetType(asset) === currentType
      const matchesSearch = !normalizedSearch || name.toLowerCase().includes(normalizedSearch)
      return matchesTab && matchesSearch
    })
  }, [activeTab, assets, search])

  const handleResize = React.useCallback((event: MouseEvent) => {
    setWidth(Math.min(Math.max(event.clientX, 200), 400))
  }, [])

  const stopResizing = React.useCallback(() => {
    setIsResizing(false)
  }, [])

  React.useEffect(() => {
    if (!isResizing) return

    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResizing)

    return () => {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResizing)
    }
  }, [handleResize, isResizing, stopResizing])

  return (
    <div className={cn('relative flex h-full', className)} style={{ width: `${width}px` }}>
      <div className="glass-panel flex flex-1 flex-col overflow-hidden rounded-none border-y-0 border-l-0 bg-void/40">
        <div className="border-b border-white/5 p-4">
          <AccessibleLabel htmlFor="media-bin-v2-search" srOnly>
            Search media
          </AccessibleLabel>
          <div className="group relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-accent-cyan" />
            <input
              id="media-bin-v2-search"
              type="search"
              placeholder="Search media..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-4 text-xs text-white outline-none transition-all placeholder:text-white/20 focus:border-accent-cyan/30 focus:bg-accent-cyan/[0.02]"
            />
          </div>
        </div>

        <div className="flex border-b border-white/5" role="tablist" aria-label="Media asset categories">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1.5 py-3 transition-all',
                activeTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/60',
              )}
            >
              <tab.icon className="size-3.5" aria-hidden="true" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id ? (
                <motion.div
                  layoutId="mediaBinV2ActiveTab"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-cyan shadow-[0_0_10px_var(--accent-cyan)]"
                />
              ) : null}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin scrollbar-thumb-white/10 flex-1 space-y-2 overflow-y-auto p-3">
          {loading ? (
            <div className="flex min-h-[17.5rem] items-center justify-center" aria-label="Loading media assets">
              <InlineLoadingAnimation size={40} label="Loading media assets" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-3 text-xs leading-5 text-rose-100">
              Media unavailable: {error}
            </div>
          ) : empty ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-xs leading-5 text-white/54">
              No media yet. Upload your first asset.
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-xs leading-5 text-white/54">
              No assets match this view.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredAssets.map((asset, index) => {
                const assetType = getAssetType(asset)
                const duration = formatDuration(asset.duration_seconds)
                const thumbnail = typeof asset.thumbnail_url === 'string' ? asset.thumbnail_url : null
                const name = getSourceAssetDisplayName(asset)

                return (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: index * 0.03 }}
                    className="group flex cursor-grab items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2 transition-all hover:border-white/10 hover:bg-white/[0.05] active:cursor-grabbing"
                  >
                    {thumbnail ? (
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-white/10">
                        <div
                          role="img"
                          aria-label={name}
                          className="size-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url(${thumbnail})` }}
                        />
                      </div>
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/5">
                        {assetType === 'audio' ? (
                          <Music className="size-4 text-accent-green" aria-hidden="true" />
                        ) : assetType === 'text' ? (
                          <Type className="size-4 text-accent-amber" aria-hidden="true" />
                        ) : assetType === 'clip' ? (
                          <Film className="size-4 text-accent-cyan" aria-hidden="true" />
                        ) : (
                          <Box className="size-4 text-chrome-dim" aria-hidden="true" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-white/80">{name}</div>
                      <div className="mt-1 flex items-center gap-2 text-[9px] text-white/30">
                        {duration ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-2.5" aria-hidden="true" />
                            {duration}
                          </span>
                        ) : null}
                        <span>{formatBytes(typeof asset.size_bytes === 'number' ? asset.size_bytes : 0)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label={`More actions for ${name}`}
                      className="p-1 text-white/20 opacity-0 transition-all hover:text-white group-hover:opacity-100"
                    >
                      <MoreVertical className="size-3.5" aria-hidden="true" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 bg-black/20 p-3 text-[9px] font-bold uppercase tracking-widest text-white/20">
          <span>
            Storage: {storageUsedLabel} / {storageQuotaLabel}
          </span>
          {activeUpload ? (
            <span className="inline-flex items-center gap-1.5 text-accent-cyan">
              <InlineLoadingAnimation size={12} label="Syncing media assets" />
              Syncing...
            </span>
          ) : (
            <span className="text-white/24">Ready</span>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label="Resize media bin"
        onMouseDown={() => setIsResizing(true)}
        className={cn(
          'absolute bottom-0 right-0 top-0 z-20 flex w-3 cursor-ew-resize items-center justify-center transition-colors hover:bg-accent-cyan/20',
          isResizing && 'bg-accent-cyan/30',
        )}
      >
        <GripVertical className="h-8 w-3 text-white/20" aria-hidden="true" />
      </button>
    </div>
  )
}
