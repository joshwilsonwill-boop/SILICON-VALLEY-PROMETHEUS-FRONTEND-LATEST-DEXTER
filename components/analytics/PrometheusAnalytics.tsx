'use client'

import * as React from 'react'
import Image from 'next/image'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Activity, Eye, Heart, PlayCircle, Share2 } from 'lucide-react'

import { cn } from '@/lib/utils'

type AnalyticsRange = '7D' | '30D' | '90D'

type ChartPoint = {
  label: string
  reach: number
  watchTime: number
  engagement: number
}

type AssetItem = {
  id: string
  title: string
  kind: 'jpg' | 'gif'
  src: string
  alt: string
}

type MetricCard = {
  key: keyof typeof mockMetrics
  label: string
  icon: React.ComponentType<{ className?: string }>
  sparkline: number[]
}

type TopSignal = {
  title: string
  subtitle: string
  image: string
  retention: string
  engagement: string
}

type AnalyticsPayload = {
  success: true
  totals: {
    views: number
    likes: number
    shares: number
    watchTimeSeconds: number
  }
  videos: Array<{
    id: string
    title: string
    status: string
    thumbnailUrl: string | null
    totals: {
      views: number
      retentionRate: number
      engagementRate: number
    }
  }>
}

export const mockMetrics = {
  reach: 284120,
  watchTime: 18640,
  likes: 9250,
  shares: 1244,
} as const

export const mockChartData: Record<AnalyticsRange, ChartPoint[]> = {
  '7D': [
    { label: 'Mon', reach: 12480, watchTime: 4200, engagement: 6.2 },
    { label: 'Tue', reach: 13820, watchTime: 4380, engagement: 6.8 },
    { label: 'Wed', reach: 14530, watchTime: 4560, engagement: 7.2 },
    { label: 'Thu', reach: 15920, watchTime: 4680, engagement: 7.8 },
    { label: 'Fri', reach: 17360, watchTime: 4960, engagement: 8.1 },
    { label: 'Sat', reach: 16420, watchTime: 4720, engagement: 7.6 },
    { label: 'Sun', reach: 18120, watchTime: 5180, engagement: 8.4 },
  ],
  '30D': Array.from({ length: 12 }, (_, index) => {
    const offset = index + 1
    const reach = Math.round(11800 + offset * 1120 + Math.sin(index * 0.85) * 760 + Math.cos(index * 0.55) * 420)
    return {
      label: `W${offset}`,
      reach,
      watchTime: Math.round(reach * 0.34),
      engagement: Math.round((5.8 + index * 0.22 + Math.sin(index * 0.65) * 0.55) * 10) / 10,
    }
  }),
  '90D': Array.from({ length: 9 }, (_, index) => {
    const offset = index + 1
    const reach = Math.round(9650 + offset * 2340 + Math.sin(index * 0.9) * 1230 + Math.cos(index * 0.35) * 960)
    return {
      label: `M${offset}`,
      reach,
      watchTime: Math.round(reach * 0.31),
      engagement: Math.round((4.9 + index * 0.28 + Math.sin(index * 0.4) * 0.42) * 10) / 10,
    }
  }),
}

export const mockAssets: Array<AssetItem | null> = [
  {
    id: 'asset-1',
    title: 'Golden sky plate',
    kind: 'jpg',
    src: '/style-previews/dark-cinematic-1.jpg',
    alt: 'Cinematic clouds with high contrast editorial lighting',
  },
  {
    id: 'asset-2',
    title: 'Portrait cut',
    kind: 'jpg',
    src: '/style-previews/iman-1.jpg',
    alt: 'Editorial portrait still',
  },
  {
    id: 'asset-3',
    title: 'Archive frame',
    kind: 'gif',
    src: '/style-previews/podcast-1.jpg',
    alt: 'Vintage documentary frame',
  },
  {
    id: 'asset-4',
    title: 'Motion note',
    kind: 'jpg',
    src: '/style-previews/reels-heat-1.webp',
    alt: 'Dynamic social edit still',
  },
  null,
  {
    id: 'asset-5',
    title: 'Soft grain',
    kind: 'jpg',
    src: '/style-previews/docs-story-1.jpg',
    alt: 'Atmospheric documentary texture',
  },
  null,
  {
    id: 'asset-6',
    title: 'Editorial still',
    kind: 'jpg',
    src: '/style-previews/red-statue-1.jpg',
    alt: 'Classical high contrast portrait',
  },
  null,
  null,
  null,
  null,
]

