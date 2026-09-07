'use client'

import * as React from 'react'
import { Link2, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type CloneState =
  | { phase: 'idle' }
  | { phase: 'analyzing' }
  | { phase: 'done'; styleReference: string; editingBreakdown: string }
  | { phase: 'error'; message: string }

export interface StyleCloneCardProps {
  className?: string
}

export function StyleCloneCard({ className }: StyleCloneCardProps) {
  const [url, setUrl] = React.useState('')
  const [styleHint, setStyleHint] = React.useState('')
  const [state, setState] = React.useState<CloneState>({ phase: 'idle' })

  const isBusy = state.phase === 'analyzing'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isBusy) return
    const trimmed = url.trim()
    if (!trimmed) return

    setState({ phase: 'analyzing' })
    try {
      const res = await fetch('/api/style-clone/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ url: trimmed, styleHint: styleHint.trim() || undefined }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        styleReference?: unknown
        editingBreakdown?: unknown
        error?: unknown
      }
      if (!res.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Style cloning failed.')
      }
      setState({
        phase: 'done',
        styleReference: typeof body.styleReference === 'string' ? body.styleReference : '',
        editingBreakdown: typeof body.editingBreakdown === 'string' ? body.editingBreakdown : '',
      })
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Style cloning failed.' })
    }
  }

  return (
    <section
      className={cn('rounded-xl border border-white/10 bg-white/[0.03] p-3.5', className)}
      aria-label="Clone a reference style"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-accent-cyan" />
        <h3 className="text-xs font-semibold tracking-wide text-white/85">Clone a reference style</h3>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-white/45">
        Paste a YouTube, TikTok, or Vimeo link. Prometheus breaks down its pacing, captions, and
        transitions into the motion knowledge base so chat can direct like it.
      </p>

      <form className="mt-2.5 flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5">
          <Link2 className="size-3.5 shrink-0 text-white/35" />
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            disabled={isBusy}
            aria-label="Reference video URL"
            className="min-w-0 flex-1 bg-transparent text-xs text-white/90 outline-none placeholder:text-white/28 disabled:opacity-50"
          />
        </div>
        <input
          type="text"
          value={styleHint}
          onChange={(event) => setStyleHint(event.target.value)}
          placeholder="Optional focus — e.g. punchy captions, luxury grade"
          disabled={isBusy}
          aria-label="Style emphasis hint"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white/90 outline-none placeholder:text-white/28 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isBusy || !url.trim()}
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-accent-cyan/90 px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:bg-accent-cyan disabled:opacity-30"
        >
          {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {isBusy ? 'Analyzing reference…' : 'Clone this style'}
        </button>
      </form>

      {state.phase === 'done' && (
        <div className="mt-2.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
            <CheckCircle2 className="size-3.5" /> Style added to the motion knowledge base
          </p>
          {state.styleReference && (
            <p className="mt-1 text-[11px] leading-relaxed text-white/70">{state.styleReference}</p>
          )}
          {state.editingBreakdown && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-white/40 hover:text-white/60">
                Full breakdown
              </summary>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">{state.editingBreakdown}</p>
            </details>
          )}
        </div>
      )}

      {state.phase === 'error' && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.06] p-2.5 text-[11px] leading-relaxed text-rose-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {state.message}
        </p>
      )}
    </section>
  )
}
