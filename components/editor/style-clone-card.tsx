'use client'

import * as React from 'react'
import { Link2, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeReferenceUrl, referenceAnalysisSchema, mapReferenceStyle, type ReferenceAnalysis, type AppliedReferenceStyle } from '@/lib/editor/reference-style'

type CloneState = { phase: 'idle' } | { phase: 'analyzing' } | { phase: 'done'; analysis: ReferenceAnalysis; videoUrl: string } | { phase: 'error'; message: string }
export interface StyleCloneCardProps {
  className?: string
  durationSec?: number
  sourceKey?: string
  onApplyStyle?: (style: AppliedReferenceStyle) => Promise<{ success: boolean; summary: string }>
}
export function StyleCloneCard({ className, durationSec = 0, sourceKey, onApplyStyle }: StyleCloneCardProps) {
  const [url, setUrl] = React.useState('')
  const [styleHint, setStyleHint] = React.useState('')
  const [state, setState] = React.useState<CloneState>({ phase: 'idle' })
  const [applying, setApplying] = React.useState(false)
  const [result, setResult] = React.useState<{ success: boolean; summary: string } | null>(null)
  const generation = React.useRef(0)
  React.useEffect(() => {
    const session = generation
    session.current++
    return () => { session.current++ }
  }, [sourceKey])
  const isBusy = state.phase === 'analyzing' || applying
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isBusy) return
    const token = ++generation.current
    setResult(null)
    setState({ phase: 'analyzing' })
    try {
      const videoUrl = normalizeReferenceUrl(url.trim())
      const res = await fetch('/api/style-clone/ingest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ url: videoUrl, styleHint: styleHint.trim() || undefined }), signal: AbortSignal.timeout(65000),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Reference analysis could not finish.')
      const analysis = referenceAnalysisSchema.parse(body.analysis)
      if (generation.current === token) setState({ phase: 'done', analysis, videoUrl })
    } catch (error) {
      if (generation.current === token) setState({ phase: 'error', message: error instanceof Error ? error.message : 'Reference analysis could not finish.' })
    }
  }
  async function handleApply() {
    if (state.phase !== 'done' || isBusy || !onApplyStyle) return
    const token = generation.current
    setApplying(true)
    try {
      const applied = await onApplyStyle(mapReferenceStyle(state.analysis, state.videoUrl, durationSec))
      if (generation.current === token) setResult(applied)
    } catch (error) {
      if (generation.current === token) setResult({ success: false, summary: error instanceof Error ? error.message : 'The look could not be applied.' })
    } finally { if (generation.current === token) setApplying(false) }
  }
  return (
    <section className={cn('rounded-xl border border-white/10 bg-[#101214] p-3.5', className)} aria-label="Reference video look">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-white/90"><Sparkles className="size-3.5 text-[#b4fb60]" /> Reference look</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/60">Analyze a public YouTube video, then try its color treatment, captions and camera moves on your preview.</p>
      <form className="mt-3 flex flex-col gap-2" onSubmit={handleSubmit}>
        <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-2.5 py-2">
          <Link2 className="size-3.5 shrink-0 text-white/50" />
          <input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="Public YouTube video link" disabled={isBusy} aria-label="Reference video URL" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/45 disabled:opacity-50" />
        </label>
        <input type="text" value={styleHint} onChange={event => setStyleHint(event.target.value)} placeholder="Optional focus, such as restrained captions" disabled={isBusy} aria-label="Reference style focus" className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/45 disabled:opacity-50" />
        <button type="submit" disabled={isBusy || !url.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-white/85 disabled:opacity-40">
          {state.phase === 'analyzing' ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-3.5" />}{state.phase === 'analyzing' ? 'Analyzing reference...' : 'Analyze reference'}
        </button>
      </form>
      {state.phase === 'done' && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="font-medium text-white/90">{state.analysis.style_reference}</p>
          <p className="text-white/65">{state.analysis.treatment} treatment / {state.analysis.caption_style.replaceAll('_', ' ')} captions / {state.analysis.zooms.length} camera moves</p>
          <details className="text-white/65"><summary className="cursor-pointer py-1 text-white/85">View evidence and limitations</summary>
            <p className="my-2 leading-relaxed">{state.analysis.editing_breakdown}</p>
            <ul className="space-y-1">{state.analysis.observations.map((observation, index) => <li key={index}>{observation.time_sec.toFixed(1)}s - {observation.detail}</li>)}</ul>
            <p className="mt-2">{state.analysis.limitations.join(' ')}</p>
          </details>
          <button type="button" onClick={handleApply} disabled={isBusy || !onApplyStyle || durationSec <= 0} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#b4fb60] px-3 font-semibold text-black disabled:opacity-40">
            {applying ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-3.5" />}{applying ? 'Applying and saving...' : 'Apply to Motion preview'}
          </button>
          <p className="text-[11px] leading-relaxed text-white/55">This approximates the reference look. Exact scene matching, transitions and exporting this look are not supported yet.</p>
        </div>
      )}
      {state.phase === 'error' && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-amber-200"><AlertTriangle className="size-3.5 shrink-0" />{state.message}</p>}
      {result && <p role="status" className={cn('mt-3 text-xs leading-relaxed', result.success ? 'text-[#b4fb60]' : 'text-amber-200')}>{result.summary}</p>}
    </section>
  )
}
