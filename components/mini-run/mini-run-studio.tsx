'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  ExternalLink,
  Film,
  Flame,
  Layers,
  Loader2,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Video,
  Wand2,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ProjectListItem } from '@/lib/projects/types'
import {
  dispatchMiniRunFromProject,
  dispatchLongformFromProject,
  type MiniRunShotSpec,
} from '@/lib/api/mini-run-console'
import { useMiniRunJob } from '@/lib/hooks/use-mini-run-job'
import { useMiniRunLongformJob } from '@/lib/hooks/use-mini-run-longform-job'

type SourceAsset = {
  id: string
  project_id: string
  user_id: string
  mime_type?: string
  storage_path?: string
  storage_bucket?: string
  duration_ms?: number
  width?: number
  height?: number
  [key: string]: unknown
}

type ProjectsResponse = { success: boolean; projects: ProjectListItem[] }
type AssetResponse = { asset?: SourceAsset; source?: { url: string; expiresIn?: number } }

type SongPolicy = 'auto' | 'disabled'
type StudioMode = 'viral-batch' | 'single-cut'

const DEFAULT_SHORT_DURATION_SECONDS = 30
const MIN_SHORT_DURATION_SECONDS = 5
const MAX_SHORT_DURATION_SECONDS = 180
const OUTPUT_DURATION_TOLERANCE_SECONDS = 5

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const parseNonNegative = (value: string, fallback: number) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function formatDuration(milliseconds?: number | null) {
  if (milliseconds == null || !Number.isFinite(milliseconds)) return '—'
  const totalSeconds = Math.round(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const STATUS_STYLE: Record<string, string> = {
  queued: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
  active: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  processing: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
}

function IndeterminateBar() {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-violet-400/80 via-indigo-400/80 to-fuchsia-400/80"
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function MiniRunStudio() {
  const [projects, setProjects] = React.useState<ProjectListItem[] | null>(null)
  const [projectsLoading, setProjectsLoading] = React.useState(true)
  const [projectsError, setProjectsError] = React.useState<string | null>(null)

  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)
  const [asset, setAsset] = React.useState<SourceAsset | null>(null)
  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null)
  const [assetLoading, setAssetLoading] = React.useState(false)
  const [assetError, setAssetError] = React.useState<string | null>(null)

  // Studio Mode: AI Viral Batch vs Manual Single Cut
  const [mode, setMode] = React.useState<StudioMode>('viral-batch')

  // Common parameters
  const [songPolicy, setSongPolicy] = React.useState<SongPolicy>('auto')

  // Viral batch parameters (AI Auto-Pilot)
  const [nClips, setNClips] = React.useState<number>(4)
  const [viralPrompt, setViralPrompt] = React.useState<string>('')
  const [viralDispatching, setViralDispatching] = React.useState(false)
  const [viralDispatchError, setViralDispatchError] = React.useState<string | null>(null)

  // Single cut parameters (Manual Mode)
  const [startSec, setStartSec] = React.useState('0')
  const [preferredDurationSec, setPreferredDurationSec] = React.useState(String(DEFAULT_SHORT_DURATION_SECONDS))
  const [targetChunkWords, setTargetChunkWords] = React.useState('3')
  const [maxChunkWords, setMaxChunkWords] = React.useState('5')
  const [singleDispatching, setSingleDispatching] = React.useState(false)
  const [singleDispatchError, setSingleDispatchError] = React.useState<string | null>(null)
  const [singleJob, setSingleJob] = React.useState<{ jobId: string } | null>(null)
  const [deliveredDurationSec, setDeliveredDurationSec] = React.useState<number | null>(null)

  const selectedProject = projects?.find((p) => p.id === selectedProjectId) ?? null
  const durationMs = asset?.duration_ms ?? null

  // Single job tracking
  const { lifecycle: singleLifecycle, status: singleStatus, error: singleJobError } = useMiniRunJob(
    singleJob?.jobId ?? null,
  )

  // Resilient BullMQ-compatible batch tracking with localStorage persistence
  const {
    lifecycle: batchLifecycle,
    status: batchStatus,
    clips: batchClips,
    error: batchError,
    batchJobId,
    setBatchJobId,
    resetBatch,
  } = useMiniRunLongformJob()

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setProjectsLoading(true)
      setProjectsError(null)
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' })
        const body = (await res.json()) as ProjectsResponse
        if (!res.ok) throw new Error('Failed to load projects.')
        if (!cancelled) setProjects(body.projects ?? [])
      } catch (err) {
        if (!cancelled) setProjectsError(err instanceof Error ? err.message : 'Failed to load projects.')
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (!durationMs) return
    setPreferredDurationSec((current) => {
      const requested = Number(current)
      if (
        Number.isFinite(requested) &&
        requested >= MIN_SHORT_DURATION_SECONDS &&
        requested <= MAX_SHORT_DURATION_SECONDS
      )
        return current
      return String(
        Math.min(
          MAX_SHORT_DURATION_SECONDS,
          Math.max(MIN_SHORT_DURATION_SECONDS, Math.round(durationMs / 1000)),
        ),
      )
    })
  }, [durationMs])

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId)
    setSingleJob(null)
    setSingleDispatchError(null)
    setDeliveredDurationSec(null)
    setAsset(null)
    setSourceUrl(null)
    setAssetLoading(true)
    setAssetError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets`, {
        cache: 'no-store',
      })
      const body = (await res.json()) as AssetResponse
      if (!res.ok) throw new Error('Could not load this project’s source video.')
      setAsset(body.asset ?? null)
      setSourceUrl(body.source?.url ?? null)
    } catch (err) {
      setAssetError(err instanceof Error ? err.message : 'Could not load this project’s source video.')
    } finally {
      setAssetLoading(false)
    }
  }

  // Dispatch AI Viral Batch
  async function handleGenerateViralBatch() {
    if (!selectedProjectId || !asset?.id) return
    setViralDispatching(true)
    setViralDispatchError(null)
    try {
      const result = await dispatchLongformFromProject({
        projectId: selectedProjectId,
        sourceAssetId: asset.id,
        nClips,
        prompt: viralPrompt.trim() || undefined,
        songPolicy,
      })
      setBatchJobId(result.batchJobId)
    } catch (err) {
      setViralDispatchError(err instanceof Error ? err.message : 'Could not start viral batch.')
    } finally {
      setViralDispatching(false)
    }
  }

  // Dispatch Manual Single Short
  const shotSpec = ((): MiniRunShotSpec => {
    const sourceDurationSec = durationMs ? durationMs / 1000 : null
    const start = clamp(
      parseNonNegative(startSec, 0),
      0,
      Math.max(0, (sourceDurationSec ?? Number.MAX_SAFE_INTEGER) - 1),
    )
    const requestedDuration = clamp(
      parseNonNegative(preferredDurationSec, DEFAULT_SHORT_DURATION_SECONDS),
      MIN_SHORT_DURATION_SECONDS,
      MAX_SHORT_DURATION_SECONDS,
    )
    const availableDuration = sourceDurationSec ? Math.max(1, sourceDurationSec - start) : requestedDuration
    const outputDuration = Math.min(requestedDuration, availableDuration)
    return {
      pipeline: 'maul',
      sourceStartMs: Math.round(start * 1000),
      sourceEndMs: Math.round((start + outputDuration) * 1000),
      preferredDurationSec: requestedDuration,
      targetChunkWords: clamp(parseNonNegative(targetChunkWords, 3), 1, 15),
      maxChunkWords: clamp(parseNonNegative(maxChunkWords, 5), 1, 30),
      canvasWidth: 1080,
      canvasHeight: 1920,
      songPolicy,
    }
  })()

  async function handleGenerateSingle() {
    if (!selectedProjectId || !asset?.id) return
    setSingleDispatching(true)
    setSingleDispatchError(null)
    setSingleJob(null)
    setDeliveredDurationSec(null)
    try {
      const result = await dispatchMiniRunFromProject({
        projectId: selectedProjectId,
        sourceAssetId: asset.id,
        shot: shotSpec,
      })
      setSingleJob({ jobId: result.jobId })
    } catch (err) {
      setSingleDispatchError(err instanceof Error ? err.message : 'Could not start the short.')
    } finally {
      setSingleDispatching(false)
    }
  }

  const requestedOutputDurationSec = clamp(
    parseNonNegative(preferredDurationSec, DEFAULT_SHORT_DURATION_SECONDS),
    MIN_SHORT_DURATION_SECONDS,
    MAX_SHORT_DURATION_SECONDS,
  )
  const outputIsTooLong =
    deliveredDurationSec !== null &&
    deliveredDurationSec > requestedOutputDurationSec + OUTPUT_DURATION_TOLERANCE_SECONDS

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1 py-10">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
          <Clapperboard className="size-4" />
          Prometheus Mini-Runs
        </div>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
          Cut long-form sources into finished 9:16 viral shorts.
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-white/55">
          Select any long-form video. Prometheus transcribes once, uses AI to extract up to 10 high-retention viral moments, reframes to 9:16 portrait, and renders concurrent captioned shorts in parallel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left Column: Source Selection & Preview */}
        <div className="flex flex-col gap-6">
          {/* STEP 1: Source Selection */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex size-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80"
                >
                  1
                </motion.span>
                Choose the source video
              </CardTitle>
              <CardDescription>Select long-form content to extract viral shorts from.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-sm text-white/55">
                  <Loader2 className="size-4 animate-spin" />
                  Loading projects…
                </div>
              ) : projectsError ? (
                <div className="flex items-center gap-2 text-sm text-rose-300">
                  <XCircle className="size-4" /> {projectsError}
                </div>
              ) : !projects || projects.length === 0 ? (
                <p className="text-sm text-white/55">
                  No projects with a source yet. Upload a long-form video in the Studio first.
                </p>
              ) : (
                <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {projects.map((project) => {
                    const active = project.id === selectedProjectId
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => selectProject(project.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-[16px] border p-3 text-left transition',
                          active
                            ? 'border-white/24 bg-white/[0.07]'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.05]',
                        )}
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white/[0.04]">
                          {project.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Video className="size-5 text-white/40" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white/90">{project.title}</div>
                          <div className="truncate text-xs text-white/45">
                            {project.duration != null ? formatDuration(project.duration * 1000) : '—'} · {project.status}
                          </div>
                        </div>
                        {active && <CheckCircle2 className="size-5 shrink-0 text-emerald-300" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Preview Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Film className="size-4 text-white/50" />
                Source preview
              </CardTitle>
              <CardDescription>
                {selectedProject ? (
                  <>
                    {selectedProject.title} · {formatDuration(durationMs)}
                  </>
                ) : (
                  'Select a project to preview its source clip.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <div className="flex aspect-video items-center justify-center rounded-[18px] bg-white/[0.03]">
                  <Loader2 className="size-6 animate-spin text-white/40" />
                </div>
              ) : assetError ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[18px] border border-rose-500/20 bg-rose-500/5 text-sm text-rose-200">
                  <XCircle className="size-5" />
                  {assetError}
                </div>
              ) : asset && sourceUrl ? (
                <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black">
                  <video src={sourceUrl} controls className="aspect-video w-full bg-black object-contain" />
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[18px] bg-white/[0.03] text-sm text-white/45">
                  <Clapperboard className="size-6 text-white/30" />
                  {asset ? 'No source URL available.' : 'Nothing selected yet.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Execution Configuration & Results */}
        <div className="flex flex-col gap-6">
          {/* STEP 2: Configure & Dispatch */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex size-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80"
                    >
                      2
                    </motion.span>
                    Production Controls
                  </CardTitle>

                  {/* Mode Pill Toggle */}
                  <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => setMode('viral-batch')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                        mode === 'viral-batch'
                          ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white shadow-sm'
                          : 'text-white/60 hover:text-white',
                      )}
                    >
                      <Sparkles className="size-3.5 text-amber-300" />
                      AI Viral Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('single-cut')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                        mode === 'single-cut'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/60 hover:text-white',
                      )}
                    >
                      <SlidersHorizontal className="size-3.5 text-sky-300" />
                      Manual Shot
                    </button>
                  </div>
                </div>
                <CardDescription>
                  {mode === 'viral-batch'
                    ? 'AI scans the entire timeline, identifies virality peaks, snaps to speech boundaries, and renders 1 to 10 concurrent shorts.'
                    : 'Manually specify the exact time slice and typographic pace for one dedicated short.'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              {mode === 'viral-batch' ? (
                /* AI VIRAL BATCH CONFIG */
                <>
                  {/* Clip Count Selector */}
                  <div className="flex flex-col gap-3 rounded-[16px] border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-white/90">
                        Concurrent Viral Shorts to Produce
                      </Label>
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                        {nClips} {nClips === 1 ? 'Short' : 'Shorts'} {nClips === 3 ? '· Sweet Spot' : ''}
                      </Badge>
                    </div>

                    <Slider
                      value={[nClips]}
                      onValueChange={(val) => setNClips(val[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="py-1"
                    />

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      {[1, 3, 5, 8, 10].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setNClips(count)}
                          className={cn(
                            'flex-1 rounded-lg border py-1 text-center text-xs font-medium transition',
                            nClips === count
                              ? 'border-violet-500/40 bg-violet-500/20 text-violet-200'
                              : 'border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.05] hover:text-white/80',
                          )}
                        >
                          {count} {count === 3 ? '🔥' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Viral Prompt Guidance */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="viral-prompt" className="text-sm">
                        AI Virality Steering (Optional)
                      </Label>
                      <span className="text-[11px] text-white/40">Niche or tone direction</span>
                    </div>
                    <Textarea
                      id="viral-prompt"
                      placeholder="E.g. Focus on high-retention moments, contrarian business insights, shocking revelations, or punchy 30-second hooks..."
                      value={viralPrompt}
                      onChange={(e) => setViralPrompt(e.target.value)}
                      rows={2}
                      className="resize-none border-white/10 bg-white/[0.03] text-sm text-white/90 focus-visible:ring-violet-500"
                    />
                  </div>

                  {/* Soundtrack & Format */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Format</Label>
                      <div className="flex h-9 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.03] px-3 text-sm text-white/75">
                        <Film className="size-3.5 text-white/45" /> 9:16 portrait MP4
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mrun-song-batch">Soundtrack</Label>
                      <select
                        id="mrun-song-batch"
                        className="h-9 w-full rounded-[16px] border border-white/10 bg-white/[0.03] px-3 text-sm text-white/90 outline-none focus:ring-0"
                        value={songPolicy}
                        onChange={(e) => setSongPolicy(e.target.value as SongPolicy)}
                      >
                        <option value="auto">Auto-select music</option>
                        <option value="disabled">None</option>
                      </select>
                    </div>
                  </div>

                  {viralDispatchError && (
                    <div className="flex items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                      <XCircle className="size-4 shrink-0" /> {viralDispatchError}
                    </div>
                  )}

                  <Button
                    size="lg"
                    disabled={!asset || viralDispatching || batchLifecycle === 'polling'}
                    onClick={handleGenerateViralBatch}
                    className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                  >
                    {viralDispatching ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Enqueuing batch…
                      </>
                    ) : batchLifecycle === 'polling' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Generating {nClips} viral shorts…
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4" /> Generate {nClips} Viral Shorts
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* MANUAL SINGLE CUT CONFIG */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mrun-start">Start (sec)</Label>
                      <Input
                        id="mrun-start"
                        type="number"
                        min={0}
                        value={startSec}
                        onChange={(e) => setStartSec(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mrun-duration">Preferred length (sec)</Label>
                      <Input
                        id="mrun-duration"
                        type="number"
                        min={MIN_SHORT_DURATION_SECONDS}
                        max={MAX_SHORT_DURATION_SECONDS}
                        step={1}
                        value={preferredDurationSec}
                        onChange={(e) => setPreferredDurationSec(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mrun-target">Chunk words</Label>
                      <Input
                        id="mrun-target"
                        type="number"
                        min={1}
                        max={15}
                        value={targetChunkWords}
                        onChange={(e) => setTargetChunkWords(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mrun-max">Max words</Label>
                      <Input
                        id="mrun-max"
                        type="number"
                        min={1}
                        max={30}
                        value={maxChunkWords}
                        onChange={(e) => setMaxChunkWords(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label>Format</Label>
                      <div className="flex h-9 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.03] px-3 text-sm text-white/75">
                        <Film className="size-3.5 text-white/45" /> 9:16 portrait MP4
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mrun-song">Soundtrack</Label>
                      <select
                        id="mrun-song"
                        className="h-9 w-full rounded-[16px] border border-white/10 bg-white/[0.03] px-3 text-sm text-white/90 outline-none focus:ring-0"
                        value={songPolicy}
                        onChange={(e) => setSongPolicy(e.target.value as SongPolicy)}
                      >
                        <option value="auto">Auto-select music</option>
                        <option value="disabled">None</option>
                      </select>
                    </div>
                  </div>

                  {singleDispatchError && (
                    <div className="flex items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                      <XCircle className="size-4 shrink-0" /> {singleDispatchError}
                    </div>
                  )}

                  <Button
                    size="lg"
                    disabled={!asset || singleDispatching || singleLifecycle === 'polling'}
                    onClick={handleGenerateSingle}
                    className="w-full"
                  >
                    {singleDispatching ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Dispatching…
                      </>
                    ) : singleLifecycle === 'polling' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Rendering single short…
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4" /> Generate short
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* STEP 3: Results & Active Job Gallery */}
          {mode === 'viral-batch' ? (
            /* AI VIRAL BATCH OUTPUT */
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-amber-400" />
                    Viral Batch Deliverables
                  </CardTitle>
                  {batchJobId && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={batchStatus ? undefined : 'secondary'}
                        className={STATUS_STYLE[batchStatus?.state ?? 'processing'] ?? STATUS_STYLE.processing}
                      >
                        {batchStatus?.state ?? (batchLifecycle === 'completed' ? 'completed' : 'queued')}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={resetBatch} className="h-7 px-2 text-xs text-white/50">
                        <RefreshCw className="size-3 mr-1" /> Reset
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription>
                  {batchJobId
                    ? `Durable Batch ID: ${batchJobId}`
                    : 'Output shorts with hook analysis, virality scores, and download links appear here.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {batchLifecycle === 'polling' && (
                  <div className="flex w-full flex-col gap-3 rounded-[16px] border border-sky-500/20 bg-sky-500/5 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-sky-200">
                        <Settings2 className="size-3.5 animate-spin" /> Processing viral pipeline
                      </span>
                      <span className="text-white/40">Transcribe → AI Select → Parallel Render</span>
                    </div>
                    <IndeterminateBar />
                    <p className="text-xs text-white/50">
                      Jobs persist in Redis with worker lock heartbeats. If your connection drops, progress is safely preserved and will auto-resume upon reconnect.
                    </p>
                  </div>
                )}

                {batchLifecycle === 'failed' && (
                  <div className="flex w-full items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                    <XCircle className="size-4 shrink-0" /> {batchError ?? 'The viral batch failed.'}
                  </div>
                )}

                {batchClips.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                        <CheckCircle2 className="size-4" />
                        {batchClips.filter((c) => c.success).length} of {batchClips.length} Viral Shorts Ready
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                        9:16 Format
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {batchClips.map((clip) => (
                        <div
                          key={clip.jobId}
                          className="flex flex-col gap-3 rounded-[16px] border border-white/10 bg-white/[0.02] p-3.5 transition hover:border-white/20 hover:bg-white/[0.04]"
                        >
                          {/* Clip Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-200">
                                Rank #{clip.rank}
                              </Badge>
                              {clip.viralMetadata?.viralityScore != null && (
                                <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-200">
                                  <Flame className="size-3 mr-1 text-amber-400" />
                                  {clip.viralMetadata.viralityScore}/100
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-white/45">
                              {Math.round((clip.window?.durationMs ?? 0) / 1000)}s MP4
                            </span>
                          </div>

                          {/* Hook Quote */}
                          {clip.viralMetadata?.hook && (
                            <div className="text-xs font-semibold leading-snug text-white/90">
                              &ldquo;{clip.viralMetadata.hook}&rdquo;
                            </div>
                          )}

                          {/* AI Reason */}
                          {clip.viralMetadata?.reason && (
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-white/50">
                              {clip.viralMetadata.reason}
                            </p>
                          )}

                          {/* Video player if outputUrl available */}
                          {clip.outputUrl ? (
                            <div className="overflow-hidden rounded-[14px] border border-white/10 bg-black">
                              <video
                                src={clip.outputUrl}
                                controls
                                className="aspect-[9/16] max-h-64 w-full bg-black object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-[9/16] max-h-48 items-center justify-center rounded-[14px] bg-white/[0.02] text-xs text-white/40">
                              {clip.error || 'Rendering in progress…'}
                            </div>
                          )}

                          {/* Timestamp info */}
                          <div className="flex items-center justify-between text-[11px] text-white/40">
                            <span>
                              Window: {formatDuration(clip.window?.sourceStartMs)} – {formatDuration(clip.window?.sourceEndMs)}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          {clip.outputUrl && (
                            <div className="flex items-center gap-2 pt-1">
                              <Button asChild variant="outline" size="sm" className="h-8 flex-1 text-xs">
                                <a href={clip.outputUrl} download>
                                  <Download className="size-3.5 mr-1" /> Download
                                </a>
                              </Button>
                              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                                <a href={clip.outputUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="size-3.5 mr-1" /> Open
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {batchLifecycle === 'idle' && batchClips.length === 0 && (
                  <p className="flex w-full items-center gap-1.5 py-4 text-xs text-white/40">
                    <Sparkles className="size-3.5 text-amber-400" />
                    Select a source video on the left, then click Generate to create up to 10 viral shorts.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            /* MANUAL SINGLE SHOT OUTPUT */
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Film className="size-4 text-sky-400" />
                  Single Short Deliverable
                </CardTitle>
                <CardDescription>Finished manual short renders appear here.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {singleLifecycle === 'polling' && (
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-sky-200">
                        <Settings2 className="size-3.5 animate-spin" /> Rendering the short
                      </span>
                      <Badge
                        variant={singleStatus ? undefined : 'secondary'}
                        className={STATUS_STYLE[singleStatus?.state ?? 'processing'] ?? STATUS_STYLE.processing}
                      >
                        {singleStatus?.state ?? 'queued'}
                      </Badge>
                    </div>
                    <IndeterminateBar />
                    {singleStatus?.chunkCount != null && (
                      <p className="flex items-center gap-1.5 text-xs text-white/45">
                        <Layers className="size-3.5" /> {singleStatus.chunkCount} typography chunks planned
                      </p>
                    )}
                  </div>
                )}

                {singleLifecycle === 'completed' && singleStatus?.outputUrl && (
                  <div className="flex w-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                        <CheckCircle2 className="size-4" /> MP4 delivered
                      </div>
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">9:16 short</Badge>
                    </div>
                    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black">
                      <video
                        src={singleStatus.outputUrl}
                        controls
                        className="aspect-[9/16] w-full bg-black object-contain"
                        onLoadedMetadata={(event) => {
                          const duration = event.currentTarget.duration
                          setDeliveredDurationSec(Number.isFinite(duration) ? duration : null)
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <Clock3 className="size-3.5" />
                      {deliveredDurationSec == null
                        ? 'Checking delivered duration...'
                        : `${deliveredDurationSec.toFixed(1)} second MP4`}
                    </div>
                    {outputIsTooLong && (
                      <p className="rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs leading-5 text-rose-200">
                        The delivered file is more than five seconds beyond your preferred length. Review it before publishing or start a new render.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {outputIsTooLong ? (
                        <Button variant="outline" size="sm" disabled>
                          <Download className="size-4" /> Download
                        </Button>
                      ) : (
                        <Button asChild variant="outline" size="sm">
                          <a href={singleStatus.outputUrl} download>
                            <Download className="size-4 mr-1.5" /> Download
                          </a>
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <a href={singleStatus.outputUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4 mr-1.5" /> Open
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSingleJob(null)
                          setSingleDispatchError(null)
                          setDeliveredDurationSec(null)
                        }}
                      >
                        <RefreshCw className="size-4 mr-1.5" /> New short
                      </Button>
                    </div>
                    {singleStatus.pipelineJobId && (
                      <p className="truncate text-xs text-white/40">Job: {singleStatus.pipelineJobId}</p>
                    )}
                  </div>
                )}

                {singleLifecycle === 'completed' && !singleStatus?.outputUrl && (
                  <div className="flex w-full items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                    <XCircle className="size-4 shrink-0" /> The render completed without a downloadable MP4 URL.
                  </div>
                )}

                {singleLifecycle === 'failed' && (
                  <div className="flex w-full items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                    <XCircle className="size-4 shrink-0" /> {singleJobError ?? 'The render failed.'}
                  </div>
                )}

                {singleLifecycle === 'idle' && !singleDispatching && !singleDispatchError && (
                  <p className="flex w-full items-center gap-1.5 text-xs text-white/40">
                    <Sparkles className="size-3.5" /> Ready when you are.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