export const mockTopSignal: TopSignal = {
  title: 'Signal No. 04',
  subtitle: 'The strongest export in the current review window.',
  image: '/style-previews/dark-cinematic-1.jpg',
  retention: '78%',
  engagement: '12.4%',
}

const mockMetricCards: MetricCard[] = [
  { key: 'reach', label: 'Reach', icon: Eye, sparkline: [12, 18, 15, 24, 20, 28, 31, 29] },
  { key: 'watchTime', label: 'Watch time', icon: Activity, sparkline: [7, 11, 14, 12, 18, 20, 23, 25] },
  { key: 'likes', label: 'Likes', icon: Heart, sparkline: [4, 6, 8, 10, 11, 13, 12, 15] },
  { key: 'shares', label: 'Shares', icon: Share2, sparkline: [2, 3, 3, 5, 4, 6, 7, 8] },
]

const rangeOptions: AnalyticsRange[] = ['7D', '30D', '90D']

export function PrometheusAnalytics() {
  const reduceMotion = useReducedMotion()
  const [activeRange, setActiveRange] = React.useState<AnalyticsRange>('30D')
  const [titleComplete, setTitleComplete] = React.useState(false)
  const [assetSlots, setAssetSlots] = React.useState<Array<AssetItem | null>>(mockAssets)
  const [livePayload, setLivePayload] = React.useState<AnalyticsPayload | null>(null)
  const chartData = React.useMemo(() => mockChartData[activeRange], [activeRange])
  const handleTitleComplete = React.useCallback(() => setTitleComplete(true), [])
  const displayMetrics = React.useMemo(
    () => ({
      reach: livePayload?.totals.views ?? mockMetrics.reach,
      watchTime: livePayload?.totals.watchTimeSeconds ?? mockMetrics.watchTime,
      likes: livePayload?.totals.likes ?? mockMetrics.likes,
      shares: livePayload?.totals.shares ?? mockMetrics.shares,
    }),
    [livePayload],
  )
  const displaySignal = React.useMemo<TopSignal>(() => {
    const topVideo = livePayload?.videos[0]
    if (!topVideo) return mockTopSignal

    return {
      title: topVideo.title,
      subtitle: topVideo.status,
      image: topVideo.thumbnailUrl?.startsWith('/') ? topVideo.thumbnailUrl : mockTopSignal.image,
      retention: `${topVideo.totals.retentionRate}%`,
      engagement: `${topVideo.totals.engagementRate}%`,
    }
  }, [livePayload])

  React.useEffect(() => {
    let cancelled = false

    async function loadAnalytics() {
      try {
        const response = await fetch('/api/analytics/video-performance', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as AnalyticsPayload | null
        if (!cancelled && response.ok && data?.success) {
          setLivePayload(data)
        }
      } catch {
        if (!cancelled) setLivePayload(null)
      }
    }

    void loadAnalytics()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#0A0A0C] text-[#EAEAEA]">
      <SpectraNoise />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col">
        <header className="px-8 pt-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#444]">PERFORMANCE</p>
          <div className="mt-4">
            <TypewriterCustomFallback
              text="Analytics"
              onComplete={handleTitleComplete}
              delayMs={400}
              className="text-[48px] font-light leading-none text-[#EAEAEA]"
            />
            <TextIlluminateFallback
              text="Cross-platform telemetry, distilled."
              delayMs={titleComplete ? 500 : 0}
              className="mt-3 block text-[14px] font-normal leading-6 text-[#555]"
            />
          </div>
        </header>

        <section className="mt-12 px-8">
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            {mockMetricCards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.article
                  key={card.key}
                  className="min-w-[15rem] rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-6 backdrop-blur-[12px] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.1)] md:min-w-0"
                  style={{
                    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.8 + index * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#555]">{card.label}</span>
                    <Icon className="size-4 text-[#555]" />
                  </div>
                  <div className="mt-5 text-[32px] font-light leading-none text-[#EAEAEA]">
                    {formatMetric(card.key, displayMetrics[card.key])}
                  </div>
                  <div className="mt-4">
                    <MetricSparkline values={card.sparkline} />
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ReachCurveChart data={chartData} activeRange={activeRange} onRangeChange={setActiveRange} />
          <TiltSignalCard signal={displaySignal} />
        </section>


        <section className="px-8 pb-12 pt-12">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#444]">RECENT ASSETS</p>
          <div className="mt-4">
            <RecentAssetsGrid items={assetSlots} onItemsChange={setAssetSlots} />
          </div>
        </section>
      </div>
    </main>
  )
}

function SpectraNoise() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-60" aria-hidden="true">
      <div className="absolute inset-0 bg-[#0A0A0C]" />
      <div className="prometheus-analytics-noise absolute inset-0" />
      <style>{`
        .prometheus-analytics-noise {
          background-image:
            radial-gradient(circle at 25% 12%, rgba(160, 180, 140, 0.025) 0 1px, transparent 1px),
            radial-gradient(circle at 78% 82%, rgba(200, 170, 120, 0.02) 0 1px, transparent 1px),
            repeating-radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.016) 0 1px, transparent 1px 3px);
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

function TypewriterCustomFallback({
  text,
  className,
  delayMs = 0,
  onComplete,
}: {
  text: string
  className?: string
  delayMs?: number
  onComplete?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const [ref, visible] = useIntersectionOnce<HTMLSpanElement>()
  const [characters, setCharacters] = React.useState(reduceMotion ? text.length : 0)
  const [cursorVisible, setCursorVisible] = React.useState(!reduceMotion)
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  React.useEffect(() => {
    if (!visible) return
    if (reduceMotion) {
      setCharacters(text.length)
      setCursorVisible(false)
      onCompleteRef.current?.()
      return
    }

    let interval: number | null = null
    let fadeTimer: number | null = null
    const startTimer = window.setTimeout(() => {
      let index = 0
      setCharacters(0)
      setCursorVisible(true)

      interval = window.setInterval(() => {
        index += 1
        setCharacters(index)

        if (index >= text.length) {
          if (interval !== null) window.clearInterval(interval)
          onCompleteRef.current?.()
          fadeTimer = window.setTimeout(() => setCursorVisible(false), 2000)
        }
      }, 60)
    }, delayMs)

    return () => {
      window.clearTimeout(startTimer)
      if (interval !== null) window.clearInterval(interval)
      if (fadeTimer !== null) window.clearTimeout(fadeTimer)
    }
  }, [delayMs, reduceMotion, text.length, visible])

  return (
    <span ref={ref} className={cn('inline-flex items-center gap-1', className)}>
      <span aria-label={text}>{text.slice(0, characters)}</span>
      {cursorVisible ? <span className="prometheus-typewriter-cursor" aria-hidden="true" /> : null}
      <style>{`
        .prometheus-typewriter-cursor {
          display: inline-block;
          width: 1px;
          height: 1em;
          background: rgba(200, 200, 200, 0.6);
          margin-left: 2px;
          animation: prometheusTypewriterBlink 0.8s steps(1) infinite;
        }

        @keyframes prometheusTypewriterBlink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </span>
  )
}

function TextIlluminateFallback({
  text,
  className,
  delayMs = 0,
}: {
  text: string
  className?: string
  delayMs?: number
}) {
  const reduceMotion = useReducedMotion()
  const [ref, visible] = useIntersectionOnce<HTMLSpanElement>()
  const [illuminated, setIlluminated] = React.useState(reduceMotion)

  React.useEffect(() => {
    if (!visible) return
    if (reduceMotion) {
      setIlluminated(true)
      return
    }

    const timer = window.setTimeout(() => setIlluminated(true), delayMs + 1200)
    return () => window.clearTimeout(timer)
  }, [delayMs, reduceMotion, visible])

  return (
    <span ref={ref} className={cn('relative inline-block', className)}>
      <span
        className={cn('relative z-10 transition-colors duration-700', illuminated ? 'text-[#EAEAEA] opacity-100' : 'text-[#333] opacity-15')}
      >
        {text}
      </span>
      <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.span
          className="absolute inset-y-0 left-0 w-[35%]"
          initial={false}
          animate={illuminated ? { x: '120%' } : { x: '-120%' }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: delayMs / 1000 }}
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(160, 210, 220, 0.9) 45%, rgba(200, 230, 240, 0.6) 55%, transparent 100%)',
          }}
        />
      </span>
    </span>
  )
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
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { opacity: 0, strokeDashoffset: 120 }}
        animate={reduceMotion ? undefined : { opacity: 1, strokeDashoffset: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
      />
      <motion.path
        d={`${path} L 120 40 L 0 40 Z`}
        fill="rgba(255,255,255,0.06)"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? undefined : { opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  )
}

function ReachCurveChart({
  data,
  activeRange,
  onRangeChange,
}: {
  data: ChartPoint[]
  activeRange: AnalyticsRange
  onRangeChange: (range: AnalyticsRange) => void
}) {
  const reduceMotion = useReducedMotion()
  const chartRef = React.useRef<HTMLDivElement | null>(null)
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const points = React.useMemo(() => buildChartPoints(data), [data])
  const linePath = React.useMemo(() => buildSmoothPath(points), [points])
  const areaPath = React.useMemo(() => buildAreaPath(points), [points])
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] ?? null : null
  const hoverDatum = hoverIndex !== null ? data[hoverIndex] ?? null : null

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = chartRef.current
    if (!element || !data.length) return

    const rect = element.getBoundingClientRect()
    const progress = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const index = Math.round(progress * (data.length - 1))
    setHoverIndex(index)
  }

  return (
    <motion.section
      className="rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)] p-5 backdrop-blur-[12px]"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 1.4 }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#444]">REACH CURVE</p>
          <h2 className="mt-2 text-xl font-light text-[#EAEAEA]">Cross-platform reach curve</h2>
        </div>
        <div className="flex items-center gap-2">
          {rangeOptions.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onRangeChange(range)}
              className={cn(
                'rounded-full border border-[rgba(255,255,255,0.05)] px-3 py-1 text-[11px] text-[#555] transition-colors duration-300 hover:text-[#AAA]',
                activeRange === range && 'bg-[rgba(255,255,255,0.04)] text-[#CCC]',
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        className="relative mt-5 h-[300px] lg:h-[420px]"
      >
        {data.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-[13px] italic text-[#333]">
            Awaiting signal...
          </div>
        ) : (
          <>
            <svg viewBox="0 0 800 320" className="h-full w-full" role="img" aria-label="Reach trend">
              <defs>
                <linearGradient id="analytics-reach-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
              </defs>

              {gridLines.map((line) => (
                <line
                  key={line.y}
                  x1="32"
                  x2="768"
                  y1={line.y}
                  y2={line.y}
                  stroke="rgba(255,255,255,0.03)"
                  strokeDasharray="4 8"
                />
              ))}

              {points.map((point, index) => (
                <line
                  key={`${point.x}-${index}`}
                  x1={point.x}
                  x2={point.x}
                  y1="32"
                  y2="288"
                  stroke="rgba(255,255,255,0.02)"
                />
              ))}

              <motion.path
                d={areaPath}
                fill="url(#analytics-reach-fill)"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
              <motion.path
                d={linePath}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? false : { opacity: 0, strokeDashoffset: 120 }}
                animate={reduceMotion ? undefined : { opacity: 1, strokeDashoffset: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                style={{ strokeDasharray: 120, strokeDashoffset: 120 }}
              />

              {points.map((point, index) => (
                <circle
                  key={`${point.x}-${point.y}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={hoverIndex === index ? 4 : 2.2}
                  fill={hoverIndex === index ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.42)'}
                />
              ))}

              {data.map((item, index) => (
                <text key={`${item.label}-${index}`} x={points[index]?.x ?? 0} y="310" textAnchor="middle" fill="#555" fontSize="11">
                  {item.label}
                </text>
              ))}
            </svg>

            {hoverPoint && hoverDatum ? (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,22,0.9)] px-3 py-2 text-[12px] text-[#CCC] backdrop-blur-xl"
                style={{
                  left: hoverPoint.x / 800 * 100 + '%',
                  top: Math.max(hoverPoint.y - 18, 24),
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#555]">{hoverDatum.label}</div>
                <div className="mt-1 text-sm text-[#EAEAEA]">{formatNumber(hoverDatum.reach)} reach</div>
                <div className="mt-0.5 text-[11px] text-[#888]">{hoverDatum.engagement}% engagement</div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </motion.section>
  )
}

function TiltSignalCard({ signal }: { signal: TopSignal }) {
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
    <aside className="rounded-[12px] bg-transparent lg:mt-0">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#444]">TOP SIGNAL</p>
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handleLeave}
        className="mt-4 overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.04)] bg-[#111112] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        style={{
          transform: 'perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))',
          transition: 'transform 0.1s ease-out',
          '--rx': '0deg',
          '--ry': '0deg',
        } as React.CSSProperties}
      >
        <div className="relative aspect-square overflow-hidden">
          <Image src={signal.image} alt={signal.title} fill sizes="320px" className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.8)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#888]">
              <PlayCircle className="size-4 text-[#999]" />
              Featured signal
            </div>
            <h3 className="mt-3 text-[16px] font-normal text-white">{signal.title}</h3>
            <p className="mt-1 text-[11px] text-[#888]">{signal.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Retention</div>
          <div className="mt-3 text-[24px] font-light text-[#EAEAEA]">{signal.retention}</div>
        </div>
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#555]">Engagement</div>
          <div className="mt-3 text-[24px] font-light text-[#EAEAEA]">{signal.engagement}</div>
        </div>
      </div>
    </aside>
  )
}

function RecentAssetsGrid({
  items,
  onItemsChange,
}: {
  items: Array<AssetItem | null>
  onItemsChange: React.Dispatch<React.SetStateAction<Array<AssetItem | null>>>
}) {
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dropIndex, setDropIndex] = React.useState<number | null>(null)

  const handleDrop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    onItemsChange((current) => {
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(fromIndex < toIndex ? toIndex - 1 : toIndex, 0, moved ?? null)
      return next.slice(0, current.length)
    })
  }

  return (
    <LayoutGroup>
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {items.map((item, index) => {
          const isDropTarget = dropIndex === index
          return (
            <motion.div
              key={item?.id ?? `slot-${index}`}
              layout
              transition={{ layout: { duration: 0.3, ease: 'easeOut' } }}
              className={cn(
                'relative aspect-square overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.03)]',
                isDropTarget && 'border-[rgba(255,255,255,0.15)]',
              )}
              onDragOver={(event) => {
                event.preventDefault()
                setDropIndex(index)
              }}
              onDrop={() => {
                if (dragIndex !== null) handleDrop(dragIndex, index)
                setDragIndex(null)
                setDropIndex(null)
              }}
            >
              {item ? (
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    setDragIndex(index)
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setDropIndex(null)
                  }}
                  className="group relative h-full w-full"
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                    className="object-cover transition-all duration-300 group-hover:scale-[1.02] group-hover:brightness-110"
                  />
                  {item.kind === 'gif' ? (
                    <span className="absolute left-0 top-0 rounded-br-[12px] bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/72">
                      GIF
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.62)_0%,transparent_100%)] px-2 pb-2 pt-6 text-[11px] text-white/82 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.title}
                  </div>
                </button>
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <span className="size-2 rounded-full bg-[rgba(255,255,255,0.06)]" />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

function useIntersectionOnce<T extends Element>(threshold = 0.45) {
  const ref = React.useRef<T | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element || visible) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, visible])

  return [ref, visible] as const
}

function formatMetric(key: keyof typeof mockMetrics, value: number) {
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

function buildChartPoints(data: ChartPoint[]) {
  const width = 800
  const height = 320
  const paddingX = 32
  const paddingY = 32
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const values = data.map((point) => point.reach)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)

  return values.map((value, index) => ({
    x: paddingX + (innerWidth * index) / Math.max(values.length - 1, 1),
    y: paddingY + innerHeight - ((value - min) / range) * innerHeight,
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

function buildAreaPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return ''
  const line = buildSmoothPath(points)
  const baseline = 288
  const first = points[0]
  const last = points[points.length - 1]
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`
}

const gridLines = [64, 112, 160, 208, 256].map((y) => ({ y }))
