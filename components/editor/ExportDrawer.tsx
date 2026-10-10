'use client'

import { useState } from 'react'
import { useProjectExportReadiness } from '@/hooks/use-project-export-readiness'
import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'
import Link from 'next/link'
import {
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
        className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/[0.14] hover:bg-white/[0.035]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-black/20">
            <ProviderIcon className="size-4" style={{ color: brandColor }} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-white/85">{metadata?.name ?? provider}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/45">
              <span className={`size-1.5 rounded-full ${connected ? 'bg-emerald-400' : available ? 'bg-white/30' : 'bg-amber-300/70'}`} aria-hidden="true" />
              {loading ? 'Checking…' : connected ? 'Connected' : available ? 'Not connected' : 'Setup required'}
            </div>
          </div>
        </div>
        <Link
          href={`/settings/social-accounts${connected ? '' : `?connect=${provider}`}`}
          onClick={() => setShowExport(false)}
          className={`inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border px-3 text-[10px] font-medium transition-colors ${connected ? 'border-white/[0.12] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]' : 'border-white/[0.12] bg-white/[0.06] text-white/80 hover:bg-white/[0.11]'}`}
        >
          {connected ? 'Manage' : kind === 'storage' ? 'Link' : 'Connect'}
        </Link>
      </div>
    )
  }

  return (
    <Dialog open={showExport} onOpenChange={open => { if (!isRendering) setShowExport(open) }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-24px)] max-w-[520px] overflow-y-auto border-white/[0.11] bg-[#0b0d11] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,.58)]">
        <DialogHeader className="border-b border-white/[0.08] px-6 pb-5 pt-6">
          <DialogTitle className="text-xl font-semibold tracking-[-.025em]">Export video</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-white/50">Render a share-ready MP4 from this source.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <section aria-label="Export settings">
            <div className="mb-3 flex items-center gap-2.5">
              <Monitor className="size-4 text-white/55" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-medium">Output</h3>
                <p className="mt-0.5 text-[11px] text-white/45">Fixed profile for this source render.</p>
              </div>
            </div>
            <div className="rounded-lg border border-white/[0.1] bg-white/[0.025] px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-md bg-white/[0.06] text-white/65"><FileVideo2 className="size-4" aria-hidden="true" /></span>
                  <div>
                    <div className="text-sm font-medium">MP4 · 1080p Portrait</div>
                    <div className="mt-0.5 text-[11px] text-white/45">9:16 aspect ratio · up to 30 seconds</div>
                  </div>
                </div>
                <span className="text-[10px] text-white/40">Fixed profile</span>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-white/45">Saved timeline edits, editor captions, and selected music are not included in this render.</p>
          </section>

          <details className="group border-t border-white/[0.08] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-white/75 outline-none focus-visible:ring-2 focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
              <span>Accounts and destinations</span>
              <ChevronDown className="size-3 shrink-0 text-white/40 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mb-3 mt-2 text-[11px] text-white/40">Direct social posting is unavailable. The MP4 is saved to project exports. <Link href="/settings/social-accounts" onClick={() => setShowExport(false)} className="text-white/65 underline decoration-white/20 underline-offset-4 hover:text-white">Manage accounts</Link></p>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-white/35">Social</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{SOCIAL_TARGETS.map(provider => renderAccountCard(provider, 'social'))}</div>
            <div className="mb-2 mt-4 text-[10px] font-medium uppercase tracking-[0.08em] text-white/35">Cloud storage</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{STORAGE_TARGETS.map(provider => renderAccountCard(provider, 'storage'))}</div>
          </details>

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

        <DialogFooter className="flex-col-reverse items-stretch gap-3 border-t border-white/[0.08] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            {hasFinishedRender && onDownloadFinished && <Button variant="outline" onClick={onDownloadFinished} className="min-h-10 border-white/15 bg-white/[0.04] px-4 text-xs text-white hover:bg-white/10"><Download className="size-3.5" /> Download MP4</Button>}
            <Button variant="outline" disabled={isRendering} onClick={() => setShowExport(false)} className="min-h-10 border-white/15 bg-transparent px-4 text-xs text-white/75 hover:bg-white/[0.06]">Cancel</Button>
            <Button disabled={isRendering || !onStartRender || !hasSource || readinessStatus !== 'ready'} onClick={() => void startRender()} className="min-h-10 bg-white px-4 text-xs font-semibold text-[#111318] shadow-none hover:bg-white/90">
              {isRendering ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : <Download className="size-3.5" />}{isRendering ? 'Exporting…' : 'Export video'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
