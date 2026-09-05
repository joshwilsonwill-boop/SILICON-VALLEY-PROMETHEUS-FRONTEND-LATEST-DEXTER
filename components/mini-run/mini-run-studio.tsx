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
  Layers,
  Loader2,
  RefreshCw,
  Settings2,
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
import { cn } from '@/lib/utils'
import type { ProjectListItem } from '@/lib/projects/types'
import { dispatchMiniRunFromProject } from '@/lib/api/mini-run-console'
import type { MiniRunShotSpec } from '@/lib/api/mini-run-console'
import { useMiniRunJob } from '@/lib/hooks/use-mini-run-job'

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

  const [songPolicy, setSongPolicy] = React.useState<SongPolicy>('auto')
  const [startSec, setStartSec] = React.useState('0')
  const [preferredDurationSec, setPreferredDurationSec] = React.useState(String(DEFAULT_SHORT_DURATION_SECONDS))
  const [targetChunkWords, setTargetChunkWords] = React.useState('3')
  const [maxChunkWords, setMaxChunkWords] = React.useState('5')

  const [dispatching, setDispatching] = React.useState(false)
  const [dispatchError, setDispatchError] = React.useState<string | null>(null)
  const [job, setJob] = React.useState<{ jobId: string } | null>(null)
  const [deliveredDurationSec, setDeliveredDurationSec] = React.useState<number | null>(null)

  const selectedProject = projects?.find((p) => p.id === selectedProjectId) ?? null
  const durationMs = asset?.duration_ms ?? null

  const { lifecycle, status, error: jobError } = useMiniRunJob(job?.jobId ?? null)

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
      if (Number.isFinite(requested) && requested >= MIN_SHORT_DURATION_SECONDS && requested <= MAX_SHORT_DURATION_SECONDS) return current
      return String(Math.min(MAX_SHORT_DURATION_SECONDS, Math.max(MIN_SHORT_DURATION_SECONDS, Math.round(durationMs / 1000))))
    })
  }, [durationMs])

  async function selectProject(projectId: string) {
    setSelectedProjectId(projectId)
    setJob(null)
    setDispatchError(null)
    setDeliveredDurationSec(null)
    setAsset(null)
    setSourceUrl(null)
    setAssetLoading(true)
    setAssetError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets`, { cache: 'no-store' })
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

  const shotSpec = ((): MiniRunShotSpec => {
    const sourceDurationSec = durationMs ? durationMs / 1000 : null
    const start = clamp(parseNonNegative(startSec, 0), 0, Math.max(0, (sourceDurationSec ?? Number.MAX_SAFE_INTEGER) - 1))
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

  async function handleGenerate() {
    if (!selectedProjectId || !asset?.id) return
    setDispatching(true)
    setDispatchError(null)
    setJob(null)
    setDeliveredDurationSec(null)
    try {
      const result = await dispatchMiniRunFromProject({
        projectId: selectedProjectId,
        sourceAssetId: asset.id,
        shot: shotSpec,
      })
      setJob({ jobId: result.jobId })
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : 'Could not start the short.')
    } finally {
      setDispatching(false)
    }
  }

  function handleReset() {
    setJob(null)
    setDispatchError(null)
    setSelectedProjectId(null)
    setAsset(null)
    setSourceUrl(null)
    setDeliveredDurationSec(null)
  }

  const requestedOutputDurationSec = clamp(
    parseNonNegative(preferredDurationSec, DEFAULT_SHORT_DURATION_SECONDS),
    MIN_SHORT_DURATION_SECONDS,
    MAX_SHORT_DURATION_SECONDS,
  )
  const outputIsTooLong = deliveredDurationSec !== null && deliveredDurationSec > requestedOutputDurationSec + OUTPUT_DURATION_TOLERANCE_SECONDS


  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <div className="flex flex-col gap-1 py-10">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
          <Clapperboard className="size-4" />
          Prometheus Mini-Runs
        </div>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
          Cut a long-form source into a finished 9:16 short — you call the shots.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-white/55">
          Select a landscape source and the moment to start from. Mini-Runs transcribes,
          reframes and renders one captioned 9:16 MP4 at your preferred short-form length.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-6">
        {/* STEP 1 — source selection + preview */}
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
              Choose the source
            </CardTitle>
            <CardDescription>Slices from these become your short.</CardDescription>
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
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
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


        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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

        {/* STEP 2 + 3 — shot spec + generate + result */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex size-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80"
              >
                2
              </motion.span>
              Set the shots
            </CardTitle>
            <CardDescription>Choose where the short begins, set its preferred length, and tune the caption rhythm.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
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
                  aria-label="Preferred output length in seconds"
                />
              </div>
            </div>

            <Separator />


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

            <Separator />

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


            <Separator />

            {dispatchError && (
              <div className="flex items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                <XCircle className="size-4 shrink-0" /> {dispatchError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                disabled={!asset || dispatching || lifecycle === 'polling'}
                onClick={handleGenerate}
                className="w-full"
              >
                {dispatching ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Dispatching…
                  </>
                ) : lifecycle === 'polling' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Rendering…
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" /> Generate short
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-white/40">
                {asset
                  ? 'This opens a dedicated render job on the Mini-Run worker — it won’t touch every video.'
                  : 'Select a source video above to enable this.'}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {lifecycle === 'polling' && (
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-sky-200">
                    <Settings2 className="size-3.5" /> Rendering the short
                  </span>
                  <Badge variant={status ? undefined : 'secondary'} className={STATUS_STYLE[status?.state ?? 'processing'] ?? STATUS_STYLE.processing}>
                    {status?.state ?? 'queued'}
                  </Badge>
                </div>
                <IndeterminateBar />
                {status?.chunkCount != null && (
                  <p className="flex items-center gap-1.5 text-xs text-white/45">
                    <Layers className="size-3.5" /> {status.chunkCount} typography chunks planned
                  </p>
                )}
              </div>
            )}

            {lifecycle === 'completed' && status?.outputUrl && (
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                    <CheckCircle2 className="size-4" /> MP4 delivered
                  </div>
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">9:16 short</Badge>
                </div>
                <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black">
                  <video
                    src={status.outputUrl}
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
                  {deliveredDurationSec == null ? 'Checking delivered duration...' : `${deliveredDurationSec.toFixed(1)} second MP4`}
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
                      <a href={status.outputUrl} download>
                        <Download className="size-4" /> Download
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm">
                    <a href={status.outputUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> Open
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RefreshCw className="size-4" /> New short
                  </Button>
                </div>
                {status.pipelineJobId && (
                  <p className="truncate text-xs text-white/40">Job: {status.pipelineJobId}</p>
                )}
              </div>
            )}

            {lifecycle === 'completed' && !status?.outputUrl && (
              <div className="flex w-full items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                <XCircle className="size-4 shrink-0" /> The render completed without a downloadable MP4 URL.
              </div>
            )}

            {lifecycle === 'failed' && (
              <div className="flex w-full items-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
                <XCircle className="size-4 shrink-0" /> {jobError ?? 'The render failed.'}
              </div>
            )}

            {lifecycle === 'idle' && !dispatching && !dispatchError && (
              <p className="flex w-full items-center gap-1.5 text-xs text-white/40">
                <Sparkles className="size-3.5" /> Ready when you are.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

