'use client'

import * as React from 'react'
import Image from 'next/image'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Activity, ArrowUpRight, Eye, Heart, Link2, MessageCircle, Play, PlayCircle, Share2, Sparkles } from 'lucide-react'

import { BackButton } from '@/components/navigation/BackButton'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Jarvis, JarvisFollow, JarvisProvider, useJarvisAgent } from '@/components/ui/jarvis'
import { cn } from '@/lib/utils'
import { JarvisReachChart, metricVisuals, type JarvisChartPoint, type ReachMetric } from './JarvisReachChart'
import type { ChartPhase } from './bklit/chart-phase'

type AnalyticsRange = '7D' | '30D' | '90D'

type ChartPoint = {
  label: string
  reach: number
  watchTime: number
  engagement: number
}

type MetricCard = {
  key: 'reach' | 'watchTime' | 'likes' | 'shares'
  label: string
  thought: string
  icon: React.ComponentType<{ className?: string }>
  sparkline: number[]
}

type TopSignal = {
  title: string
  subtitle: string
  image: string
  retention: string
  engagement: string
  views?: number
  status?: string
}

type LiveVideo = {
  id: string
  title: string
  status: string
  thumbnailUrl: string | null
  totals: {
    views: number
    retentionRate: number
    engagementRate: number
  }
  platformBreakdown: VideoPlatformMetric[]
}

