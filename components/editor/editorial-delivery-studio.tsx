'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowDownToLine, Check, Film, LoaderCircle, Plus, RefreshCw, Type } from 'lucide-react'
import type { ProjectExport } from '@/lib/types'
import type { EditorialCue } from '@/lib/editor/editorial-timeline-state'
import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'
import { isPlayableRender, projectRenderHistory, renderDownloadPath, renderPreviewPath } from '@/lib/editor/render-delivery'

type TextTreatment = {
  fontFamily: string
  fontSizePx: number
  maxWidthPct: number
  xPct: number
  yPct: number
  animation: string
}

const fonts = ['Inter', 'Arial', 'Georgia', 'Impact', 'Courier New']
const animations = ['none', 'fade', 'rise', 'pop', 'typewriter']
const defaultTreatment: TextTreatment = {
  fontFamily: 'Inter', fontSizePx: 48, maxWidthPct: 80, xPct: 50, yPct: 80, animation: 'fade',
}

function textTreatmentOf(cue: EditorialCue | undefined): TextTreatment {
  const raw = cue?.context?.textStyle
  const saved = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {}
  return {
    fontFamily: typeof saved.fontFamily === 'string' && fonts.includes(saved.fontFamily) ? saved.fontFamily : defaultTreatment.fontFamily,
    fontSizePx: typeof saved.fontSizePx === 'number' ? saved.fontSizePx : defaultTreatment.fontSizePx,
    maxWidthPct: typeof saved.maxWidthPct === 'number' ? saved.maxWidthPct : defaultTreatment.maxWidthPct,
    xPct: typeof saved.xPct === 'number' ? saved.xPct : defaultTreatment.xPct,
    yPct: typeof saved.yPct === 'number' ? saved.yPct : defaultTreatment.yPct,
    animation: typeof saved.animation === 'string' && animations.includes(saved.animation) ? saved.animation : defaultTreatment.animation,
  }
}

function dateLabel(value: string) {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Unknown date'
}

function renderProgress(record: ProjectExport | undefined): number | null {
  const metadata = record?.metadata
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const progress = (metadata as Record<string, unknown>).progressPercent
  return typeof progress === 'number' && Number.isFinite(progress) && progress >= 0 && progress <= 100
    ? Math.round(progress)
    : null
}

