'use client'

import * as React from 'react'
import Image from 'next/image'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { Activity, ArrowUpRight, Eye, Heart, LoaderCircle, Play, PlayCircle, Share2, Sparkles } from 'lucide-react'

import { BackButton } from '@/components/navigation/BackButton'
import { cn } from '@/lib/utils'

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
  timeSeries: ChartPoint[]
  dataSource: 'youtube_live' | 'cached_platform_reports' | 'unavailable'
  metricsWarning: string | null
}

const metricCards: MetricCard[] = [
  { key: 'reach', label: 'Reach', icon: Eye, sparkline: [12, 18, 15, 24, 20, 28, 31, 29] },
  { key: 'watchTime', label: 'Watch time', icon: Activity, sparkline: [7, 11, 14, 12, 18, 20, 23, 25] },
  { key: 'likes', label: 'Likes', icon: Heart, sparkline: [4, 6, 8, 10, 11, 13, 12, 15] },
  { key: 'shares', label: 'Shares', icon: Share2, sparkline: [2, 3, 3, 5, 4, 6, 7, 8] },
]

const rangeOptions: AnalyticsRange[] = ['7D', '30D', '90D']

export function PrometheusAnalytics() {
  const reduceMotion = useReducedMotion()
  const [activeRange, setActiveRange] = React.useState<AnalyticsRange>('30D')
  const [livePayload, setLivePayload] = React.useState<AnalyticsPayload | null>(null)
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const chartData = React.useMemo(() => selectChartRange(livePayload?.timeSeries ?? [], activeRange), [activeRange, livePayload])
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

    async function loadAnalytics() {
      try {
        const response = await fetch('/api/analytics/video-performance', { cache: 'no-store' })
        const data = (await response.json().catch(() => null)) as AnalyticsPayload | null
        if (!cancelled && response.ok && data?.success) {
          setLivePayload(data)
          setLoadState('ready')
        } else if (!cancelled) {
          setLoadState('error')
        }
      } catch {
        if (!cancelled) {
          setLivePayload(null)
          setLoadState('error')
        }
      }
    }

    void loadAnalytics()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="relative min-h-full overflow-x-hidden bg-[#080909] text-[#F1F0EA]">
      <SpectraNoise />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[1720px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pb-12 sm:pt-7 lg:px-10">
        <header className="grid gap-6 border-b border-white/[0.09] pb-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end lg:gap-8">
          <BackButton fallbackHref="/studio" className="mb-0 border border-white/[0.12] bg-white/[0.025] text-white hover:bg-white/[0.08]" />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="size-1.5 animate-pulse rounded-full bg-[#D7FF4F]" />
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">PERFORMANCE SUITE / 2026</p>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
              <CinematicTitle
                text="Analytics"
                className="font-[family-name:var(--font-vogue-display)] text-[clamp(3.1rem,6vw,6.4rem)] font-normal leading-[0.78] text-[#F1F0EA]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[#8D8E85] lg:justify-self-end">
            <span>Last 30 days</span>
            <span className="h-px w-8 bg-white/20" />
            <span className="text-[#D7FF4F]">Live read</span>
          </div>
        </header>

        <section className="mt-7">
          <div className="grid divide-y divide-white/[0.09] border-y border-white/[0.09] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {metricCards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.article
                  key={card.key}
                  className="group min-w-0 px-4 py-5 first:pl-0 sm:px-5 sm:py-6 lg:px-7 lg:first:pl-0"
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-[#8D8E85]">{card.label}</span>
                    <Icon className="size-3.5 text-[#A8AA9D] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <div className="mt-5 font-[family-name:var(--font-geist)] text-[clamp(2rem,3vw,3.3rem)] font-light leading-none tracking-tight text-[#F1F0EA]">
                    <AnimatedMetric value={displayMetrics[card.key]} metricKey={card.key} />
                  </div>
                  <div className="mt-5 max-w-[11rem]">
                    <MetricSparkline values={card.sparkline} />
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.36fr)] xl:gap-10">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">Signal trajectory</p>
                <h2 className="mt-2 font-[family-name:var(--font-vogue-display)] text-[clamp(2rem,3.4vw,3.8rem)] leading-none text-[#F1F0EA]">Reach, without the noise.</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#999A91]">
                <span className="size-1.5 rounded-full bg-[#D7FF4F]" />
                <span>All channels</span>
              </div>
            </div>
            <ReachCurveChart
              data={chartData}
              activeRange={activeRange}
              onRangeChange={setActiveRange}
              loading={loadState === 'loading'}
              message={loadState === 'error' ? 'Unable to load analytics. Refresh the page to try again.' : livePayload?.metricsWarning ?? null}
            />
          </div>
          <TiltSignalCard signal={displaySignal} />
        </section>

        <section className="mt-12 border-t border-white/[0.09] pt-6" data-legacy-section="RECENT ASSETS">
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
            <RecentAssetsGrid videos={videoLedger} />
          </div>
        </section>
      </div>
    </main>
  )
}

