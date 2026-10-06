'use client'

import * as React from 'react'
import Image from 'next/image'
import { ArrowUpRight, Play } from 'lucide-react'

type GalleryPlatform = {
  platform: string
  platformName: string
  color: string
  connected: boolean
  views: number
  likes: number
  comments: number
  shares: number
  watchTimeSeconds: number
  retentionRate: number
  engagementRate: number
  publishedUrl: string | null
  capturedAt: string | null
}

type GalleryVideo = {
  id: string
  title: string
  status: string
  thumbnailUrl: string | null
  totals: { views: number; retentionRate: number; engagementRate: number }
  platformBreakdown: GalleryPlatform[]
}

type VideoPlatformGalleryProps = {
  videos: GalleryVideo[]
  onOpenVideo: (video: GalleryVideo, platformId: string | null) => void
}

export function VideoPlatformGallery({ videos, onOpenVideo }: VideoPlatformGalleryProps) {
  const [activePlatform, setActivePlatform] = React.useState('all')
  const publishedPlatforms = React.useMemo(() => {
    const platforms = new Map<string, { name: string; color: string }>()
    videos.forEach((video) => {
      video.platformBreakdown
        .filter((platform) => platform.publishedUrl)
        .forEach((platform) => platforms.set(platform.platform, { name: platform.platformName, color: platform.color }))
    })
    return [...platforms.entries()].map(([id, platform]) => ({ id, ...platform }))
  }, [videos])

  const selectedPlatform = publishedPlatforms.some((platform) => platform.id === activePlatform) ? activePlatform : 'all'

  const visibleVideos = videos.filter((video) =>
    selectedPlatform === 'all'
      ? true
      : video.platformBreakdown.some((platform) => platform.platform === selectedPlatform && Boolean(platform.publishedUrl)),
  )

  if (videos.length === 0) {
    return (
      <div className="border-y border-white/[0.09] py-12 text-center">
        <p className="text-[15px] font-light text-[#F1F0EA]">Your video library is ready for its first cut.</p>
        <p className="mt-2 text-[12px] text-[#8D8E85]">Videos created in Prometheus will appear here, with published channels shown as they become available.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-4" role="group" aria-label="Filter videos by social platform">
        <PlatformTab active={selectedPlatform === 'all'} label="All videos" count={videos.length} onClick={() => setActivePlatform('all')} />
        {publishedPlatforms.map((platform) => {
          const count = videos.filter((video) => video.platformBreakdown.some((item) => item.platform === platform.id && Boolean(item.publishedUrl))).length
          return (
            <PlatformTab
              key={platform.id}
              active={selectedPlatform === platform.id}
              label={platform.name}
              count={count}
              color={platform.color}
              onClick={() => setActivePlatform(platform.id)}
            />
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleVideos.map((video, index) => {
          const publishedTo = video.platformBreakdown.filter((platform) => platform.publishedUrl)
          return (
            <article key={video.id} className="group overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.025] transition-colors duration-300 hover:border-white/[0.22] hover:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => onOpenVideo(video, selectedPlatform === 'all' ? null : selectedPlatform)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D7FF4F]"
                aria-label={`Open analytics for ${video.title}`}
              >
                <div className="relative aspect-video overflow-hidden bg-[#101010]">
                  {video.thumbnailUrl ? (
                    <Image src={video.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                  ) : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(215,255,79,0.12),transparent_55%),linear-gradient(135deg,#171717,#050505)]" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                    <Play className="size-3 fill-current" /> Video {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-md">{video.status}</span>
                </div>
                <div className="px-4 pb-4 pt-4">
                  <h3 className="truncate text-[14px] text-[#F1F0EA]">{video.title}</h3>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-[#777970]">Total reach</span>
                    <span className="text-[13px] tabular-nums text-[#D8D8D0]">{formatReach(video.totals.views)}</span>
                  </div>
                </div>
              </button>
              <div className="flex min-h-12 flex-wrap items-center gap-2 border-t border-white/[0.08] px-4 py-2.5">
                {publishedTo.length > 0 ? publishedTo.map((platform) => (
                  <a
                    key={platform.platform}
                    href={platform.publishedUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/[0.1] px-2.5 text-[9px] uppercase tracking-[0.12em] text-[#A8AA9D] transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label={`Open ${video.title} on ${platform.platformName}`}
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: platform.color }} />
                    {platform.platformName}
                    <ArrowUpRight className="size-3" />
                  </a>
                )) : <span className="text-[9px] uppercase tracking-[0.14em] text-[#777970]">Not published yet</span>}
              </div>
            </article>
          )
        })}
      </div>
      {visibleVideos.length === 0 ? <p className="border-y border-white/[0.09] py-10 text-center text-[12px] text-[#8D8E85]">No videos have been published to this channel yet.</p> : null}
    </div>
  )
}

function PlatformTab({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  color?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${active ? 'border-[#F1F0EA] bg-[#F1F0EA] text-black' : 'border-white/[0.1] bg-white/[0.025] text-[#A8AA9D] hover:border-white/25 hover:text-white'}`}
    >
      {color ? <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label}
      <span className={active ? 'text-black/55' : 'text-[#777970]'}>{count}</span>
    </button>
  )
}

function formatReach(value: number) {
  return new Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}