export function EditorialDeliveryStudio({
  projectId, sourceAssetId, sourceUrl, projectTitle, currentTimeSec, durationSec,
}: {
  projectId: string
  sourceAssetId: string | null
  sourceUrl: string | null
  projectTitle: string
  currentTimeSec: number
  durationSec: number
}) {
  const editorial = useEditorialTimeline()
  const [records, setRecords] = React.useState<ProjectExport[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [selectedCueId, setSelectedCueId] = React.useState<string | null>(null)
  const [text, setText] = React.useState('')
  const [treatment, setTreatment] = React.useState<TextTreatment>(defaultTreatment)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [historyError, setHistoryError] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState(false)

  const cues = editorial.timeline?.cues ?? []
  const textCues = cues.filter((cue) => cue.type === 'text')
  const selectedCue = textCues.find((cue) => cue.id === selectedCueId) ?? textCues[0]
  const history = sourceAssetId ? projectRenderHistory(records, projectId, sourceAssetId) : []
  const completedRecords = history.filter((record) => isPlayableRender(record, projectId, sourceAssetId ?? ''))
  const selectedRecord = completedRecords.find((record) => record.id === selectedId) ?? completedRecords[0]
  const finishedRecord = selectedRecord && sourceAssetId && isPlayableRender(selectedRecord, projectId, sourceAssetId) ? selectedRecord : null
  const pendingRecord = history.find((record) => record.status === 'pending' || record.status === 'processing')
  const latestRecord = history[0]
  const pendingProgress = renderProgress(pendingRecord)

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/exports/history`, {cache: 'no-store'})
      const payload = await response.json() as {exports?: ProjectExport[]; error?: string}
      if (!response.ok) throw new Error(payload.error || 'Unable to load renders.')
      setRecords(Array.isArray(payload.exports) ? payload.exports : [])
      setHistoryError(null)
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : 'Unable to load renders.')
    }
  }, [projectId])

  React.useEffect(() => {
    setRecords([])
    setSelectedId(null)
    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [projectId, sourceAssetId, refresh])

  React.useEffect(() => {
    if (!selectedCue) {
      setSelectedCueId(null)
      setText('')
      setTreatment(defaultTreatment)
      return
    }
    setSelectedCueId(selectedCue.id)
    setText(selectedCue.text ?? '')
    setTreatment(textTreatmentOf(selectedCue))
  }, [selectedCue])

  const addText = () => {
    if (!sourceAssetId || !editorial.timeline) return
    const start = Math.max(0, Math.min(currentTimeSec, Math.max(0, durationSec - 0.2)))
    const end = Math.min(Math.max(durationSec, start + 0.2), start + 3)
    const cue: EditorialCue = {
      id: `text-${crypto.randomUUID()}`, type: 'text', start, end, title: 'New text', text: 'Your text',
      region: 'custom', origin: 'editor', context: {textStyle: defaultTreatment},
    }
    editorial.patch({type: 'cues', cues: [...cues, cue]})
    setSelectedCueId(cue.id)
    setExpanded(true)
  }

  const saveText = () => {
    if (!selectedCue || !text.trim()) return
    editorial.patch({
      type: 'cues',
      cues: cues.map((cue) => cue.id === selectedCue.id ? {
        ...cue, text: text.trim(), title: text.trim().slice(0, 80), region: 'custom', origin: 'editor' as const,
        context: {...cue.context, textStyle: treatment},
      } : cue),
    })
  }

  const startRender = async () => {
    if (!sourceAssetId || isSubmitting || pendingRecord || editorial.status !== 'saved') return
    setIsSubmitting(true)
    setError(null)
    setExpanded(true)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/exports`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({preset: 'default', sourceAssetId, editorialRevision: editorial.timeline?.revision}),
      })
      const payload = await response.json() as {export?: ProjectExport; error?: string}
      if (!response.ok) throw new Error(payload.error || 'The render could not start.')
      const created = payload.export
      if (created?.id) setRecords((current) => [created, ...current.filter((record) => record.id !== created.id)])
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The render could not start.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const download = async () => {
    if (!finishedRecord || isDownloading) return
    setIsDownloading(true)
    setError(null)
    try {
      const response = await fetch(renderDownloadPath(finishedRecord.id), {cache: 'no-store'})
      const payload = await response.json() as {downloadUrl?: string; download?: {url?: string; filename?: string}; error?: string}
      if (!response.ok) throw new Error(payload.error || 'Could not prepare the download.')
      const url = payload.download?.url ?? payload.downloadUrl
      if (!url) throw new Error('The finished MP4 has no download URL.')
      const link = document.createElement('a')
      link.href = url
      link.download = payload.download?.filename ?? `${projectTitle.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.mp4`
      document.body.append(link)
      link.click()
      link.remove()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download the MP4.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section aria-label="Final render studio" className="w-full overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#0a0e0c] shadow-[0_20px_70px_rgba(0,0,0,.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(157,246,90,.13),transparent_35%)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#9df65a]/20 bg-[#9df65a]/10 text-[#b4fb60]"><Film className="size-4" /></span>
          <div><h2 className="text-sm font-semibold text-white">Final render</h2><p className="text-[11px] text-white/45">Compare the source with each finished MP4.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void refresh()} className="grid size-9 place-items-center rounded-lg border border-white/10 text-white/60 hover:bg-white/5 hover:text-white" aria-label="Refresh renders"><RefreshCw className="size-4" /></button>
          <button type="button" onClick={() => void startRender()} disabled={!sourceAssetId || isSubmitting || Boolean(pendingRecord) || editorial.status !== 'saved'} title={!sourceAssetId ? 'Add a source video first.' : editorial.status !== 'saved' ? 'Wait for the timeline to finish saving.' : undefined} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#b4fb60] px-3 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-45">
            {isSubmitting || pendingRecord ? <LoaderCircle className="size-3.5 animate-spin" /> : <Film className="size-3.5" />}
            {isSubmitting ? 'Submitting render…' : pendingRecord?.status === 'pending' ? 'Queued…' : pendingRecord ? 'Rendering…' : editorial.status !== 'saved' ? 'Saving timeline…' : 'Render final MP4'}
          </button>
        </div>
      </div>
      {(error || historyError || editorial.status === 'error') && <p role="alert" className="border-b border-rose-400/15 bg-rose-400/5 px-5 py-2 text-xs text-rose-200">{error ?? historyError ?? editorial.error}</p>}
      <p role="status" className="border-b border-white/8 px-5 py-2 text-[11px] text-white/45">This creates a 9:16 Mini-Run from the source, 30 seconds by default. Saved editor timeline layers are not yet applied to its render.</p>
      {isSubmitting && <p role="status" aria-live="polite" className="border-b border-white/8 px-5 py-2 text-[11px] text-white/55">Submitting the source to VINCERE Mini-Run…</p>}
      {latestRecord && <div role="status" aria-live="polite" className="border-b border-white/8 px-5 py-3 text-[11px] text-white/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Latest render: <span className="capitalize text-white/90">{latestRecord.status}</span>{latestRecord.errorMessage ? ` · ${latestRecord.errorMessage}` : ''}</span>
          {pendingRecord && <span className="text-white/40">Status refreshes every 5 seconds</span>}
        </div>
        {pendingRecord && <div
          className="mt-2"
          role="progressbar"
          aria-label="Final render progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pendingProgress ?? undefined}
          aria-valuetext={pendingProgress === null ? 'Progress percentage not reported' : `${pendingProgress}% complete`}
        >
          <div className="h-px overflow-hidden bg-white/20">
            {pendingProgress === null
              ? <motion.div className="h-full w-1/3 bg-[#b4fb60]" initial={{x: '-100%'}} animate={{x: '300%'}} transition={{duration: 1.4, ease: 'linear', repeat: Infinity}} />
              : <div className="h-full bg-[#b4fb60] transition-[width] duration-500" style={{width: `${pendingProgress}%`}} />}
          </div>
          <p className="mt-1 text-[10px] text-white/40">{pendingProgress === null ? 'The renderer has not reported a percentage yet.' : `${pendingProgress}% complete`}</p>
        </div>}
      </div>}
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/55"><span>01 / Original footage</span><span>Source</span></div>
          {sourceUrl ? <video key={sourceUrl} src={sourceUrl} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" aria-label="Original footage" /> : <div className="grid aspect-video place-items-center text-xs text-white/35">Upload a source video to begin</div>}
        </div>
        <div className="overflow-hidden rounded-xl border border-[#9df65a]/20 bg-black">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#b4fb60]"><span>02 / Finished cut</span><span>{finishedRecord ? 'MP4 ready' : pendingRecord?.status === 'pending' ? 'Queued' : pendingRecord ? 'Rendering' : 'Awaiting render'}</span></div>
          {finishedRecord ? <video key={finishedRecord.id} src={renderPreviewPath(finishedRecord.id)} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" aria-label="Finished MP4" /> : <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_40%,rgba(157,246,90,.08),transparent_55%)] px-8 text-center text-xs leading-5 text-white/40">{pendingRecord ? 'The backend is rendering this version. It will appear here when the MP4 is stored.' : 'Your completed render will play here beside the original.'}</div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-4 py-3 sm:px-5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">Versions</span>
        {completedRecords.map((record, index) => <button key={record.id} type="button" onClick={() => setSelectedId(record.id)} aria-pressed={finishedRecord?.id === record.id} title={dateLabel(record.createdAt)} className={`rounded-md border px-2.5 py-1 text-[11px] transition ${finishedRecord?.id === record.id ? 'border-[#9df65a]/50 bg-[#9df65a]/12 text-[#c9ff88]' : 'border-white/10 text-white/55 hover:text-white'}`}>V{completedRecords.length - index}</button>)}
        {completedRecords.length === 0 && <span className="text-[11px] text-white/35">No finished versions yet</span>}
        {finishedRecord && <button type="button" onClick={() => void download()} disabled={isDownloading} className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/15 px-2.5 text-[11px] text-white/75 hover:bg-white/5"><ArrowDownToLine className="size-3.5" /> Download MP4</button>}
      </div>
      <div className="border-t border-white/8 px-4 py-3 sm:px-5">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center justify-between text-left text-xs font-medium text-white/75"><span className="inline-flex items-center gap-2"><Type className="size-4 text-[#b4fb60]" /> Text and motion controls</span><span className="text-white/40">{expanded ? 'Hide' : 'Edit'}</span></button>
        {expanded && <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.75fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><label className="text-[11px] text-white/45" htmlFor="delivery-text-cue">Text layer</label><select id="delivery-text-cue" value={selectedCue?.id ?? ''} onChange={(event) => setSelectedCueId(event.target.value)} className="min-h-9 min-w-40 flex-1 rounded-md border border-white/15 bg-[#151a17] px-2 text-xs text-white">{textCues.length === 0 && <option value="">No text layers</option>}{textCues.map((cue) => <option key={cue.id} value={cue.id}>{cue.text || cue.title}</option>)}</select><button type="button" onClick={addText} disabled={!sourceAssetId || !editorial.timeline} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-white/15 px-2.5 text-xs text-white/75 hover:bg-white/5"><Plus className="size-3.5" /> Add text</button></div>
            <label className="block text-[11px] text-white/50">Text / characters<textarea value={text} onChange={(event) => setText(event.target.value)} disabled={!selectedCue} maxLength={20000} rows={2} className="mt-1 block w-full resize-y rounded-md border border-white/15 bg-[#111512] p-2.5 text-sm text-white outline-none focus:border-[#9df65a]/50" /></label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="text-[11px] text-white/50">Font<select value={treatment.fontFamily} onChange={(event) => setTreatment({...treatment, fontFamily: event.target.value})} className="mt-1 block min-h-9 w-full rounded-md border border-white/15 bg-[#151a17] px-2 text-xs text-white">{fonts.map((font) => <option key={font}>{font}</option>)}</select></label>
              <label className="text-[11px] text-white/50">Animation<select value={treatment.animation} onChange={(event) => setTreatment({...treatment, animation: event.target.value})} className="mt-1 block min-h-9 w-full rounded-md border border-white/15 bg-[#151a17] px-2 text-xs text-white">{animations.map((animation) => <option key={animation}>{animation}</option>)}</select></label>
              <label className="text-[11px] text-white/50">Size <span className="text-white/30">{treatment.fontSizePx}px</span><input type="range" min="18" max="120" value={treatment.fontSizePx} onChange={(event) => setTreatment({...treatment, fontSizePx: Number(event.target.value)})} className="mt-3 w-full accent-[#b4fb60]" /></label>
              <label className="text-[11px] text-white/50">Width <span className="text-white/30">{treatment.maxWidthPct}%</span><input type="range" min="20" max="100" value={treatment.maxWidthPct} onChange={(event) => setTreatment({...treatment, maxWidthPct: Number(event.target.value)})} className="mt-3 w-full accent-[#b4fb60]" /></label>
              <label className="text-[11px] text-white/50">Horizontal <span className="text-white/30">{treatment.xPct}%</span><input type="range" min="0" max="100" value={treatment.xPct} onChange={(event) => setTreatment({...treatment, xPct: Number(event.target.value)})} className="mt-3 w-full accent-[#b4fb60]" /></label>
              <label className="text-[11px] text-white/50">Vertical <span className="text-white/30">{treatment.yPct}%</span><input type="range" min="0" max="100" value={treatment.yPct} onChange={(event) => setTreatment({...treatment, yPct: Number(event.target.value)})} className="mt-3 w-full accent-[#b4fb60]" /></label>
            </div>
            <button type="button" onClick={saveText} disabled={!selectedCue || !text.trim() || editorial.status === 'saving'} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#9df65a]/35 bg-[#9df65a]/10 px-3 text-xs font-semibold text-[#c9ff88] disabled:opacity-40"><Check className="size-3.5" /> Save text treatment</button>
            <span className="ml-2 text-[11px] text-white/40">{editorial.status === 'saving' ? 'Saving…' : editorial.status === 'saved' ? 'Saved to this project' : 'Changes are saved with the project timeline'}</span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(145deg,#1d241c,#080b09)] [container-type:inline-size]">
            {sourceUrl && <video src={sourceUrl} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-55" aria-hidden="true" />}
            <div className="pointer-events-none absolute inset-0" aria-label="Text placement preview">
              <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{left: `${treatment.xPct}%`, top: `${treatment.yPct}%`, width: `${treatment.maxWidthPct}%`}}>
                <motion.span
                  key={`${selectedCue?.id ?? 'new'}-${treatment.animation}`}
                  initial={treatment.animation === 'none' ? false : {
                    opacity: treatment.animation === 'typewriter' ? 1 : 0,
                    y: treatment.animation === 'rise' ? 18 : 0,
                    scale: treatment.animation === 'pop' ? 0.7 : 1,
                    clipPath: treatment.animation === 'typewriter' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)',
                  }}
                  animate={{opacity: 1, y: 0, scale: 1, clipPath: 'inset(0 0 0 0)'}}
                  transition={{duration: treatment.animation === 'typewriter' ? 1.1 : 0.42, ease: 'easeOut'}}
                  className="block break-words text-center font-semibold leading-tight text-white [text-shadow:0_2px_12px_#000]"
                  style={{fontFamily: treatment.fontFamily, fontSize: `clamp(12px, ${treatment.fontSizePx / 4}cqw, 34px)`}}
                >{text || 'Your text'}</motion.span>
              </div>
            </div>
            <span className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-1 text-[9px] uppercase tracking-wider text-white/65">Placement preview</span>
          </div>
        </div>}
      </div>
    </section>
  )
}
