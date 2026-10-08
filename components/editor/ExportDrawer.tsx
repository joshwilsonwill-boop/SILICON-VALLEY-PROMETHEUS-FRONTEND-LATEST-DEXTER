'use client'

import { useState } from 'react'
import { useProjectExportReadiness } from '@/hooks/use-project-export-readiness'
import Link from 'next/link'
import { Check, Cloud, Download, FileVideo2, Loader2, Monitor, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUserConnections } from '@/hooks/use-user-connections'
import { useConfiguredProviders } from '@/lib/oauth/client-capabilities'
import { getProviderMetadata } from '@/lib/oauth/provider-metadata'
import { isExportProviderConnected } from '@/lib/editor/export-connections'
import { useEditor } from './EditorContext'

const SOCIAL_TARGETS = ['tiktok', 'youtube', 'instagram', 'x', 'facebook', 'linkedin']
const STORAGE_TARGETS = ['google_drive', 'dropbox']
const RESOLUTIONS = [
  { id: '4K', detail: '3840 x 2160', available: false },
  { id: '2K', detail: '2560 x 1440', available: false },
  { id: '1080p', detail: '1080 x 1920 portrait', available: true },
  { id: '720p', detail: '1280 x 720', available: false },
  { id: '480p', detail: '854 x 480', available: false },
]

type ExportDrawerProps = {
  onStartRender?: () => Promise<{ success: boolean; summary: string }>
  onDownloadFinished?: () => void
  hasFinishedRender?: boolean
  hasSource?: boolean
  projectId?: string
}

