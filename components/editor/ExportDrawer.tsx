'use client'

import { useState } from 'react'
import { useProjectExportReadiness } from '@/hooks/use-project-export-readiness'
import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'
import Link from 'next/link'
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  Facebook,
  FileVideo2,
  HardDrive,
  Instagram,
  Linkedin,
  Loader2,
  Monitor,
  Music2,
  Send,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUserConnections } from '@/hooks/use-user-connections'
import { useConfiguredProviders } from '@/lib/oauth/client-capabilities'
import { getProviderMetadata } from '@/lib/oauth/provider-metadata'
import { isExportProviderConnected } from '@/lib/editor/export-connections'
import { useEditor } from './EditorContext'

const SOCIAL_TARGETS = ['tiktok', 'youtube', 'instagram', 'x', 'facebook', 'linkedin']
const STORAGE_TARGETS = ['google_drive', 'dropbox']
const PROVIDER_ICONS: Record<string, LucideIcon> = {
  tiktok: Music2,
  youtube: Youtube,
  instagram: Instagram,
  x: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  google_drive: HardDrive,
  dropbox: Cloud,
}

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
  const timelineSync = useEditorialTimeline()

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

  function renderAccountCard(provider: string, kind: 'social' | 'storage') {
    const metadata = getProviderMetadata(provider)
    const connected = isExportProviderConnected(connections, provider)
    const available = configured.includes(provider)
    const ProviderIcon = PROVIDER_ICONS[provider] ?? Cloud
    const brandColor = metadata?.color === '#000000' ? '#f8fafc' : metadata?.color ?? '#dbeafe'
    return (
      <div
        key={provider}
        className={`group flex min-w-0 rounded-xl border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015))] transition-[border-color,background-color,box-shadow] duration-200 hover:border-white/20 hover:bg-white/[0.045] ${kind === 'social' ? 'min-h-[80px] flex-col justify-between gap-1.5 p-1.5' : 'min-h-[54px] items-center justify-between gap-2.5 px-3 py-2'}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-black/20 shadow-inner">
            <ProviderIcon className="size-4" style={{ color: brandColor }} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-white/90">{metadata?.name ?? provider}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[9px] text-white/50">
              <span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-400' : available ? 'bg-white/30' : 'bg-amber-300/70'}`} />
              {loading ? 'Checking account...' : connected ? 'Connected' : available ? 'Not connected' : 'Setup required'}
            </div>
          </div>
        </div>
        <Link
          href={`/settings/social-accounts${connected ? '' : `?connect=${provider}`}`}
          onClick={() => setShowExport(false)}
          className={`inline-flex min-h-6 items-center justify-center rounded-lg border px-2.5 text-[9px] font-semibold transition-colors ${connected ? 'border-white/[0.10] bg-white/[0.04] text-white/75 hover:bg-white/[0.09]' : 'border-sky-300/25 bg-sky-400/90 text-slate-950 shadow-[0_4px_14px_rgba(56,189,248,.12)] hover:bg-sky-300'} ${kind === 'storage' ? 'shrink-0 min-w-[82px]' : 'w-full'}`}
        >
          {kind === 'storage' ? connected ? 'Change' : 'Link account' : connected ? 'Change account' : 'Connect'}
        </Link>
      </div>
    )
  }

  return (
    <Dialog open={showExport} onOpenChange={open => { if (!isRendering) setShowExport(open) }}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-24px)] max-w-[560px] overflow-y-auto border-white/[0.12] bg-[#090d14]/[.98] p-0 text-white shadow-[0_28px_100px_rgba(0,0,0,.68)] backdrop-blur-2xl">
        <DialogHeader className="border-b border-white/[0.08] px-5 pb-3 pt-4 sm:px-6">
          <DialogTitle className="text-[25px] font-black italic tracking-[-.045em] sm:text-[28px]">Export Video</DialogTitle>
          <DialogDescription className="mt-0.5 text-[11px] text-white/50 sm:text-xs">Choose where to publish or save your final video.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-5 py-2.5 sm:px-6">
          <section aria-label="Publish to social">
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Send className="mt-0.5 size-4 shrink-0 text-white/75" aria-hidden="true" />
                <div>
                  <h3 className="text-[12px] font-semibold leading-tight">Publish to social</h3>
                  <p className="mt-0.5 text-[9px] text-white/40">Manage accounts. Direct posting is unavailable here.</p>
                </div>
              </div>
              <Link href="/settings/social-accounts" onClick={() => setShowExport(false)} className="mt-0.5 shrink-0 text-[9px] font-medium text-sky-300 hover:text-sky-200">Manage accounts <span aria-hidden="true">→</span></Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SOCIAL_TARGETS.map(provider => renderAccountCard(provider, 'social'))}</div>
          </section>

          <section className="border-t border-white/[0.08] pt-2.5" aria-label="Save to storage">
            <div className="mb-1.5 flex items-center gap-2.5">
              <Cloud className="size-4 text-white/75" aria-hidden="true" />
              <div>
                <h3 className="text-[12px] font-semibold leading-tight">Save to storage</h3>
                <p className="mt-0.5 text-[9px] text-white/40">Manage cloud accounts. The MP4 is delivered to project exports.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{STORAGE_TARGETS.map(provider => renderAccountCard(provider, 'storage'))}</div>
          </section>

          <section className="border-t border-white/[0.08] pt-2.5" aria-label="Export settings">
            <div className="mb-1.5 flex items-center gap-2.5">
              <Monitor className="size-4 text-white/75" aria-hidden="true" />
              <div>
                <h3 className="text-[12px] font-semibold leading-tight">Export settings</h3>
                <p className="mt-0.5 text-[9px] text-white/40">Output profile for this source Mini-Run.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div role="group" aria-label="Output format: MP4, fixed" aria-disabled="true" title="Fixed by the current renderer" className="min-w-0 rounded-lg border border-white/[0.09] bg-white/[0.025] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[9px] text-white/45"><FileVideo2 className="size-3" aria-hidden="true" />Format</div>
                <div className="mt-1 flex items-center justify-between gap-1"><span className="truncate text-[10px] font-semibold">MP4</span><ChevronDown className="size-3 text-white/40" aria-hidden="true" /></div>
              </div>
              <div role="group" aria-label="Output resolution: 1080p portrait, fixed" aria-disabled="true" title="Fixed by the current renderer" className="min-w-0 rounded-lg border border-sky-300/25 bg-sky-300/[0.045] px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[9px] text-white/45"><Monitor className="size-3" aria-hidden="true" />Resolution</div>
                <div className="mt-1 flex items-center justify-between gap-1"><span className="truncate text-[10px] font-semibold">1080p Portrait</span><Check className="size-3 shrink-0 text-sky-200" aria-hidden="true" /></div>
              </div>
              <div role="group" aria-label="Output aspect ratio: 9:16 portrait, fixed" aria-disabled="true" title="Fixed by the current renderer" className="min-w-0 rounded-lg border border-white/[0.09] bg-white/[0.025] px-2.5 py-2">
                <div className="text-[9px] text-white/45">Aspect ratio</div>
                <div className="mt-1 flex items-center justify-between gap-1"><span className="truncate text-[10px] font-semibold">9:16 Portrait</span><ChevronDown className="size-3 text-white/40" aria-hidden="true" /></div>
              </div>
              <div role="group" aria-label="Captions: not applied" aria-disabled="true" title="Editor captions are not applied by the current renderer" className="min-w-0 rounded-lg border border-white/[0.09] bg-white/[0.025] px-2.5 py-2">
                <div className="text-[9px] text-white/45">Captions</div>
                <div className="mt-1 flex items-center justify-between gap-1"><span className="truncate text-[10px] font-semibold">Not applied</span><ChevronDown className="size-3 text-white/40" aria-hidden="true" /></div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[9px] text-white/40">
              <span>Up to 30 seconds · File size shown after render</span>
              <span>Saved edits, editor captions, and selected music are not applied.</span>
            </div>
          </section>

          {(readinessStatus === 'checking' || readinessError || (readiness && !readiness.canSubmit)) && (
            <section aria-label="Render readiness" className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px]">
              {readinessStatus === 'checking' && <p role="status" className="text-white/60">Checking render readiness…</p>}
              {readinessError && <p role="alert" className="text-rose-200">{readinessError} <button type="button" onClick={retryReadiness} className="underline">Retry</button></p>}
              {readiness && !readiness.canSubmit && <p role="alert" className="text-amber-100/80">{readiness.blockers.join(' · ') || 'Render readiness needs attention.'}</p>}
            </section>
          )}

          {(timelineSync.status === 'loading' || timelineSync.status === 'saving' || timelineSync.status === 'error') && (
            <p role={timelineSync.status === 'error' ? 'alert' : 'status'} aria-live="polite" className={`text-[10px] ${timelineSync.status === 'error' ? 'text-amber-200' : 'text-white/45'}`}>
              {timelineSync.status === 'loading' ? 'Checking timeline sync…' : timelineSync.status === 'saving' ? 'Saving editor timeline. This source export remains available.' : `Timeline sync failed: ${timelineSync.error || 'The save could not be confirmed.'}`} {timelineSync.status === 'error' && <button type="button" onClick={timelineSync.retry} className="underline">Retry</button>}
            </p>
          )}
          {!hasSource && <p role="alert" className="text-[10px] text-amber-200">Add a source video before exporting.</p>}
          {connectionError && <p role="alert" className="text-[10px] text-amber-200">Account status unavailable. <button type="button" className="underline" onClick={() => void refresh()}>Retry</button></p>}
          {error && <p role="alert" className="text-[11px] text-rose-200">{error}</p>}
          {isRendering && <p role="status" aria-live="polite" className="text-[10px] text-sky-100">Submitting the source MP4 and waiting for a tracked render job. Saved timeline edits are not rendered.</p>}
        </div>

        <DialogFooter className="flex-col-reverse items-stretch gap-2 border-t border-white/[0.08] px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-[9px] text-white/40">1080p portrait · MP4 · Up to 30 seconds</div>
          <div className="flex flex-wrap justify-end gap-2">
            {hasFinishedRender && onDownloadFinished && <Button variant="outline" onClick={onDownloadFinished} className="min-h-9 border-white/15 bg-white/[0.04] px-3 text-[11px] text-white hover:bg-white/10"><Download className="size-3.5" /> Download MP4</Button>}
            <Button variant="outline" disabled={isRendering} onClick={() => setShowExport(false)} className="min-h-9 border-white/15 bg-white/[0.04] px-4 text-[11px] text-white hover:bg-white/10">Cancel</Button>
            <Button disabled={isRendering || !onStartRender || !hasSource || readinessStatus !== 'ready'} onClick={() => void startRender()} className="min-h-9 bg-sky-300 px-4 text-[11px] font-semibold text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,.22)] hover:bg-sky-200">
              {isRendering ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Download className="size-3.5" />}{isRendering ? 'Exporting…' : 'Export now'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
