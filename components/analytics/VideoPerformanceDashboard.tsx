'use client'

import * as React from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, ArrowUpRight, Eye, Heart, MessageCircle, Share2, Timer } from 'lucide-react'

import { BackButton } from '@/components/navigation/BackButton'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  adaptAccountScopedAnalytics,
  filterVideos,
  rankVideos,
  thumbnailSource,
  type DashboardAccount,
  type DashboardVideo,
  type PerformanceMetric,
} from '@/lib/analytics/video-performance-dashboard'
import { PolaroidLineCarousel, type Slide, type LandPalette } from '@/components/ui/polaroid-line-carousel'
import { captureFirstVideoFrame } from '@/lib/media/capture-first-video-frame'
import type { LayaCatalogAppraisal } from '@/lib/analytics/laya-types'

const metricOptions: Array<{ value: PerformanceMetric; label: string }> = [
  { value: 'views', label: 'Views' },
  { value: 'engagementRate', label: 'Engagement rate' },
  { value: 'retentionRate', label: 'Retention rate' },
  { value: 'watchTimeSeconds', label: 'Watch time' },
  { value: 'likes', label: 'Likes' },
  { value: 'comments', label: 'Comments' },
  { value: 'shares', label: 'Shares' },
]

type LoadState = 'loading' | 'ready' | 'error'

type PrometheusTrackedVideo = {
  id: string
  title: string
  status?: string
  thumbnailUrl?: string | null
  previewUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  totals?: {
    views?: number
    likes?: number
    comments?: number
    shares?: number
    watchTimeSeconds?: number
    retentionRate?: number
    engagementRate?: number
  }
  platformBreakdown?: Array<{
    platform: string
    platformName: string
    views?: number
    publishedUrl?: string | null
  }>
}

