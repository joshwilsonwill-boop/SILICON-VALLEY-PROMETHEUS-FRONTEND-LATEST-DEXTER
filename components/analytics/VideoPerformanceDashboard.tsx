'use client'

import * as React from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, ArrowUpRight, Eye, Heart, MessageCircle, Share2, Timer } from 'lucide-react'

import { BackButton } from '@/components/navigation/BackButton'
import {
  adaptAccountScopedAnalytics,
  filterVideos,
  rankVideos,
  thumbnailSource,
  type DashboardAccount,
  type DashboardVideo,
  type PerformanceMetric,
} from '@/lib/analytics/video-performance-dashboard'

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

export function VideoPerformanceDashboard() {
  const [loadState, setLoadState] = React.useState<LoadState>('loading')
  const [accounts, setAccounts] = React.useState<DashboardAccount[]>([])
  const [videosByAccount, setVideosByAccount] = React.useState<Record<string, DashboardVideo[]>>({})
  const [selectedAccountId, setSelectedAccountId] = React.useState('')
  const [selectedPlatform, setSelectedPlatform] = React.useState('all')
  const [metric, setMetric] = React.useState<PerformanceMetric>('views')
  const [direction, setDirection] = React.useState<'desc' | 'asc'>('desc')
  const [frames, setFrames] = React.useState<Record<string, string>>({})
  const [frameFailures, setFrameFailures] = React.useState<Record<string, boolean>>({})
  const [frameRequests, setFrameRequests] = React.useState<Record<string, boolean>>({})
  const [requestKey, setRequestKey] = React.useState(0)

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
  const accountVideos = selectedAccount?.connected ? videosByAccount[selectedAccount.id] ?? [] : []
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

  React.useEffect(() => {
    setSelectedPlatform('all')
    setFrames({})
    setFrameFailures({})
    setFrameRequests({})
  }, [selectedAccountId])

  React.useEffect(() => {
    let active = true
    const candidates = rankedVideos.filter((video) =>
      (!video.thumbnailUrl || frameRequests[video.id]) && video.previewUrl && !frames[video.id] && !frameFailures[video.id],
    )
    let next = 0
    async function captureNext() {
      while (active && next < candidates.length) {
        const video = candidates[next++]!
        const frame = await captureFirstFrame(video.previewUrl!)
        if (!active) return
        if (frame) setFrames((current) => ({ ...current, [video.id]: frame }))
        else setFrameFailures((current) => ({ ...current, [video.id]: true }))
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, candidates.length) }, () => captureNext()))
    return () => { active = false }
  }, [frameFailures, frameRequests, frames, rankedVideos])

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
              <select aria-label="Filter by linked account" value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)} disabled={accounts.length === 0} className="min-h-11 w-full rounded-lg border border-white/[0.12] bg-[#0B0B0B] px-3 text-[12px] text-[#E6E6DE] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F] disabled:opacity-50">
                {accounts.length === 0 ? <option value="">No linked accounts</option> : null}
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.platformName} · {account.accountName}{account.connected ? '' : ` · ${account.unavailableReason ?? 'unavailable'}`}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.19em] text-[#81837A]">Platform</span>
              <select aria-label="Filter by platform" value={validPlatform} onChange={(event) => setSelectedPlatform(event.target.value)} disabled={platforms.length === 0} className="min-h-11 w-full rounded-lg border border-white/[0.12] bg-[#0B0B0B] px-3 text-[12px] text-[#E6E6DE] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F] disabled:opacity-50">
                <option value="all">All platforms in this account</option>
                {platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[9px] uppercase tracking-[0.19em] text-[#81837A]">Rank by</span>
              <select aria-label="Sort videos by metric" value={metric} onChange={(event) => setMetric(event.target.value as PerformanceMetric)} className="min-h-11 w-full rounded-lg border border-white/[0.12] bg-[#0B0B0B] px-3 text-[12px] text-[#E6E6DE] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">
                {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <button type="button" aria-label={`Sort ${direction === 'desc' ? 'highest to lowest' : 'lowest to highest'}`} onClick={() => setDirection((current) => current === 'desc' ? 'asc' : 'desc')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.12] px-4 text-[9px] uppercase tracking-[0.14em] text-[#B9BAAF] transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">
              {direction === 'desc' ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}{direction === 'desc' ? 'Highest first' : 'Lowest first'}
            </button>
          </div>
        </section>

        <section className="mt-7" aria-label="Video performance rankings" aria-live="polite">
          {loadState === 'loading' ? <DashboardStatus>Loading linked accounts and performance…</DashboardStatus> : null}
          {loadState === 'error' ? <DashboardStatus title="Analytics could not be loaded" action={<button type="button" onClick={() => setRequestKey((value) => value + 1)} className="mt-4 min-h-10 rounded-full border border-white/20 px-4 text-[10px] uppercase tracking-[0.13em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">Try again</button>}>Your account data is still protected. Reload the analytics feed to try again.</DashboardStatus> : null}
          {loadState === 'ready' && !selectedAccount ? <DashboardStatus title="No linked accounts yet">Connect a publishing account to see its video performance here.</DashboardStatus> : null}
          {loadState === 'ready' && selectedAccount && !selectedAccount.connected ? <DashboardStatus title={`${selectedAccount.accountName} is unavailable`} muted>This {selectedAccount.platformName} account is {selectedAccount.unavailableReason ?? 'disconnected'}. Its results are hidden until the account is available again.</DashboardStatus> : null}
          {loadState === 'ready' && selectedAccount?.connected && rankedVideos.length === 0 ? <DashboardStatus title="Account-scoped results are not available yet">This account is connected. The current analytics feed does not identify which account owns each video metric, so no shared or cross-account totals are shown here.</DashboardStatus> : null}

          {loadState === 'ready' && selectedAccount?.connected && rankedVideos.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.17em] text-[#777970]"><p>{selectedAccount.platformName} · {selectedAccount.accountName}</p><p>{rankedVideos.length} {rankedVideos.length === 1 ? 'video' : 'videos'} · ranked by {metricOptions.find((option) => option.value === metric)?.label}</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rankedVideos.map((video, index) => <PerformanceCard key={`${selectedAccount.id}:${video.id}:${video.platform}`} video={video} rank={index + 1} sortMetric={metric} frame={frames[video.id] ?? null} frameFailed={Boolean(frameFailures[video.id])} onFrameFailure={() => setFrameRequests((current) => ({ ...current, [video.id]: true }))} />)}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function PerformanceCard({ video, rank, sortMetric, frame, frameFailed, onFrameFailure }: { video: DashboardVideo; rank: number; sortMetric: PerformanceMetric; frame: string | null; frameFailed: boolean; onFrameFailure: () => void }) {
  const [failedThumbnail, setFailedThumbnail] = React.useState(false)
  const imageSource = thumbnailSource(video, frame)
  const shownImage = failedThumbnail ? frame : imageSource
  const MetricIcon = metricIcon(sortMetric)
  return (
    <article className="group overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.025] transition-colors hover:border-white/[0.22] hover:bg-white/[0.04]">
      <div className="relative aspect-video overflow-hidden bg-[#101010]">
        {shownImage ? <Image src={shownImage} alt="" fill unoptimized={shownImage.startsWith('data:')} sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" onError={() => { if (!failedThumbnail && video.previewUrl && !frame) onFrameFailure(); setFailedThumbnail(true) }} className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_70%_20%,rgba(215,255,79,0.1),transparent_55%),linear-gradient(135deg,#171717,#050505)]"><span className="text-[9px] uppercase tracking-[0.17em] text-white/50">{video.previewUrl && !frameFailed ? 'Finding a frame…' : 'Preview unavailable'}</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" aria-hidden="true" />
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">Rank {String(rank).padStart(2, '0')}</span>
        <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.13em] text-white/75 backdrop-blur">{video.status}</span>
      </div>
      <div className="px-4 pb-4 pt-4">
        <h2 className="truncate text-[14px] text-[#F1F0EA]" title={video.title}>{video.title}</h2>
        <div className="mt-4 flex items-end justify-between gap-3"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.17em] text-[#777970]">{metricOptions.find((option) => option.value === sortMetric)?.label}</p><p className="mt-1 flex items-center gap-2 text-[22px] font-light tabular-nums text-[#E3E4D9]"><MetricIcon className="size-4 text-[#A3A68F]" />{formatMetric(video.metrics[sortMetric], sortMetric)}</p></div><span className="shrink-0 rounded-full border border-white/[0.12] px-2.5 py-1.5 text-[9px] uppercase tracking-[0.12em] text-[#A4A69C]">{video.platformName}</span></div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3 text-[10px] text-[#999B91]"><MetricDatum icon={Eye} label="Views" value={formatMetric(video.metrics.views, 'views')} /><MetricDatum icon={Heart} label="Likes" value={formatMetric(video.metrics.likes, 'likes')} /><MetricDatum icon={MessageCircle} label="Comments" value={formatMetric(video.metrics.comments, 'comments')} /></div>
        {video.publishedUrl ? <a href={video.publishedUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-9 items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[#A3A68F] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]">View on {video.platformName}<ArrowUpRight className="size-3.5" /></a> : null}
      </div>
    </article>
  )
}

function MetricDatum({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="min-w-0"><span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.12em] text-[#777970]"><Icon className="size-3" />{label}</span><span className="mt-1 block truncate tabular-nums">{value}</span></div>
}

function DashboardStatus({ title, children, action, muted = false }: { title?: string; children: React.ReactNode; action?: React.ReactNode; muted?: boolean }) {
  return <div role="status" className={`rounded-xl border px-5 py-10 text-center sm:py-14 ${muted ? 'border-white/[0.07] bg-white/[0.015] text-[#73756F]' : 'border-white/[0.09] bg-white/[0.02] text-[#9A9C92]'}`}>
    {title ? <h2 className={`font-[family-name:var(--font-vogue-display)] text-2xl sm:text-3xl ${muted ? 'text-[#999A93]' : 'text-[#F1F0EA]'}`}>{title}</h2> : null}<p className="mx-auto mt-3 max-w-2xl text-[12px] leading-6">{children}</p>{action}
  </div>
}

function metricIcon(metric: PerformanceMetric) {
  if (metric === 'views') return Eye
  if (metric === 'likes') return Heart
  if (metric === 'comments') return MessageCircle
  if (metric === 'watchTimeSeconds') return Timer
  return Share2
}

function formatMetric(value: number, metric: PerformanceMetric) {
  if (metric === 'retentionRate' || metric === 'engagementRate') return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value)}%`
  if (metric === 'watchTimeSeconds') {
    const seconds = Math.max(0, Math.round(value))
    return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : `${Math.floor(seconds / 60)}m`
  }
  return new Intl.NumberFormat('en', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

async function captureFirstFrame(src: string): Promise<string | null> {
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.src = src
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Video preview timed out')), 20_000)
      video.onloadeddata = () => { window.clearTimeout(timeout); resolve() }
      video.onerror = () => { window.clearTimeout(timeout); reject(new Error('Video preview could not be loaded')) }
      video.load()
    })
    if (!video.videoWidth || !video.videoHeight) return null
    const scale = Math.min(1, 640 / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
}