type VideoPlatformMetric = {
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

type AnalyticsPlatform = {
  id: string
  name: string
  color: string
  connected: boolean
}

type AnalyticsPayload = {
  success: true
  totals: {
    views: number
    likes: number
    shares: number
    watchTimeSeconds: number
  }
  videos: LiveVideo[]
  platforms: AnalyticsPlatform[]
  timeSeries: ChartPoint[]
  dataSource: 'youtube_live' | 'cached_platform_reports' | 'unavailable'
  metricsWarning: string | null
}

const metricCards: MetricCard[] = [
  { key: 'reach', label: 'Reach', thought: 'Amplifying reach', icon: Eye, sparkline: [12, 18, 15, 24, 20, 28, 31, 29] },
  { key: 'watchTime', label: 'Watch time', thought: 'Compiling watch time', icon: Activity, sparkline: [7, 11, 14, 12, 18, 20, 23, 25] },
  { key: 'likes', label: 'Likes', thought: 'Counting resonance', icon: Heart, sparkline: [4, 6, 8, 10, 11, 13, 12, 15] },
  { key: 'shares', label: 'Shares', thought: 'Tracing propagation', icon: Share2, sparkline: [2, 3, 3, 5, 4, 6, 7, 8] },
]

const rangeOptions: AnalyticsRange[] = ['7D', '30D', '90D']
const metricTabs: ReachMetric[] = ['reach', 'watchTime', 'engagement']

export function PrometheusAnalytics() {
  return (
    <main className="analytics-jarvis-root relative min-h-full overflow-x-hidden bg-black text-[#F5F5F5]">
      <SpectraNoise />
      <AmbientBlurField />
      <JarvisProvider>
        <AnalyticsStage />
        <JarvisPointer />
        <JarvisHalo />
        <JarvisThought />
      </JarvisProvider>
    </main>
  )
}

function AnalyticsStage() {
  const reduceMotion = useReducedMotion()
  const { focusElement, say, release, agentActive } = useJarvisAgent()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const statusPillRef = React.useRef<HTMLDivElement | null>(null)
  const chartCardRef = React.useRef<HTMLDivElement | null>(null)
  const cardRefs = React.useRef<Array<HTMLElement | null>>([])
  const sweepLandedOnChart = React.useRef(false)
  const chartSettled = React.useRef(false)
  const bootDone = React.useRef(false)
  const releaseTimer = React.useRef<number | undefined>(undefined)

  const [activeRange, setActiveRange] = React.useState<AnalyticsRange>('30D')
  const [activeMetric, setActiveMetric] = React.useState<ReachMetric>('reach')
  const [livePayload, setLivePayload] = React.useState<AnalyticsPayload | null>(null)
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [selectedVideo, setSelectedVideo] = React.useState<LiveVideo | null>(null)
  const [armedCount, setArmedCount] = React.useState(0)

  const chartData = React.useMemo(
    () => selectJarvisRange(toJarvisPoints(livePayload?.timeSeries ?? []), activeRange),
    [activeRange, livePayload],
  )
  const dashFromIndex = React.useMemo(() => {
    if (chartData.length < 2) return undefined
    const last = chartData[chartData.length - 1]!
    const today = new Date()
    return last.date.toDateString() === today.toDateString() ? chartData.length - 1 : undefined
  }, [chartData])
  const sparklines = React.useMemo(
    () => buildSparklineMap(livePayload?.timeSeries ?? []),
    [livePayload],
  )
  const displayMetrics = React.useMemo(
    () => ({
      reach: livePayload?.totals.views ?? 0,
      watchTime: livePayload?.totals.watchTimeSeconds ?? 0,
      likes: livePayload?.totals.likes ?? 0,
      shares: livePayload?.totals.shares ?? 0,
    }),
    [livePayload],
  )
  const displaySignal = React.useMemo<TopSignal | null>(() => {
    const topVideo = livePayload?.videos
      .slice()
      .sort((first, second) => second.totals.views - first.totals.views)[0]
    if (!topVideo) return null

    return {
      title: topVideo.title,
      subtitle: topVideo.status,
      image: topVideo.thumbnailUrl ?? '',
      retention: `${topVideo.totals.retentionRate}%`,
      engagement: `${topVideo.totals.engagementRate}%`,
      views: topVideo.totals.views,
      status: topVideo.status,
    }
  }, [livePayload])

  const videoLedger = React.useMemo(() => {
    if (!livePayload?.videos.length) return []
    return livePayload.videos
      .slice()
      .sort((first, second) => second.totals.views - first.totals.views)
      .slice(0, 6)
  }, [livePayload])

  React.useEffect(() => {
    let cancelled = false

    if (!bootDone.current) {
      bootDone.current = true
      if (!reduceMotion) {
        focusElement(statusPillRef.current, {
          thought: 'JARVIS online · calibrating read',
          duration: 520,
          click: true,
          linger: true,
        })
      }
    }

    async function loadAnalytics() {
      if (!reduceMotion) {
        focusElement(chartCardRef.current, {
          thought: 'Querying live channel metrics…',
          duration: 640,
          click: true,
          linger: true,
        })
      } else {
        setArmedCount(metricCards.length)
      }

      try {
        const response = await fetch('/api/analytics/video-performance', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as AnalyticsPayload | null
        if (!cancelled && response.ok && data?.success) {
          setLivePayload(data)
          setLoadState('ready')
        } else if (!cancelled) {
          setLoadState('error')
          say('Telemetry link refused · refresh to retry')
          window.setTimeout(release, 3200)
        }
      } catch {
        if (!cancelled) {
          setLivePayload(null)
          setLoadState('error')
          say('Telemetry link refused · refresh to retry')
          window.setTimeout(release, 3200)
        }
      }
    }

    void loadAnalytics()
    return () => {
      cancelled = true
      window.clearTimeout(releaseTimer.current)
      release()
    }
  }, [focusElement, reduceMotion, release, say])

  const settleChart = React.useCallback(
    (announce: boolean) => {
      if (announce && !chartSettled.current) say('Read complete · curves resolved')
      chartSettled.current = true
      window.clearTimeout(releaseTimer.current)
      releaseTimer.current = window.setTimeout(release, 1100)
    },
    [release, say],
  )

  React.useEffect(() => {
    if (!livePayload || reduceMotion) return
    setArmedCount(0)
    sweepLandedOnChart.current = false
    chartSettled.current = false

    const steps: Array<{ thought: string; value: number }> = [
      { thought: `${metricCards[0]!.thought} · ${formatNumber(livePayload.totals.views)}`, value: livePayload.totals.views },
      { thought: `${metricCards[1]!.thought} · ${formatWatchTime(livePayload.totals.watchTimeSeconds)}`, value: livePayload.totals.watchTimeSeconds },
      { thought: `${metricCards[2]!.thought} · ${formatNumber(livePayload.totals.likes)}`, value: livePayload.totals.likes },
      { thought: `${metricCards[3]!.thought} · ${formatNumber(livePayload.totals.shares)}`, value: livePayload.totals.shares },
    ]

    const runStep = (index: number) => {
      if (index >= steps.length) {
        sweepLandedOnChart.current = true
        focusElement(chartCardRef.current, {
          thought: 'Resolving reach curve…',
          duration: 560,
          click: true,
          linger: true,
          onArrive: () => {
            // Fallback settle: a chart mounted straight into ready may not emit a phase change.
            releaseTimer.current = window.setTimeout(() => settleChart(true), 3000)
          },
        })
        return
      }
      focusElement(cardRefs.current[index], {
        thought: steps[index]!.thought,
        duration: 460,
        onArrive: () => {
          setArmedCount((current) => Math.max(current, index + 1))
          releaseTimer.current = window.setTimeout(() => runStep(index + 1), 300)
        },
      })
    }

    runStep(0)
  }, [focusElement, livePayload, reduceMotion, settleChart])

  const handleChartPhase = React.useCallback(
    (phase: ChartPhase) => {
      if (phase === 'revealing') say('Curve locking · aligning domain')
      if (phase === 'ready' && sweepLandedOnChart.current) settleChart(!chartSettled.current)
    },
    [say, settleChart],
  )

  const handleRangeChange = (range: AnalyticsRange, el: HTMLElement) => {
    if (range === activeRange) return
    const from = activeRange
    setActiveRange(range)
    if (!reduceMotion) focusElement(el, { thought: `Refolding timeline · ${from} → ${range}`, duration: 400, click: true })
  }

  const handleMetricChange = (metric: ReachMetric, el: HTMLElement) => {
    if (metric === activeMetric) return
    setActiveMetric(metric)
    if (!reduceMotion) focusElement(el, { thought: `Overlaying ${metricVisuals[metric].label}`, duration: 400, click: true })
  }

  const handleOpenVideo = (video: LiveVideo) => {
    setSelectedVideo(video)
    say(`Expanding dossier · ${video.title.length > 34 ? `${video.title.slice(0, 34)}…` : video.title}`)
  }

  React.useLayoutEffect(() => {
    if (reduceMotion || !rootRef.current) return
    gsap.registerPlugin(ScrollTrigger)
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-jarvis-reveal]').forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 46, filter: 'blur(16px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1.05,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          },
        )
      })
      gsap.utils.toArray<HTMLElement>('[data-jarvis-blob]').forEach((element, index) => {
        gsap.to(element, {
          xPercent: index % 2 ? 14 : -12,
          yPercent: index % 2 ? -16 : 12,
          scale: index % 2 ? 1.18 : 0.86,
          duration: 17 + index * 6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      })
    }, rootRef)
    return () => context.revert()
  }, [reduceMotion])

  return (
    <div ref={rootRef} className="relative z-10 mx-auto flex min-h-full w-full max-w-[1720px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pb-12 sm:pt-7 lg:px-10">
      <header className="grid gap-6 border-b border-white/[0.09] pb-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end lg:gap-8">
        <BackButton fallbackHref="/studio" className="mb-0 border border-white/[0.12] bg-white/[0.025] text-white hover:bg-white/[0.08]" />
        <div className="min-w-0">
          <div ref={statusPillRef} className="inline-flex items-center gap-3">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D7FF4F] opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#D7FF4F]" />
            </span>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">PERFORMANCE SUITE / 2026 · JARVIS LINKED</p>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
            <CinematicTitle
              text="Analytics"
              className="font-[family-name:var(--font-vogue-display)] text-[clamp(3.1rem,6vw,6.4rem)] font-normal leading-[0.9] text-[#F5F5F5]"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[#8D8E85] lg:justify-self-end">
          <span>Last {activeRange === '7D' ? 7 : activeRange === '30D' ? 30 : 90} days</span>
          <span className="h-px w-8 bg-white/20" />
          <span className={cn('text-white', agentActive && 'text-[#D7FF4F]')}>Live read</span>
        </div>
      </header>

      <section className="mt-7" data-jarvis-reveal>
        <div className="grid divide-y divide-white/[0.09] border-y border-white/[0.09] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {metricCards.map((card, index) => {
            const Icon = card.icon
            return (
              <article
                key={card.key}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
                onMouseEnter={() => !agentActive && say(`${card.label} · ${formatMetric(card.key, displayMetrics[card.key])}`)}
                onMouseLeave={() => !agentActive && say(null)}
                className="group relative min-w-0 overflow-hidden px-4 py-5 first:pl-0 sm:px-5 sm:py-6 lg:px-7 lg:first:pl-0"
              >
                <span className="pointer-events-none absolute -inset-x-6 -top-10 h-24 rounded-full bg-[#D7FF4F]/[0.06] opacity-0 blur-[34px] transition-opacity duration-700 group-hover:opacity-100" aria-hidden="true" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#8D8E85]">{card.label}</span>
                  <Icon className="size-3.5 text-[#A8AA9D] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <div className="mt-5 font-[family-name:var(--font-geist)] text-[clamp(2rem,3vw,3.3rem)] font-light leading-none tracking-tight text-[#F1F0EA]">
                  <AnimatedMetric value={displayMetrics[card.key]} metricKey={card.key} armed={reduceMotion ? true : armedCount > index} />
                </div>
                <div className="mt-5 max-w-[11rem]">
                  <MetricSparkline values={sparklines[card.key] ?? card.sparkline} />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.36fr)] xl:gap-10">
        <div className="min-w-0" data-jarvis-reveal>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">Signal trajectory</p>
              <h2 className="mt-2 font-[family-name:var(--font-vogue-display)] text-[clamp(2rem,3.4vw,3.8rem)] leading-none text-[#F1F0EA]">Reach, without the noise.</h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#999A91]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: metricVisuals[activeMetric].color }} />
              <span>All channels</span>
            </div>
          </div>
          <div
            ref={chartCardRef}
            className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-white/[0.02] px-4 pb-3 pt-4 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:px-6 sm:pb-4 sm:pt-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                {metricTabs.map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    onClick={(event) => handleMetricChange(metric, event.currentTarget)}
                    className={cn(
                      'relative flex min-h-11 items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/50 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      activeMetric === metric && 'text-black',
                    )}
                  >
                    {activeMetric === metric ? (
                      <motion.span layoutId="jarvis-metric-pill" className="absolute inset-0 rounded-full bg-[#F1F0EA]" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
                    ) : null}
                    <span className="relative size-1.5 rounded-full" style={{ backgroundColor: metricVisuals[metric].color }} />
                    <span className="relative">{metricVisuals[metric].label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/[0.09] bg-black/30 p-1">
                {rangeOptions.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={(event) => handleRangeChange(range, event.currentTarget)}
                    className={cn(
                      'min-h-9 min-w-11 rounded-full px-2.5 py-1 text-[10px] tracking-[0.08em] text-white/55 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      activeRange === range && 'bg-white text-black',
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-4 min-h-[clamp(300px,42vh,440px)]">
              {loadState === 'error' ? (
                <div className="grid h-[clamp(300px,42vh,440px)] place-items-center px-6 text-center text-[13px] leading-6 text-[#8D8E85]">
                  Unable to load analytics. Refresh the page to try again.
                </div>
              ) : loadState === 'ready' && chartData.length > 0 ? (
                <JarvisReachChart
                  data={chartData}
                  metric={activeMetric}
                  dashFromIndex={dashFromIndex}
                  onPhaseChange={handleChartPhase}
                  revealSignature={`${activeRange}:${activeMetric}`}
                />
              ) : loadState === 'ready' ? (
                <div className="grid h-[clamp(300px,42vh,440px)] place-items-center px-6 text-center text-[13px] leading-6 text-[#8D8E85]">
                  {livePayload?.metricsWarning ?? 'No video measurements are available for this period.'}
                </div>
              ) : null}
            </div>

            <p className="min-h-5 border-t border-white/[0.06] pt-2 text-[10px] uppercase tracking-[0.18em] text-[#66685F]">
              {loadState === 'ready' ? livePayload?.metricsWarning ?? '' : ''}
            </p>
          </div>
        </div>
        <TiltSignalCard signal={displaySignal} />
      </section>

      <section className="mt-12 border-t border-white/[0.09] pt-6" data-jarvis-reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">Video ledger</p>
            <h2 className="mt-2 font-[family-name:var(--font-vogue-display)] text-[clamp(2rem,3.4vw,3.8rem)] leading-none text-[#F1F0EA]">Every cut. Accounted for.</h2>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#A8AA9D]">
            <Sparkles className="size-3.5 text-[#D7FF4F]" />
            Ranked by reach
          </div>
        </div>
        <div className="mt-7">
          <RecentAssetsGrid videos={videoLedger} onOpenVideo={handleOpenVideo} />
        </div>
      </section>

      <VideoPerformanceSheet
        video={selectedVideo}
        platforms={livePayload?.platforms ?? []}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
      />
    </div>
  )
}

function JarvisPointer() {
  const { isClicking, agentActive } = useJarvisAgent()
  return (
    <Jarvis>
      <div className="relative">
        {agentActive ? <span aria-hidden="true" className="absolute -inset-4 rounded-full bg-[#D7FF4F]/[0.12] blur-[14px]" /> : null}
        <motion.svg
          className="size-6 text-[#D7FF4F] drop-shadow-[0_0_9px_rgba(215,255,79,0.8)]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 40 40"
          animate={{ scale: isClicking ? 0.82 : 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          <path
            fill="currentColor"
            d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
          />
        </motion.svg>
        <AnimatePresence>
          {isClicking ? (
            <motion.span
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              className="absolute left-0 top-0 size-9 rounded-full border border-[#D7FF4F]/70 bg-[#D7FF4F]/15"
            />
          ) : null}
        </AnimatePresence>
      </div>
    </Jarvis>
  )
}

function JarvisHalo() {
  return (
    <JarvisFollow align="center" sideOffset={0} transition={{ stiffness: 190, damping: 26, bounce: 0 }}>
      <span
        aria-hidden="true"
        className="block size-12 rounded-full border border-[#D7FF4F]/25 bg-[#D7FF4F]/[0.05] blur-[7px]"
      />
    </JarvisFollow>
  )
}

function JarvisThought() {
  const { thought } = useJarvisAgent()
  return (
    <JarvisFollow align="bottom-right" sideOffset={8}>
      <AnimatePresence mode="popLayout">
        {thought ? (
          <motion.div
            key={thought}
            initial={{ opacity: 0, y: 8, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/[0.14] bg-black/55 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] shadow-[0_12px_44px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <Sparkles className="size-3 shrink-0 animate-pulse text-[#D7FF4F]" />
            <span className="font-medium text-[#D7FF4F]">Jarvis</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-[#EAEAEA]">{thought}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </JarvisFollow>
  )
}

function AmbientBlurField() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <div data-jarvis-blob className="absolute -left-[16%] top-[6%] size-[46rem] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(215,255,79,0.075),transparent_70%)] blur-[110px]" />
      <div data-jarvis-blob className="absolute -right-[12%] top-[38%] size-[40rem] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,240,255,0.06),transparent_70%)] blur-[120px]" />
      <div data-jarvis-blob className="absolute bottom-[4%] left-[26%] size-[34rem] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(196,181,253,0.05),transparent_70%)] blur-[130px]" />
    </div>
  )
}

function SpectraNoise() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-100" aria-hidden="true">
      <div className="absolute inset-0 bg-black" />
      <div className="prometheus-analytics-noise absolute inset-0" />
      <style>{`
        .prometheus-analytics-noise {
          background-image:
            radial-gradient(circle at 25% 12%, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px),
            radial-gradient(circle at 78% 82%, rgba(255, 255, 255, 0.012) 0 1px, transparent 1px),
            repeating-radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.012) 0 1px, transparent 1px 3px);
          background-size: 3px 3px, 4px 4px, 7px 7px;
          animation: prometheusAnalyticsNoise 8s steps(8) infinite;
        }

        @keyframes prometheusAnalyticsNoise {
          0% { transform: translate3d(0, 0, 0); opacity: 0.5; }
          25% { transform: translate3d(-1%, 1%, 0); opacity: 0.62; }
          50% { transform: translate3d(1%, -1%, 0); opacity: 0.56; }
          75% { transform: translate3d(0.5%, 1.5%, 0); opacity: 0.64; }
          100% { transform: translate3d(0, 0, 0); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

function CinematicTitle({ text, className }: { text: string; className?: string }) {
  const reduceMotion = useReducedMotion()

  return (
    <h1 className={cn('inline-flex overflow-visible', className)} aria-label={text}>
      {text.split('').map((character, index) => (
        <motion.span
          key={`${character}-${index}`}
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, y: '0.5em', rotateX: -76, filter: 'blur(8px)' }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.62, delay: 0.12 + index * 0.075, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: '50% 100%', display: character === ' ' ? 'inline-block' : undefined }}
        >
          {character === ' ' ? '\u00A0' : character}
        </motion.span>
      ))}
    </h1>
  )
}

function AnimatedMetric({ value, metricKey, armed }: { value: number; metricKey: MetricCard['key']; armed: boolean }) {
  const reduceMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = React.useState(reduceMotion ? value : 0)
  const previousValue = React.useRef(0)
  const armedOnce = React.useRef(false)

  React.useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value)
      previousValue.current = value
      return
    }
    if (!armed) return
    if (!armedOnce.current && value === 0) return
    armedOnce.current = true

    const startValue = previousValue.current
    const startTime = performance.now()
    let frame = 0
    const duration = 900
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - (1 - progress) ** 4
      setDisplayValue(Math.round(startValue + (value - startValue) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else previousValue.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [armed, reduceMotion, value])

  return <span className="tabular-nums">{formatMetric(metricKey, displayValue)}</span>
}

function toJarvisPoints(series: ChartPoint[]): JarvisChartPoint[] {
  return series
    .map((point) => ({
      date: new Date(`${point.label}T00:00:00`),
      reach: point.reach,
      watchTime: point.watchTime,
      engagement: point.engagement,
    }))
    .filter((point) => !Number.isNaN(point.date.getTime()))
}

function selectJarvisRange(points: JarvisChartPoint[], range: AnalyticsRange): JarvisChartPoint[] {
  const visible = points.slice(-(range === '7D' ? 7 : range === '30D' ? 30 : 90))
  if (range !== '90D' || visible.length <= 18) return visible

  const groups = Array.from({ length: Math.ceil(visible.length / 7) }, () => [] as JarvisChartPoint[])
  visible.forEach((point, index) => groups[Math.floor(index / 7)]?.push(point))
  return groups.filter((group) => group.length > 0).map((group) => ({
    date: group[group.length - 1]!.date,
    reach: group.reduce((sum, point) => sum + point.reach, 0),
    watchTime: group.reduce((sum, point) => sum + point.watchTime, 0),
    engagement: Math.round((group.reduce((sum, point) => sum + point.engagement, 0) / group.length) * 10) / 10,
  }))
}

function buildSparklineMap(series: ChartPoint[]): Partial<Record<MetricCard['key'], number[]>> {
  if (!series.length) return {}
  const tail = series.slice(-8)
  return {
    reach: tail.map((point) => point.reach),
    watchTime: tail.map((point) => point.watchTime),
  }
}

function MetricSparkline({ values }: { values: number[] }) {
  const reduceMotion = useReducedMotion()
  const points = React.useMemo(() => buildSparklinePoints(values), [values])
  const path = React.useMemo(() => buildSmoothPath(points), [points])

  return (
    <svg viewBox="0 0 120 40" className="h-10 w-full" aria-hidden="true">
      <motion.path
        d={path}
        fill="none"
        stroke="rgba(215,255,79,0.68)"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { opacity: 0, strokeDashoffset: 120 }}
        animate={reduceMotion ? undefined : { opacity: 1, strokeDashoffset: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
      />
      <motion.path
        d={`${path} L 120 40 L 0 40 Z`}
        fill="rgba(215,255,79,0.07)"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  )
}

function TiltSignalCard({ signal }: { signal: TopSignal | null }) {
  const cardRef = React.useRef<HTMLDivElement | null>(null)

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = cardRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const rx = ((0.5 - py) * 12).toFixed(2)
    const ry = (((px - 0.5) * 12) * 1).toFixed(2)
    element.style.setProperty('--rx', `${rx}deg`)
    element.style.setProperty('--ry', `${ry}deg`)
  }

  const handleLeave = () => {
    const element = cardRef.current
    if (!element) return
    element.style.setProperty('--rx', '0deg')
    element.style.setProperty('--ry', '0deg')
  }

  return (
    <aside className="min-w-0 xl:pt-0" data-jarvis-reveal>
      <div className="flex items-center justify-between border-b border-white/[0.09] pb-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">TOP SIGNAL</p>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">01 / 01</span>
      </div>
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handleLeave}
        className="group relative mt-5 overflow-hidden rounded-3xl border border-white/[0.12] bg-black shadow-[0_28px_70px_rgba(0,0,0,0.4)]"
        style={{
          transform: 'perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))',
          transition: 'transform 0.1s ease-out',
          '--rx': '0deg',
          '--ry': '0deg',
        } as React.CSSProperties}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
          {signal?.image ? <Image src={signal.image} alt={signal.title} fill sizes="(max-width: 1280px) 100vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" /> : null}
          <div className={cn('absolute inset-0', signal?.image ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.12)_40%,rgba(0,0,0,0.94)_100%)]' : 'bg-black')} />
          {signal ? <div className="absolute left-4 top-4 flex items-center gap-2 border border-white/[0.14] bg-black/20 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-[#D7FF4F]" />
            Outperforming
          </div> : null}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#C5C7B9]">
              <PlayCircle className="size-3.5 text-white" />
              Featured signal
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-vogue-display)] text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.9] text-white">{signal?.title ?? 'Awaiting report'}</h3>
                <p className="mt-3 max-w-[22rem] text-[11px] leading-5 text-[#C5C7B9]">{signal?.subtitle ?? 'Connect a channel with analytics access to surface a top-performing video.'}</p>
              </div>
              <ArrowUpRight className="mt-1 size-5 shrink-0 text-white transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/[0.09] border-b border-white/[0.09]">
        <div className="py-4 pr-3">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#8D8E85]">Views</div>
          <div className="mt-2 text-[18px] font-light text-[#F1F0EA]">{formatNumber(signal?.views ?? 0)}</div>
        </div>
        <div className="px-3 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#8D8E85]">Retention</div>
          <div className="mt-2 text-[18px] font-light text-[#F1F0EA]">{signal?.retention ?? '--'}</div>
        </div>
        <div className="py-4 pl-3">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#8D8E85]">Engage</div>
          <div className="mt-2 text-[18px] font-light text-[#F1F0EA]">{signal?.engagement ?? '--'}</div>
        </div>
      </div>
    </aside>
  )
}

function RecentAssetsGrid({
  videos = [],
  onOpenVideo,
}: {
  videos?: LiveVideo[]
  onOpenVideo: (video: LiveVideo) => void
}) {
  const rows = React.useMemo(
    () =>
      videos.map((video) => ({
        id: video.id,
        title: video.title,
        image: video.thumbnailUrl,
        alt: video.title,
        status: video.status,
        views: video.totals.views,
        retention: `${video.totals.retentionRate}%`,
        engagement: `${video.totals.engagementRate}%`,
      })),
    [videos],
  )

  return (
    <LayoutGroup>
      <div className="border-t border-white/[0.09]">
        <div className="hidden grid-cols-[minmax(230px,1.65fr)_0.7fr_0.6fr_0.6fr_26px] gap-5 border-b border-white/[0.09] py-3 text-[9px] uppercase tracking-[0.2em] text-[#777970] lg:grid">
          <span>Video</span>
          <span>Reach</span>
          <span>Retention</span>
          <span>Engagement</span>
          <span className="sr-only">Open</span>
        </div>
        {rows.length === 0 ? <div className="border-b border-white/[0.09] py-8 text-[13px] text-[#8D8E85]">No measured videos yet.</div> : null}
        {rows.map((item, index) => {
          return (
            <motion.div
              key={item.id}
              layout
              transition={{ layout: { duration: 0.3, ease: 'easeOut' } }}
              className={cn(
                'group relative grid gap-x-5 gap-y-3 border-b border-white/[0.09] py-4 transition-colors duration-300 lg:grid-cols-[minmax(230px,1.65fr)_0.7fr_0.6fr_0.6fr_26px] lg:items-center',
              )}
            >
              <div className="contents text-left">
                <div className="flex min-w-0 items-center gap-3.5 pr-11 lg:pr-0">
                  <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-black sm:w-32">
                    {item.image ? <Image src={item.image} alt={item.alt} fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : <div className="absolute inset-0 bg-black" />}
                    <div className="absolute inset-0 bg-black/15" />
                    <Play className="absolute bottom-2 left-2 size-3 fill-white text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-[#E9E9E1] transition-colors duration-300 group-hover:text-white">{item.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#777970]">
                      <span>{item.status}</span>
                      <span className="size-1 rounded-full bg-[#52544D]" />
                      <span>Video {String(index + 1).padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 text-[16px] font-light text-[#F1F0EA] lg:block lg:border-0 lg:pt-0">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#777970] lg:hidden">Reach</span>
                  {formatNumber(item.views)}
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 text-[16px] font-light text-[#F1F0EA] lg:block lg:border-0 lg:pt-0">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#777970] lg:hidden">Retention</span>
                  {item.retention}
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.07] pt-3 text-[16px] font-light text-[#F1F0EA] lg:block lg:border-0 lg:pt-0">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#777970] lg:hidden">Engagement</span>
                  {item.engagement}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Open performance for ${item.title}`}
                onClick={() => onOpenVideo(videos[index]!)}
                className="group/trigger absolute right-0 top-4 flex size-8 items-center justify-center rounded-full border border-white/[0.12] bg-black text-[#A8AA9D] transition-[background-color,border-color,color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#101010] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:static lg:justify-self-end"
              >
                <span className="absolute inset-[5px] rounded-full border border-current opacity-0 transition-all duration-300 group-hover/trigger:inset-[3px] group-hover/trigger:opacity-30" aria-hidden="true" />
                <ArrowUpRight className="relative size-3.5 transition-transform duration-300 group-hover/trigger:-translate-y-0.5 group-hover/trigger:translate-x-0.5" />
              </button>
            </motion.div>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

function VideoPerformanceSheet({
  video,
  platforms,
  onOpenChange,
}: {
  video: LiveVideo | null
  platforms: AnalyticsPlatform[]
  onOpenChange: (open: boolean) => void
}) {
  const trackedPlatforms = video?.platformBreakdown.filter((platform) => platform.connected) ?? []
  const availablePlatforms = platforms.filter((platform) => !platform.connected)
  const hasTrackedData = trackedPlatforms.length > 0

  return (
    <Sheet open={Boolean(video)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[620px] flex-col overflow-y-auto border-l border-white/[0.1] bg-black px-5 pb-7 pt-6 shadow-[-24px_0_70px_rgba(0,0,0,0.55)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:px-8 sm:pb-9 sm:pt-8"
      >
        {video ? (
          <>
            <div className="pr-10">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#8D8E85]">
                <span className={cn('size-1.5 rounded-full', hasTrackedData ? 'bg-[#D7FF4F]' : 'bg-[#777970]')} />
                {hasTrackedData ? 'Performance detail' : 'Tracking setup'}
              </div>
              <SheetTitle className="mt-4 font-[family-name:var(--font-vogue-display)] text-[clamp(2.1rem,6vw,4.1rem)] font-normal leading-[0.92] text-[#F1F0EA]">
                {video.title}
              </SheetTitle>
              <SheetDescription className="mt-3 max-w-[30rem] text-[12px] leading-5 text-[#A8AA9D]">
                {hasTrackedData
                  ? 'A live reading of the channels carrying this cut.'
                  : 'Connect a publishing account to begin reading this video after it is published.'}
              </SheetDescription>
            </div>

            {hasTrackedData ? (
              <div className="mt-9 space-y-8">
                <div className="grid grid-cols-2 border-y border-white/[0.1] sm:grid-cols-4">
                  <PerformanceMetric label="Reach" value={formatNumber(video.totals.views)} />
                  <PerformanceMetric label="Retention" value={`${video.totals.retentionRate}%`} />
                  <PerformanceMetric label="Engagement" value={`${video.totals.engagementRate}%`} />
                  <PerformanceMetric label="Watch time" value={formatWatchTime(trackedPlatforms.reduce((total, platform) => total + platform.watchTimeSeconds, 0))} />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#8D8E85]">Channel readings</p>
                  <div className="mt-4 divide-y divide-white/[0.09] border-y border-white/[0.09]">
                    {trackedPlatforms.map((platform) => (
                      <article key={platform.platform} className="py-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="size-2 rounded-full" style={{ backgroundColor: platform.color }} />
                            <div>
                              <h3 className="text-[13px] text-[#F1F0EA]">{platform.platformName}</h3>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#777970]">
                                {platform.capturedAt ? `Read ${formatCaptureDate(platform.capturedAt)}` : 'Awaiting first read'}
                              </p>
                            </div>
                          </div>
                          {platform.publishedUrl ? (
                            <a href={platform.publishedUrl} target="_blank" rel="noreferrer" className="flex size-8 items-center justify-center rounded-full border border-white/[0.12] text-[#A8AA9D] transition-colors hover:border-white/40 hover:bg-white hover:text-black" aria-label={`Open ${video.title} on ${platform.platformName}`}>
                              <ArrowUpRight className="size-3.5" />
                            </a>
                          ) : null}
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                          <PerformanceDatum icon={Eye} label="Views" value={formatNumber(platform.views)} />
                          <PerformanceDatum icon={Heart} label="Likes" value={formatNumber(platform.likes)} />
                          <PerformanceDatum icon={MessageCircle} label="Comments" value={formatNumber(platform.comments)} />
                          <PerformanceDatum icon={Share2} label="Shares" value={formatNumber(platform.shares)} />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-9">
                <div className="border-y border-white/[0.1] py-6">
                  <Link2 className="size-5 text-white" />
                  <p className="mt-4 text-[18px] font-light text-[#F1F0EA]">No channel is reading this cut yet.</p>
                  <p className="mt-2 max-w-[28rem] text-[12px] leading-5 text-[#8D8E85]">Choose a channel to connect. Prometheus will begin capturing available performance once this video is live.</p>
                </div>
                <div className="mt-2 divide-y divide-white/[0.09] border-b border-white/[0.09]">
                  {availablePlatforms.map((platform) => (
                    <a
                      key={platform.id}
                      href={`/api/oauth/${platform.id}/initiate`}
                      className="group/platform flex items-center justify-between gap-4 py-4 text-left transition-colors hover:text-white"
                    >
                      <span className="flex items-center gap-3">
                        <span className="size-2 rounded-full" style={{ backgroundColor: platform.color }} />
                        <span className="text-[13px] text-[#E9E9E1]">Connect {platform.name}</span>
                      </span>
                      <span className="flex size-7 items-center justify-center rounded-full border border-white/[0.12] text-[#A8AA9D] transition-all duration-300 group-hover/platform:border-white group-hover/platform:bg-[#101010] group-hover/platform:text-white">
                        <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover/platform:-translate-y-0.5 group-hover/platform:translate-x-0.5" />
                      </span>
                    </a>
                  ))}
                  {availablePlatforms.length === 0 ? <p className="py-5 text-[12px] leading-5 text-[#8D8E85]">Your connected channels are ready. Publish this cut to let the next analytics read locate it.</p> : null}
                </div>
              </div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function PerformanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/[0.09] py-4 pr-3 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
      <p className="text-[9px] uppercase tracking-[0.18em] text-[#777970]">{label}</p>
      <p className="mt-2 truncate text-[18px] font-light text-[#F1F0EA]">{value}</p>
    </div>
  )
}

function PerformanceDatum({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#777970]"><Icon className="size-3" />{label}</div>
      <p className="mt-2 text-[16px] font-light text-[#F1F0EA]">{value}</p>
    </div>
  )
}

function formatMetric(key: MetricCard['key'], value: number) {
  if (key === 'watchTime') return formatWatchTime(value)
  return formatNumber(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatWatchTime(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function formatCaptureDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function buildSparklinePoints(values: number[]) {
  const safeValues = values.length ? values : [0]
  const max = Math.max(...safeValues, 1)
  const width = 120
  const height = 40
  const step = safeValues.length > 1 ? width / (safeValues.length - 1) : width

  return safeValues.map((value, index) => ({
    x: Math.round(index * step),
    y: Math.round(height - (value / max) * 28 - 6),
  }))
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return ''

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const controlX = (previous.x + point.x) / 2
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`
  }, '')
}