function SpectraNoise() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-100" aria-hidden="true">
      <div className="absolute inset-0 bg-[#080909]" />
      <div className="prometheus-analytics-noise absolute inset-0" />
      <style>{`
        .prometheus-analytics-noise {
          background-image:
            radial-gradient(circle at 25% 12%, rgba(160, 180, 140, 0.025) 0 1px, transparent 1px),
            radial-gradient(circle at 78% 82%, rgba(215, 255, 79, 0.018) 0 1px, transparent 1px),
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
    <h1 className={cn('inline-flex overflow-hidden', className)} aria-label={text}>
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

function AnimatedMetric({ value, metricKey }: { value: number; metricKey: MetricCard['key'] }) {
  const reduceMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = React.useState(reduceMotion ? value : 0)
  const previousValue = React.useRef(0)

  React.useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(value)
      previousValue.current = value
      return
    }

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
  }, [reduceMotion, value])

  return <span className="tabular-nums">{formatMetric(metricKey, displayValue)}</span>
}

function selectChartRange(series: ChartPoint[], range: AnalyticsRange) {
  const visiblePoints = series.slice(-(range === '7D' ? 7 : range === '30D' ? 30 : 90))
  if (range !== '90D' || visiblePoints.length <= 18) return visiblePoints.map(formatChartPoint)

  const groups = Array.from({ length: Math.ceil(visiblePoints.length / 7) }, () => [] as ChartPoint[])
  visiblePoints.forEach((point, index) => groups[Math.floor(index / 7)]?.push(point))
  return groups.filter((group) => group.length > 0).map((group) => {
    const last = group[group.length - 1]!
    return formatChartPoint({
      label: last.label,
      reach: group.reduce((sum, point) => sum + point.reach, 0),
      watchTime: group.reduce((sum, point) => sum + point.watchTime, 0),
      engagement: Math.round((group.reduce((sum, point) => sum + point.engagement, 0) / group.length) * 10) / 10,
    })
  })
}

function formatChartPoint(point: ChartPoint): ChartPoint {
  const date = new Date(`${point.label}T00:00:00`)
  return {
    ...point,
    label: Number.isNaN(date.getTime()) ? point.label : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date),
  }
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

function ReachCurveChart({
  data,
  activeRange,
  onRangeChange,
  loading,
  message,
}: {
  data: ChartPoint[]
  activeRange: AnalyticsRange
  onRangeChange: (range: AnalyticsRange) => void
  loading: boolean
  message: string | null
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
      className="relative overflow-hidden border border-white/[0.1] bg-[#0C0D0C] px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 1.4 }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#8D8E85]">REACH CURVE</p>
          <p className="mt-1.5 text-[12px] text-[#A8AA9D]">Verified video reach over time</p>
        </div>
        <div className="flex items-center border border-white/[0.09] bg-black/20 p-1">
          {rangeOptions.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onRangeChange(range)}
              className={cn(
                'min-h-11 min-w-11 px-2 py-1.5 text-[10px] tracking-[0.08em] text-[#777970] transition-colors duration-300 hover:text-[#E8E8E0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7FF4F]',
                activeRange === range && 'bg-[#D7FF4F] text-[#0B0C0A]',
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
        className="relative mt-4 h-[280px] sm:h-[340px] lg:h-[420px]"
      >
        {loading ? (
          <div className="absolute inset-0 grid place-items-center" role="status" aria-label="Loading analytics">
            <LoaderCircle className="size-5 animate-spin text-[#D7FF4F]" />
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] leading-6 text-[#8D8E85]">
            {message ?? 'No video measurements are available for this period.'}
          </div>
        ) : (
          <>
            <svg viewBox="0 0 800 320" className="h-full w-full" role="img" aria-label="Reach trend">
              <defs>
                <linearGradient id="analytics-reach-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(215,255,79,0.16)" />
                  <stop offset="100%" stopColor="rgba(215,255,79,0)" />
                </linearGradient>
              </defs>

              {gridLines.map((line) => (
                <line
                  key={line.y}
                  x1="32"
                  x2="768"
                  y1={line.y}
                  y2={line.y}
                  stroke="rgba(255,255,255,0.075)"
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
                  stroke="rgba(255,255,255,0.045)"
                />
              ))}

              <AnimatePresence mode="wait" initial={false}>
                <motion.g key={activeRange}>
                  <motion.path
                d={areaPath}
                fill="url(#analytics-reach-fill)"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
                  <motion.path
                d={linePath}
                fill="none"
                stroke="rgba(215,255,79,0.96)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? false : { opacity: 0, pathLength: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1, pathLength: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />

              {points.map((point, index) => (
                    <motion.circle
                  key={`${point.x}-${point.y}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={hoverIndex === index ? 4 : 2.2}
                  fill={hoverIndex === index ? 'rgba(215,255,79,1)' : 'rgba(215,255,79,0.68)'}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
                  animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                  transition={{ delay: 0.38 + index * 0.035, duration: 0.24 }}
                />
              ))}
                </motion.g>
              </AnimatePresence>

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
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#A8AA9D]">{hoverDatum.label}</div>
                <div className="mt-1 text-sm text-[#F1F0EA]">{formatNumber(hoverDatum.reach)} reach</div>
                <div className="mt-0.5 text-[11px] text-[#A8AA9D]">{hoverDatum.engagement}% engagement</div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </motion.section>
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
    <aside className="min-w-0 xl:pt-0">
      <div className="flex items-center justify-between border-b border-white/[0.09] pb-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#8D8E85]">TOP SIGNAL</p>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#D7FF4F]">01 / 01</span>
      </div>
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handleLeave}
        className="group relative mt-5 overflow-hidden border border-white/[0.1] bg-[#111310] shadow-[0_28px_70px_rgba(0,0,0,0.4)]"
        style={{
          transform: 'perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))',
          transition: 'transform 0.1s ease-out',
          '--rx': '0deg',
          '--ry': '0deg',
        } as React.CSSProperties}
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          {signal?.image ? <Image src={signal.image} alt={signal.title} fill sizes="(max-width: 1280px) 100vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" /> : null}
          <div className={cn('absolute inset-0', signal?.image ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.12)_40%,rgba(3,4,3,0.94)_100%)]' : 'bg-[radial-gradient(circle_at_40%_25%,rgba(215,255,79,0.12),transparent_38%),#10110F]')} />
          {signal ? <div className="absolute left-4 top-4 flex items-center gap-2 border border-white/[0.14] bg-black/20 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-[#D7FF4F]" />
            Outperforming
          </div> : null}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#C5C7B9]">
              <PlayCircle className="size-3.5 text-[#D7FF4F]" />
              Featured signal
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-vogue-display)] text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.9] text-white">{signal?.title ?? 'Awaiting report'}</h3>
                <p className="mt-3 max-w-[22rem] text-[11px] leading-5 text-[#C5C7B9]">{signal?.subtitle ?? 'Connect a channel with analytics access to surface a top-performing video.'}</p>
              </div>
              <ArrowUpRight className="mt-1 size-5 shrink-0 text-[#D7FF4F] transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
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

function RecentAssetsGrid({ videos = [] }: { videos?: LiveVideo[] }) {
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
              <button
                type="button"
                className="contents text-left"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="relative aspect-video w-24 shrink-0 overflow-hidden border border-white/[0.1] bg-[#131410] sm:w-32">
                    {item.image ? <Image src={item.image} alt={item.alt} fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : <div className="absolute inset-0 bg-[#1A1C18]" />}
                    <div className="absolute inset-0 bg-black/15" />
                    <Play className="absolute bottom-2 left-2 size-3 fill-white text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-[#E9E9E1] transition-colors duration-300 group-hover:text-[#D7FF4F]">{item.title}</p>
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
                <ArrowUpRight className="hidden size-4 text-[#A8AA9D] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#D7FF4F] lg:block" />
              </button>
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