function formatCompactViews(count?: number) {
  if (!count) return null
  return new Intl.NumberFormat('en', { notation: count >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(count)
}

export function VideoPerformanceDashboard() {
  const [loadState, setLoadState] = React.useState<LoadState>('loading')
  const [accounts, setAccounts] = React.useState<DashboardAccount[]>([])
  const [videosByAccount, setVideosByAccount] = React.useState<Record<string, DashboardVideo[]>>({})
  const [trackedVideos, setTrackedVideos] = React.useState<PrometheusTrackedVideo[]>([])
  const [appraisal, setAppraisal] = React.useState<LayaCatalogAppraisal | null>(null)
  const [selectedAccountId, setSelectedAccountId] = React.useState('')
  const [selectedPlatform, setSelectedPlatform] = React.useState('all')
  const [metric, setMetric] = React.useState<PerformanceMetric>('views')
  const [direction, setDirection] = React.useState<'desc' | 'asc'>('desc')
  const [frames, setFrames] = React.useState<Record<string, string>>({})
  const [frameFailures, setFrameFailures] = React.useState<Record<string, boolean>>({})
  const [frameRequests, setFrameRequests] = React.useState<Record<string, boolean>>({})
  const framesRef = React.useRef(frames)
  const frameFailuresRef = React.useRef(frameFailures)
  const [selectedAnalyticsVideo, setSelectedAnalyticsVideo] = React.useState<DashboardVideo | PrometheusTrackedVideo | null>(null)
  const [requestKey, setRequestKey] = React.useState(0)

  React.useEffect(() => { framesRef.current = frames }, [frames])
  React.useEffect(() => { frameFailuresRef.current = frameFailures }, [frameFailures])

  React.useEffect(() => {
    const controller = new AbortController()
    setLoadState('loading')
    async function load() {
      try {
        const response = await fetch('/api/analytics/video-performance', { cache: 'no-store', signal: controller.signal })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) throw new Error('Analytics request failed')
        const adapted = adaptAccountScopedAnalytics(payload)
        if (controller.signal.aborted) return
        setAccounts(adapted.accounts)
        setVideosByAccount(adapted.videosByAccount)
        if (payload && typeof payload === 'object' && 'appraisal' in payload) {
          setAppraisal(((payload as { appraisal?: LayaCatalogAppraisal }).appraisal) ?? null)
        }

        const rawPayloadVideos = (payload && typeof payload === 'object' && Array.isArray((payload as { videos?: unknown }).videos))
          ? ((payload as { videos: unknown[] }).videos as Array<Record<string, unknown>>)
          : []
        const mappedTrackedVideos: PrometheusTrackedVideo[] = rawPayloadVideos.map((item) => {
          const latestExport = item.latestExport && typeof item.latestExport === 'object' ? (item.latestExport as Record<string, unknown>) : null
          const exportId = typeof latestExport?.id === 'string' ? latestExport.id : null
          const previewUrl = typeof item.previewUrl === 'string'
            ? item.previewUrl
            : (exportId && latestExport?.status === 'completed'
              ? `/api/exports/${encodeURIComponent(exportId)}/preview`
              : null)
          return {
            id: typeof item.id === 'string' ? item.id : Math.random().toString(),
            title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled production',
            status: typeof item.status === 'string' ? item.status : 'tracked',
            thumbnailUrl: typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.trim() ? item.thumbnailUrl.trim() : null,
            previewUrl,
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : null,
            updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
            totals: item.totals && typeof item.totals === 'object' ? (item.totals as PrometheusTrackedVideo['totals']) : undefined,
            platformBreakdown: Array.isArray(item.platformBreakdown) ? (item.platformBreakdown as PrometheusTrackedVideo['platformBreakdown']) : undefined,
          }
        })
        setTrackedVideos(mappedTrackedVideos)

        setSelectedAccountId((current) => adapted.accounts.some((account) => account.id === current && account.connected)
          ? current
          : adapted.accounts.find((account) => account.connected)?.id ?? adapted.accounts[0]?.id ?? '')
        setLoadState('ready')
      } catch {
        if (!controller.signal.aborted) setLoadState('error')
      }
    }
    void load()
    return () => controller.abort()
  }, [requestKey])

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null
  const accountVideos = React.useMemo(
    () => (selectedAccount?.connected ? videosByAccount[selectedAccount.id] ?? [] : []),
    [selectedAccount, videosByAccount],
  )
  const platforms = React.useMemo(
    () => [...new Map(accountVideos.map((video) => [video.platform, video.platformName])).entries()]
      .map(([id, name]) => ({ id, name })),
    [accountVideos],
  )
  const validPlatform = platforms.some((platform) => platform.id === selectedPlatform) ? selectedPlatform : 'all'
  const rankedVideos = React.useMemo(
    () => rankVideos(filterVideos(accountVideos, validPlatform), metric, direction),
    [accountVideos, direction, metric, validPlatform],
  )

  const carouselSlides: Slide[] = React.useMemo(() => {
    // Reflect the last 5 or 6 videos that Prometheus did and tracked for the user
    const candidateVideos = trackedVideos.length > 0 ? trackedVideos : accountVideos
    if (candidateVideos.length === 0) return []

    const prints: Slide[] = candidateVideos.slice(0, 6).map((video, index) => {
      const isTracked = 'totals' in video
      const tracked = isTracked ? (video as PrometheusTrackedVideo) : null
      const dashboard = !isTracked ? (video as DashboardVideo) : null
      const views = tracked?.totals?.views ?? dashboard?.metrics.views ?? 0
      const retention = tracked?.totals?.retentionRate ?? dashboard?.metrics.retentionRate ?? 0
      const platformsList = tracked
        ? (tracked.platformBreakdown ?? [])
            .filter((p) => Boolean((p.views && p.views > 0) || p.publishedUrl))
            .map((p) => p.platformName)
        : dashboard ? [dashboard.platformName] : []

      let caption = ''
      if (views > 0) {
        caption = `${formatCompactViews(views)} views`
        if (retention > 0) caption += ` · ${retention}% retention`
        if (platformsList.length > 0) caption += ` · on ${platformsList.join(', ')}`
      } else if (video.status) {
        const capitalized = video.status.charAt(0).toUpperCase() + video.status.slice(1)
        caption = `Status: ${capitalized} · Tracked in Prometheus`
      } else {
        caption = 'Tracked production cut'
      }

      const frame = frames[video.id]
      const image = frame || video.thumbnailUrl || undefined

      return {
        id: video.id,
        title: video.title || `Production #${index + 1}`,
        caption,
        image,
        alt: video.title,
        palette: (['dawn', 'alpine', 'dusk', 'mist'] as LandPalette[])[index % 4],
        seed: (index + 1) * 23 + (video.id ? video.id.charCodeAt(0) : 0),
      }
    })
    return prints
  }, [accountVideos, frames, trackedVideos])

  React.useEffect(() => {
    setSelectedPlatform('all')
    setFrames({})
    setFrameFailures({})
    setFrameRequests({})
  }, [selectedAccountId])

  React.useEffect(() => {
    let active = true
    const candidateList = [...trackedVideos.slice(0, 6), ...rankedVideos.slice(0, 6)]
    const seen = new Set<string>()
    const candidates = candidateList.filter((video) => {
      if (seen.has(video.id)) return false
      seen.add(video.id)
      const hasProjectSource = !video.id.includes(':')
      return (!video.thumbnailUrl || frameRequests[video.id]) && Boolean(video.previewUrl || hasProjectSource) && !framesRef.current[video.id] && !frameFailuresRef.current[video.id]
    })
    let next = 0
    async function captureNext() {
      while (active && next < candidates.length) {
        const video = candidates[next++]!
        const frame = await captureAnalyticsVideoFrame(video)
        if (!active) return
        if (!frame) {
          frameFailuresRef.current = { ...frameFailuresRef.current, [video.id]: true }
          setFrameFailures((current) => ({ ...current, [video.id]: true }))
          continue
        }

        framesRef.current = { ...framesRef.current, [video.id]: frame }
        setFrames((current) => ({ ...current, [video.id]: frame }))
        if (!video.id.includes(':')) {
          try {
            await fetch(`/api/projects/${encodeURIComponent(video.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ thumbnailUrl: frame }),
            })
          } catch {
            // The captured frame remains available in this session; a later
            // Analytics visit can retry persistence if the request failed.
          }
        }
      }
    }
    // Frame state updates must not cancel this batch; the refs above keep
    // state current without making it an effect dependency.
    void Promise.all(Array.from({ length: Math.min(3, candidates.length) }, () => captureNext()))
    return () => { active = false }
  }, [frameRequests, rankedVideos, trackedVideos])

  return (
    <main className="min-h-[100svh] bg-black text-[#F1F0EA]">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-4 sm:px-7 sm:pt-7 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <BackButton fallbackHref="/studio" className="mb-0 border border-white/[0.12] bg-white/[0.025] text-white hover:bg-white/[0.08]" />
          <p className="text-right text-[9px] uppercase tracking-[0.24em] text-[#8D8E85]">PROMETHEUS / PERFORMANCE</p>
        </header>

        <section className="mt-10 sm:mt-14" aria-labelledby="performance-title">
          <div className="max-w-3xl">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#A3A68F]">Your publishing signal</p>
            <h1 id="performance-title" className="mt-3 font-[family-name:var(--font-vogue-display)] text-[clamp(2.7rem,7vw,5.7rem)] leading-[0.92]">Best performing videos</h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-6 text-[#92938B]">Ranked inside one linked account at a time. Switch accounts to compare their own results.</p>
          </div>

          <div className="mt-9 grid gap-3 border-y border-white/[0.1] py-4 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.3fr)_minmax(12rem,1fr)_minmax(13rem,1fr)_auto] lg:items-end lg:gap-5">
            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.19em] text-[#81837A]">Linked account</span>
              <select aria-label="Filter by linked account" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} disabled={accounts.length === 0} className="min-h-11 w-full border-0 border-b border-white/[0.16] bg-transparent px-1 text-[12px] text-[#E6E6DE] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F] disabled:opacity-50">
                {accounts.length === 0 ? <option value="">No linked accounts</option> : null}
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.platformName} · {account.accountName}{account.connected ? '' : ` · ${account.unavailableReason ?? 'unavailable'}`}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.19em] text-[#81837A]">Platform</span>
              <select aria-label="Filter by platform" value={validPlatform} onChange={(event) => setSelectedPlatform(event.target.value)} disabled={platforms.length === 0} className="min-h-11 w-full border-0 border-b border-white/[0.16] bg-transparent px-1 text-[12px] text-[#E6E6DE] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F] disabled:opacity-50">
                <option value="all">All platforms in this account</option>
                {platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.19em] text-[#81837A]">Rank by</span>
              <select aria-label="Sort videos by metric" value={metric} onChange={(event) => setMetric(event.target.value as PerformanceMetric)} className="min-h-11 w-full border-0 border-b border-white/[0.16] bg-transparent px-1 text-[12px] text-[#E6E6DE] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">
                {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <button type="button" aria-label={`Sort ${direction === 'desc' ? 'highest to lowest' : 'lowest to highest'}`} onClick={() => setDirection((current) => current === 'desc' ? 'asc' : 'desc')} className="inline-flex min-h-11 items-center justify-center gap-2 border-b border-white/[0.16] px-1 text-[9px] uppercase tracking-[0.14em] text-[#B9BAAF] transition-colors hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">
              {direction === 'desc' ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}{direction === 'desc' ? 'Highest first' : 'Lowest first'}
            </button>
          </div>
        </section>

        {appraisal && appraisal.totalPostsAnalyzed > 0 ? (
          <section className="mt-8 border-y border-white/[0.1] py-5 sm:py-6" aria-label="Analysis notes">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-sm font-medium tracking-tight text-[#F1F0EA]">Video insights</h2>
              <p className="text-[11px] text-[#8D8E85]">Based on {appraisal.totalPostsAnalyzed} {appraisal.totalPostsAnalyzed === 1 ? 'video' : 'videos'}</p>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-5 border-t border-white/[0.07] pt-5 sm:grid-cols-3 sm:gap-6">
              <div className="border-b border-white/[0.07] pb-4 sm:border-0 sm:pb-0">
                <dt className="text-[11px] text-[#8D8E85]">Average retention</dt>
                <dd className="mt-2 font-mono text-[28px] font-light leading-none tracking-tight text-[#F1F0EA]">{Math.round(appraisal.catalogSummary.averageRetentionScore * 100)}%</dd>
              </div>
              <div className="border-b border-white/[0.07] pb-4 sm:border-0 sm:pb-0">
                <dt className="text-[11px] text-[#8D8E85]">Sharing score</dt>
                <dd className="mt-2 font-mono text-[28px] font-light leading-none tracking-tight text-[#D7FF4F]">{Math.round(appraisal.catalogSummary.averageViralityScore * 100)}%</dd>
                <p className="mt-1.5 text-[10px] text-[#777970]">Shares and comments</p>
              </div>
              <div>
                <dt className="text-[11px] text-[#8D8E85]">Breakout videos</dt>
                <dd className="mt-2 font-mono text-[28px] font-light leading-none tracking-tight text-[#F1F0EA]">{appraisal.catalogSummary.viralOutliersCount}</dd>
              </div>
            </dl>

            <p className="mt-5 text-[12px] leading-5 text-[#BFC0B7]">
              <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-[#D7FF4F]">Next edit</span>
              Bring the most compelling moment closer to the start.
            </p>
          </section>
        ) : null}

        <section className="mt-7" aria-label="Video performance rankings" aria-live="polite">
          {loadState === 'loading' ? <DashboardStatus>Loading linked accounts and performance…</DashboardStatus> : null}
          {loadState === 'error' ? <DashboardStatus title="Analytics could not be loaded" action={<button type="button" onClick={() => setRequestKey((value) => value + 1)} className="mt-4 min-h-10 border-b border-white/30 px-1 text-[10px] uppercase tracking-[0.13em] text-white transition-colors hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">Try again</button>}>Your account data is still protected. Reload the analytics feed to try again.</DashboardStatus> : null}
          {loadState === 'ready' && !selectedAccount ? <DashboardStatus title="No linked accounts yet">Connect a publishing account to see its video performance here.</DashboardStatus> : null}
          {loadState === 'ready' && selectedAccount && !selectedAccount.connected ? <DashboardStatus title={`${selectedAccount.accountName} is unavailable`} muted>This {selectedAccount.platformName} account is {selectedAccount.unavailableReason ?? 'disconnected'}. Its results are hidden until the account is available again.</DashboardStatus> : null}
          {loadState === 'ready' && selectedAccount?.connected && rankedVideos.length === 0 ? <DashboardStatus title="Account-scoped results are not available yet">This account is connected. The current analytics feed does not identify which account owns each video metric, so no shared or cross-account totals are shown here.</DashboardStatus> : null}

          {loadState === 'ready' && selectedAccount?.connected && rankedVideos.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.17em] text-[#777970]"><p>{selectedAccount.platformName} · {selectedAccount.accountName}</p><p>{rankedVideos.length} {rankedVideos.length === 1 ? 'video' : 'videos'} · ranked by {metricOptions.find((option) => option.value === metric)?.label}</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rankedVideos.map((video, index) => <PerformanceCard key={`${selectedAccount.id}:${video.id}:${video.platform}`} video={video} rank={index + 1} sortMetric={metric} frame={frames[video.id] ?? null} frameFailed={Boolean(frameFailures[video.id])} onOpen={() => setSelectedAnalyticsVideo(video)} onFrameFailure={() => setFrameRequests((current) => ({ ...current, [video.id]: true }))} />)}
              </div>
            </>
          ) : null}
        </section>

        {/* RECENT TRACKED VIDEOS / POLAROID LINE CAROUSEL */}
        <section className="mt-14 border-t border-white/[0.08] pt-10 sm:mt-18 sm:pt-14" aria-labelledby="tracked-carousel-title">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#A3A68F]">Prometheus Archive</p>
              <h2 id="tracked-carousel-title" className="mt-2 font-[family-name:var(--font-vogue-display)] text-2xl sm:text-3xl text-[#F1F0EA]">
                Recent tracked videos
              </h2>
              <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#92938B]">
                Recent videos created or published through Prometheus.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#787A72]">
              <span className="inline-block size-1.5 rounded-full bg-[#D7FF4F]" />
              {carouselSlides.length} {carouselSlides.length === 1 ? 'video' : 'videos'}
            </div>
          </div>

          {carouselSlides.length ? <div className="mt-6 overflow-hidden border-y border-white/[0.08]">
            <PolaroidLineCarousel
              slides={carouselSlides}
              height={520}
              cardWidth={280}
              sag={46}
              swing={1}
              autoplay={4500}
              string="#736c62"
              background="transparent"
              ink="#F1F0EA"
              ariaLabel="Recent Prometheus tracked videos carousel"
              onSelect={(index) => {
                const id = carouselSlides[index]?.id
                const selected = trackedVideos.find((video) => video.id === id) ?? accountVideos.find((video) => video.id === id)
                if (selected) setSelectedAnalyticsVideo(selected)
              }}
              onImageFailure={(index) => {
                const id = carouselSlides[index]?.id
                const video = trackedVideos.find((candidate) => candidate.id === id) ?? accountVideos.find((candidate) => candidate.id === id)
                if (video && !frames[video.id] && !frameRequests[video.id]) {
                  setFrameRequests((current) => ({ ...current, [video.id]: true }))
                }
              }}
            />
          </div> : <div role="status" className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-10 text-center text-[12px] leading-6 text-[#92938B]">Videos created or published through a linked account will appear here with their available stats and thumbnails.</div>}
        </section>
      </div>
      <AnalyticsVideoSheet video={selectedAnalyticsVideo} frame={selectedAnalyticsVideo ? frames[selectedAnalyticsVideo.id] ?? null : null} onOpenChange={(open) => !open && setSelectedAnalyticsVideo(null)} />
    </main>
  )
}

function PerformanceCard({ video, rank, sortMetric, frame, frameFailed, onFrameFailure, onOpen }: { video: DashboardVideo; rank: number; sortMetric: PerformanceMetric; frame: string | null; frameFailed: boolean; onFrameFailure: () => void; onOpen: () => void }) {
  const [failedThumbnail, setFailedThumbnail] = React.useState(false)
  const imageSource = thumbnailSource(video, frame)
  const shownImage = failedThumbnail ? frame : imageSource
  const iconComponent = metricIcon(sortMetric)
  return (
    <article className="group overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.025] transition-colors hover:border-white/[0.22] hover:bg-white/[0.04]">
      <button type="button" onClick={onOpen} aria-label={`Open analytics for ${video.title}`} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D7FF4F]">
      <div className="relative aspect-video overflow-hidden bg-[#101010]">
        {shownImage ? <Image src={shownImage} alt="" fill unoptimized={shownImage.startsWith('data:')} sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" onError={() => { if (!failedThumbnail && !frame) onFrameFailure(); setFailedThumbnail(true) }} className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_70%_20%,rgba(215,255,79,0.1),transparent_55%),linear-gradient(135deg,#171717,#050505)]"><span className="text-[9px] uppercase tracking-[0.17em] text-white/50">{!frameFailed && (!video.thumbnailUrl || video.previewUrl || failedThumbnail) ? 'Finding a frame…' : 'Preview unavailable'}</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" aria-hidden="true" />
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">Rank {String(rank).padStart(2, '0')}</span>
        <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.13em] text-white/75 backdrop-blur">{video.status}</span>
      </div>
      <div className="px-4 pb-4 pt-4">
        <h2 className="truncate text-[14px] text-[#F1F0EA]" title={video.title}>{video.title}</h2>
        <div className="mt-4 flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.17em] text-[#777970]">{metricOptions.find((option) => option.value === sortMetric)?.label}</p><p className="mt-1 flex items-center gap-2 text-[22px] font-light tabular-nums text-[#E3E4D9]">{React.createElement(iconComponent, { className: 'size-4 text-[#A3A68F]' })}{formatMetric(video.metrics[sortMetric], sortMetric)}</p></div><span className="shrink-0 rounded-full border border-white/[0.12] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.12em] text-[#A4A69C]">{video.platformName}</span></div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3 text-[10px] text-[#999B91]"><MetricDatum icon={Eye} label="Views" value={formatMetric(video.metrics.views, 'views')} /><MetricDatum icon={Heart} label="Likes" value={formatMetric(video.metrics.likes, 'likes')} /><MetricDatum icon={MessageCircle} label="Comments" value={formatMetric(video.metrics.comments, 'comments')} /></div>
      </div>
      </button>
      {video.publishedUrl ? <a href={video.publishedUrl} target="_blank" rel="noreferrer" className="mx-4 mb-4 inline-flex min-h-9 items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[#A3A68F] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">View on {video.platformName}<ArrowUpRight className="size-3.5" /></a> : null}
    </article>
  )
}

function MetricDatum({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="min-w-0"><span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.12em] text-[#777970]"><Icon className="size-3" />{label}</span><span className="mt-1 block truncate tabular-nums">{value}</span></div>
}

function DashboardStatus({ title, children, action, muted = false }: { title?: string; children: React.ReactNode; action?: React.ReactNode; muted?: boolean }) {
  return <div role="status" className={`border-y border-white/[0.09] px-5 py-10 text-left sm:px-7 sm:py-12 ${muted ? 'text-[#73756F]' : 'text-[#9A9C92]'}`}>
    {title ? <h2 className={`text-lg font-medium tracking-tight sm:text-xl ${muted ? 'text-[#999A93]' : 'text-[#F1F0EA]'}`}>{title}</h2> : null}<p className="mt-2 max-w-2xl text-[12px] leading-6">{children}</p>{action}
  </div>
}

function AnalyticsVideoSheet({ video, frame, onOpenChange }: { video: DashboardVideo | PrometheusTrackedVideo | null; frame: string | null; onOpenChange: (open: boolean) => void }) {
  const tracked = video && !('metrics' in video) ? video : null
  const dashboard = video && 'metrics' in video ? video : null
  const values: Array<[string, number, PerformanceMetric]> = video
    ? tracked
      ? [
          ['Views', tracked.totals?.views ?? 0, 'views'],
          ['Likes', tracked.totals?.likes ?? 0, 'likes'],
          ['Comments', tracked.totals?.comments ?? 0, 'comments'],
          ['Shares', tracked.totals?.shares ?? 0, 'shares'],
          ['Watch time', tracked.totals?.watchTimeSeconds ?? 0, 'watchTimeSeconds'],
          ['Retention', tracked.totals?.retentionRate ?? 0, 'retentionRate'],
          ['Engagement', tracked.totals?.engagementRate ?? 0, 'engagementRate'],
        ]
      : [
          ['Views', dashboard!.metrics.views, 'views'],
          ['Likes', dashboard!.metrics.likes, 'likes'],
          ['Comments', dashboard!.metrics.comments, 'comments'],
          ['Shares', dashboard!.metrics.shares, 'shares'],
          ['Watch time', dashboard!.metrics.watchTimeSeconds, 'watchTimeSeconds'],
          ['Retention', dashboard!.metrics.retentionRate, 'retentionRate'],
          ['Engagement', dashboard!.metrics.engagementRate, 'engagementRate'],
        ]
    : []
  const thumbnail = frame || video?.thumbnailUrl || null
  const publishedUrl = dashboard?.publishedUrl ?? tracked?.platformBreakdown?.find((platform) => platform.publishedUrl)?.publishedUrl ?? null

  return (
    <Sheet open={Boolean(video)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-white/[0.1] bg-[#080808] px-5 pb-8 pt-7 text-[#F1F0EA] sm:max-w-xl sm:px-8">
        {video ? <>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#A3A68F]">Video performance</p>
          <SheetTitle className="mt-3 pr-8 font-[family-name:var(--font-vogue-display)] text-4xl font-normal leading-tight text-[#F1F0EA]">{video.title}</SheetTitle>
          <SheetDescription className="mt-2 text-[12px] text-[#A8AA9D]">{video.status} · {dashboard?.platformName ?? 'Prometheus project'}</SheetDescription>
          <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-white/[0.1] bg-[#101010]">
            {thumbnail ? <Image src={thumbnail} alt={`${video.title} thumbnail`} width={960} height={540} unoptimized={thumbnail.startsWith('data:')} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] uppercase tracking-[0.16em] text-white/40">Video thumbnail unavailable</div>}
          </div>
          <div className="mt-7 grid grid-cols-2 border-y border-white/[0.1] sm:grid-cols-3">
            {values.map(([label, value, metric]) => <div key={label} className="border-b border-r border-white/[0.08] px-4 py-4 last:border-r-0">
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#81837A]">{label}</p>
              <p className="mt-2 text-xl tabular-nums text-[#E6E6DE]">{formatMetric(value, metric)}</p>
            </div>)}
          </div>
          {tracked?.platformBreakdown?.length ? <div className="mt-7">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#A3A68F]">Channel readings</h3>
            <div className="mt-3 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {tracked.platformBreakdown.map((platform) => <div key={platform.platform} className="flex items-center justify-between gap-3 py-3 text-[11px]">
                <span>{platform.platformName}</span><span className="tabular-nums text-[#B8BAAF]">{formatCompactViews(platform.views) ?? 'No reach data'}</span>
              </div>)}
            </div>
          </div> : null}
          {publishedUrl ? <a href={publishedUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/[0.16] px-4 text-[10px] uppercase tracking-[0.14em] text-[#D7FF4F] hover:border-[#D7FF4F]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">View published video <ArrowUpRight className="size-3.5" /></a> : null}
        </> : null}
      </SheetContent>
    </Sheet>
  )
}

function metricIcon(metric: PerformanceMetric) {
  if (metric === 'views') return Eye
  if (metric === 'likes') return Heart
  if (metric === 'comments') return MessageCircle
  if (metric === 'watchTimeSeconds') return Timer
  return Share2
}

async function captureAnalyticsVideoFrame(video: DashboardVideo | PrometheusTrackedVideo): Promise<string | null> {
  let previewUrl = video.previewUrl
  if (!previewUrl && !video.id.includes(':')) {
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(video.id)}/assets`)
      if (!response.ok) return null
      const payload = await response.json() as { asset?: { mime_type?: string }; source?: { url?: string } }
      if (!payload.asset?.mime_type?.startsWith('video/')) return null
      previewUrl = payload.source?.url ?? null
    } catch {
      return null
    }
  }
  return previewUrl ? captureFirstVideoFrame(previewUrl) : null
}

function formatMetric(value: number, metric: PerformanceMetric) {
  if (metric === 'retentionRate' || metric === 'engagementRate') return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value)}%`
  if (metric === 'watchTimeSeconds') {
    const seconds = Math.max(0, Math.round(value))
    return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : `${Math.floor(seconds / 60)}m`
  }
  return new Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}