export function ExportDrawer({ onStartRender, onDownloadFinished, hasFinishedRender = false, hasSource = false, projectId }: ExportDrawerProps) {
  const { showExport, setShowExport } = useEditor()
  const { connections, loading, error: connectionError, refresh } = useUserConnections()
  const configured = useConfiguredProviders()
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {readiness, status: readinessStatus, error: readinessError, retry: retryReadiness} = useProjectExportReadiness(showExport ? projectId : null)

  async function startRender() {
    if (isRendering) return
    if (readinessStatus !== 'ready') {
      setError(readinessError || 'Wait for the export readiness check before submitting.')
      return
    }
    if (!onStartRender || !hasSource) {
      setError(hasSource ? 'Open a project in the Editor to start its render.' : 'Add a source video before starting a render.')
      return
    }
    setIsRendering(true)
    setError(null)
    try {
      const result = await onStartRender()
      if (result.success) setShowExport(false)
      else setError(result.summary)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The render could not be started.')
    } finally {
      setIsRendering(false)
    }
  }

  function renderAccountCard(provider: string) {
    const metadata = getProviderMetadata(provider)
    const connected = isExportProviderConnected(connections, provider)
    const available = configured.includes(provider)
    return (
      <div key={provider} className="flex min-h-[74px] items-center justify-between gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3 py-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.045]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-xs font-semibold text-white/75">{metadata?.name.slice(0, 1) ?? '?'}</span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white/90">{metadata?.name ?? provider}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45">
              <span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-400' : available ? 'bg-white/30' : 'bg-amber-300/70'}`} />
              {loading ? 'Checking account...' : connected ? 'Connected' : available ? 'Not connected' : 'Setup required'}
            </div>
          </div>
        </div>
        <Link href={`/settings/social-accounts${connected ? '' : `?connect=${provider}`}`} onClick={() => setShowExport(false)} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[10px] font-medium text-white/75 hover:bg-white/10">
          {connected ? 'Change account' : 'Connect'}
        </Link>
      </div>
    )
  }

  return (
    <Dialog open={showExport} onOpenChange={open => { if (!isRendering) setShowExport(open) }}>
      <DialogContent className="max-h-[92dvh] max-w-[760px] overflow-y-auto border-white/[0.11] bg-[#0a0e15]/[.98] p-0 text-white shadow-[0_28px_100px_rgba(0,0,0,.65)] backdrop-blur-2xl">
        <DialogHeader className="border-b border-white/[0.08] px-5 pb-4 pt-5 sm:px-6">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-sky-200/70"><Sparkles className="size-3.5" /> Studio delivery</div>
          <DialogTitle className="text-2xl font-black italic tracking-[-.04em] sm:text-[29px]">Export Video</DialogTitle>
          <DialogDescription className="text-xs text-white/50 sm:text-sm">Review the available source-based output before starting a Mini-Run.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <section aria-label="Source readiness" className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
            <span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full ${hasSource ? 'bg-emerald-400' : 'bg-rose-300'}`} />
            <div>
              <h3 className="text-xs font-semibold">{hasSource ? 'Source attached' : 'Source missing'}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-white/50">{hasSource ? 'The render service checks source access when you submit. Timeline save state is checked at submission.' : 'Add a source video before starting a render.'}</p>
            </div>
          </section>
          <section aria-label="Server readiness" className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
            {readinessStatus === 'checking' && <p role="status" className="text-xs text-white/65">Checking source storage, saved revision, and Mini-Run configuration...</p>}
            {readinessError && <p role="alert" className="text-xs text-rose-200">{readinessError} <button type="button" className="underline" onClick={retryReadiness}>Retry</button></p>}
            {readiness && <div className="space-y-1 text-[11px]">
              <p className={readiness.canSubmit ? 'text-emerald-200' : 'text-amber-200'}>{readiness.canSubmit ? 'Server checks passed' : 'Needs attention'}</p>
              <p className="text-white/55">Saved timeline revision {readiness.timelineRevision}; unsaved changes are checked when you submit.</p>
<p className="text-white/55">Source {readiness.sourceDurationMs ? `${(readiness.sourceDurationMs / 1000).toFixed(1)} seconds` : 'duration not recorded'}{readiness.sourceWidth && readiness.sourceHeight ? `, ${readiness.sourceWidth} x ${readiness.sourceHeight}` : ''}.</p>
              {!readiness.liveWorkerHealthChecked && <p className="text-white/45">Live Modal worker health is checked only when submitted.</p>}
              {readiness.blockers.length > 0 && <ul className="list-disc space-y-1 pl-4 text-amber-100/80">{readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
            </div>}
          </section>
          <ol aria-label="Mini-Run pipeline" className="grid gap-2 sm:grid-cols-4">
            <li className="rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-2.5"><span className="text-[9px] uppercase tracking-wider text-emerald-200/65">01 - Review</span><p className="mt-1 text-[10px] leading-relaxed text-white/65">Source attached; source access and timeline revision are validated when you submit.</p></li>
            <li className={`rounded-lg border p-2.5 ${isRendering ? 'border-sky-300/40 bg-sky-300/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'}`}><span className="text-[9px] uppercase tracking-wider text-sky-100/70">02 - Submit</span><p className="mt-1 text-[10px] leading-relaxed text-white/65">{isRendering ? 'Waiting for the tracked job receipt.' : 'Starts only after you choose the button below.'}</p></li>
            <li className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5"><span className="text-[9px] uppercase tracking-wider text-white/45">03 - Render</span><p className="mt-1 text-[10px] leading-relaxed text-white/50">Source-based portrait Mini-Run.</p></li>
            <li className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5"><span className="text-[9px] uppercase tracking-wider text-white/45">04 - Receive</span><p className="mt-1 text-[10px] leading-relaxed text-white/50">Progress and MP4 receipt appear in the editor.</p></li>
          </ol>
          <section>
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Send className="size-4 text-white/65" /><h3 className="text-sm font-semibold">Publish to social</h3></div>
              <Link href="/settings/social-accounts" onClick={() => setShowExport(false)} className="text-xs font-medium text-sky-300 hover:text-sky-200">Manage accounts</Link>
            </div>
            <p className="mb-3 text-xs text-white/40">These account connections are not used by this Mini-Run. The MP4 appears in project exports.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SOCIAL_TARGETS.map(renderAccountCard)}</div>
          </section>

          <section className="border-t border-white/[0.08] pt-4">
            <div className="mb-1 flex items-center gap-2"><Cloud className="size-4 text-white/65" /><h3 className="text-sm font-semibold">Save to storage</h3></div>
            <p className="mb-3 text-xs text-white/40">Cloud connections are not used by this Mini-Run. The MP4 appears in project exports.</p>
            <div className="grid gap-2 sm:grid-cols-2">{STORAGE_TARGETS.map(renderAccountCard)}</div>
          </section>

          <section className="border-t border-white/[0.08] pt-4">
            <div className="mb-1 flex items-center gap-2"><Monitor className="size-4 text-white/65" /><h3 className="text-sm font-semibold">Export settings</h3></div>
            <p className="mb-3 text-xs text-white/40">Available output profile for this project.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {RESOLUTIONS.map(option => <div key={option.id} aria-disabled={!option.available} className={`rounded-xl border p-3 ${option.available ? 'border-sky-300/45 bg-sky-300/[0.08] shadow-[0_0_22px_rgba(56,189,248,.07)]' : 'border-white/[0.07] bg-white/[0.02] opacity-55'}`}>
                <div className="flex items-center justify-between gap-1 text-xs font-semibold"><span>{option.id}</span>{option.available ? <Check className="size-3.5 text-sky-200" /> : <span className="text-[9px] font-medium text-white/45">Unavailable</span>}</div>
                <div className="mt-1 text-[10px] text-white/45">{option.detail}</div>
              </div>)}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex items-center gap-2 text-[11px] text-white/50"><FileVideo2 className="size-3.5" /> Format</div><div className="mt-1 text-xs font-medium">MP4</div><div className="mt-1 text-[10px] text-white/35">MOV unavailable</div></div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-[11px] text-white/50">Aspect ratio</div><div className="mt-1 text-xs font-medium">9:16 portrait</div><div className="mt-1 text-[10px] text-white/35">Fixed by current renderer</div></div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-[11px] text-white/50">Captions</div><div className="mt-1 text-xs font-medium">Worker planned</div><div className="mt-1 text-[10px] text-white/35">Saved editor captions are not included</div></div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-[11px] text-white/50">Source window</div><div className="mt-1 text-xs font-medium">Up to 30 seconds</div><div className="mt-1 text-[10px] text-white/35">Current default</div></div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"><div className="text-[11px] text-white/50">Music</div><div className="mt-1 text-xs font-medium">Automatic</div><div className="mt-1 text-[10px] text-white/35">Editor selection is not included</div></div>
            </div>
            <p className="mt-3 rounded-lg border border-amber-200/10 bg-amber-200/[0.035] px-3 py-2.5 text-[11px] leading-relaxed text-amber-100/70">The current renderer creates a fixed 1080 x 1920 portrait MP4 Mini-Run. Saved timeline edits and captions are not applied to that output yet.</p>
          </section>

          {connectionError && <p role="alert" className="text-xs text-amber-200">Account status unavailable. <button className="underline" onClick={() => void refresh()}>Retry</button></p>}
          {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
          {isRendering && <p role="status" aria-live="polite" className="text-xs text-sky-100">Submitting the source-based Mini-Run and waiting for a tracked job receipt. This does not render the saved timeline edits.</p>}
        </div>

        <DialogFooter className="flex-col-reverse items-stretch gap-2 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] text-white/40">1080p portrait | MP4 | Up to 30 seconds | Automatic music</div>
          <div className="flex gap-2">
            {hasFinishedRender && onDownloadFinished && <Button variant="outline" onClick={onDownloadFinished} className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10"><Download className="size-4" /> Download finished MP4</Button>}
            <Button variant="outline" disabled={isRendering} onClick={() => setShowExport(false)} className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10">Cancel</Button>
            <Button disabled={isRendering || !onStartRender || !hasSource || readinessStatus !== 'ready'} onClick={() => void startRender()} className="bg-sky-300 font-semibold text-slate-950 hover:bg-sky-200">
              {isRendering ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}{isRendering ? 'Submitting Mini-Run...' : 'Start source Mini-Run'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
