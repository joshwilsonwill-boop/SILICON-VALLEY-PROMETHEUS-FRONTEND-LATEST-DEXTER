'use client'

import * as React from 'react'
import { BackButton } from '@/components/navigation/BackButton'
import SphereGallery3D from './SphereGallery3D'

type GalleryPlatform = {
  platform: string
  platformName: string
  color: string
  publishedUrl: string | null
}

type AnalyticsVideo = {
  id: string
  title: string
  thumbnailUrl: string | null
  platformBreakdown: GalleryPlatform[]
}

type AnalyticsResponse = {
  success: true
  videos: AnalyticsVideo[]
  metricsWarning: string | null
}

const PAGE_SIZE = 60

export function SphereAnalytics() {
  const [videos, setVideos] = React.useState<AnalyticsVideo[]>([])
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [activePlatform, setActivePlatform] = React.useState('all')
  const [page, setPage] = React.useState(0)
  const [metricsWarning, setMetricsWarning] = React.useState<string | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadVideos() {
      try {
        const response = await fetch('/api/analytics/video-performance', { cache: 'no-store', signal: controller.signal })
        const data = (await response.json().catch(() => null)) as AnalyticsResponse | null
        if (!response.ok || !data?.success) throw new Error('Analytics request failed')
        setVideos(data.videos)
        setMetricsWarning(data.metricsWarning)
        setLoadState('ready')
      } catch {
        if (!controller.signal.aborted) setLoadState('error')
      }
    }

    void loadVideos()
    return () => controller.abort()
  }, [])

  const platforms = React.useMemo(() => {
    const found = new Map<string, { name: string; color: string }>()
    videos.forEach((video) => video.platformBreakdown
      .filter((platform) => platform.publishedUrl)
      .forEach((platform) => found.set(platform.platform, { name: platform.platformName, color: platform.color })))
    return [...found.entries()].map(([id, platform]) => ({ id, ...platform }))
  }, [videos])

  const selectedPlatform = platforms.some((platform) => platform.id === activePlatform) ? activePlatform : 'all'
  const filteredVideos = React.useMemo(() => videos.filter((video) =>
    selectedPlatform === 'all'
      ? true
      : video.platformBreakdown.some((platform) => platform.platform === selectedPlatform && Boolean(platform.publishedUrl)),
  ), [selectedPlatform, videos])
  const thumbnailVideos = React.useMemo(() => filteredVideos.filter((video) => video.thumbnailUrl), [filteredVideos])
  const pageCount = Math.max(1, Math.ceil(thumbnailVideos.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageVideos = React.useMemo(
    () => thumbnailVideos.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [currentPage, thumbnailVideos],
  )
  const galleryItems = React.useMemo(() => pageVideos.map((video) => ({
    image: video.thumbnailUrl ?? undefined,
    link: video.platformBreakdown.find((platform) => platform.platform === selectedPlatform)?.publishedUrl
      ?? video.platformBreakdown.find((platform) => platform.publishedUrl)?.publishedUrl
      ?? '',
  })), [pageVideos, selectedPlatform])

  const selectPlatform = (platform: string) => {
    setActivePlatform(platform)
    setPage(0)
  }

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-[#F5F5F5]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[42%] size-[min(82vw,64rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(215,255,79,0.065),transparent_68%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(0,0,0,0.62)_100%)]" />
      </div>

      <header className="relative z-10 flex w-full items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-7 sm:pt-7 lg:px-10">
        <BackButton fallbackHref="/studio" className="mb-0 border border-white/[0.12] bg-white/[0.025] text-white hover:bg-white/[0.08]" />
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.26em] text-[#8D8E85]">PROMETHEUS / VIDEO ORBIT</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/55">
            {loadState === 'ready' ? `${filteredVideos.length} videos · ${thumbnailVideos.length} with thumbnails` : 'Loading video library'}
          </p>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-1 flex-col items-center justify-center px-4 pb-5 pt-2 sm:px-8 lg:px-12">
        <div className="w-full text-center">
          <p className="text-[9px] uppercase tracking-[0.34em] text-[#8D8E85]">Every cut, in orbit</p>
          <h1 className="mt-2 font-[family-name:var(--font-vogue-display)] text-[clamp(2.1rem,4vw,4.3rem)] leading-[0.95] text-[#F1F0EA]">Your videos. Every channel.</h1>
        </div>

        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Filter videos by social platform">
          <PlatformFilter active={selectedPlatform === 'all'} label="All channels" count={videos.length} onClick={() => selectPlatform('all')} />
          {platforms.map((platform) => {
            const count = videos.filter((video) => video.platformBreakdown.some((item) => item.platform === platform.id && Boolean(item.publishedUrl))).length
            return <PlatformFilter key={platform.id} active={selectedPlatform === platform.id} label={platform.name} count={count} color={platform.color} onClick={() => selectPlatform(platform.id)} />
          })}
        </div>

        <div className="relative flex min-h-[min(67vh,48rem)] w-full items-center justify-center overflow-hidden">
          {loadState === 'loading' ? (
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#8D8E85]">Finding your videos…</p>
          ) : loadState === 'error' ? (
            <p role="alert" className="text-center text-[12px] text-[#C7C7C0]">The video library could not be loaded. Refresh to try again.</p>
          ) : galleryItems.length > 0 ? (
            <SphereGallery3D
              images={galleryItems}
              branches={galleryItems.length}
              background="transparent"
              scale={55}
              speed={18}
              direction="counterclockwise"
              className="w-full"
              style={{ width: '100%', height: 'min(67vh, 48rem)', minWidth: 0, minHeight: 0, background: 'transparent' }}
            />
          ) : (
            <div className="max-w-lg px-6 text-center">
              <p className="font-[family-name:var(--font-vogue-display)] text-3xl text-[#F1F0EA]">The orbit is waiting.</p>
              <p className="mt-3 text-[12px] leading-6 text-[#8D8E85]">
                {filteredVideos.length > 0
                  ? 'These videos do not have thumbnails yet, so there is nothing to place in the gallery.'
                  : metricsWarning ?? 'Your generated videos will appear here as soon as they are available.'}
              </p>
            </div>
          )}
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-[#A8AA9D]">
            <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={currentPage === 0} className="min-h-10 px-3 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
            <span className="tabular-nums">{currentPage + 1} / {pageCount}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={currentPage >= pageCount - 1} className="min-h-10 px-3 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Next</button>
          </div>
        ) : null}

        <p className="mt-1 text-center text-[8px] uppercase tracking-[0.24em] text-[#676961]">Drag to orbit · Scroll to zoom · Select a video to open its channel</p>
      </section>
    </main>
  )
}

function PlatformFilter({
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
      className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[9px] uppercase tracking-[0.13em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F] ${active ? 'border-[#F1F0EA] bg-[#F1F0EA] text-black' : 'border-white/[0.12] bg-white/[0.025] text-[#A8AA9D] hover:border-white/30 hover:text-white'}`}
    >
      {color ? <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label}
      <span className={active ? 'text-black/50' : 'text-[#777970]'}>{count}</span>
    </button>
  )
}
