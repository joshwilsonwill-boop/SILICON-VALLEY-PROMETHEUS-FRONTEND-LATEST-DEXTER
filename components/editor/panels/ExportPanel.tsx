'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Facebook,
  Film,
  HardDrive,
  Instagram,
  Linkedin,
  Twitter,
  Upload,
  Youtube,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import { downloadMedia } from '@/lib/editor/browser-download'
import { normalizeUxError } from '@/lib/ux/errors'
import { dispatchCompletionEvent } from '../completion-event'

const resolutions = [
  { id: 'original', label: 'Original Source', desc: 'Keep source resolution' },
  { id: '4k', label: '4K (Ultra HD)', desc: '3840 x 2160' },
  { id: '1080p', label: '1080p (Full HD)', desc: '1920 x 1080' },
  { id: '720p', label: '720p (HD)', desc: '1280 x 720' },
]

const socialPlatforms: Array<{
  id: string
  label: string
  icon: LucideIcon
  connected: boolean
}> = [
  { id: 'youtube', label: 'YouTube', icon: Youtube, connected: false },
  { id: 'tiktok', label: 'TikTok', icon: Zap, connected: false },
  { id: 'instagram', label: 'Instagram', icon: Instagram, connected: false },
  { id: 'x', label: 'X / Twitter', icon: Twitter, connected: false },
  { id: 'facebook', label: 'Facebook', icon: Facebook, connected: false },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, connected: false },
  { id: 'google_drive', label: 'Google Drive', icon: Cloud, connected: false },
  { id: 'dropbox', label: 'Dropbox', icon: HardDrive, connected: false },
]

export function ExportPanel({ mediaUrl }: { mediaUrl?: string | null }) {
  const [selectedResolution, setSelectedResolution] = useState('1080p')
  const [exportMode, setExportMode] = useState<'cinematic' | 'fast'>('cinematic')
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [exportMessage, setExportMessage] = useState('')
  const [selectedPlatformId, setSelectedPlatformId] = useState('')
  const selectedPlatform = useMemo(
    () => socialPlatforms.find((platform) => platform.id === selectedPlatformId) ?? null,
    [selectedPlatformId],
  )
  const selectedResolutionLabel = resolutions.find((resolution) => resolution.id === selectedResolution)?.label ?? '1080p'

  const handleDownload = async () => {
    if (!mediaUrl || exportStatus === 'loading') {
      if (!mediaUrl) {
        setExportStatus('error')
        setExportMessage('Your source is still loading. Keep this panel open and try again when it is ready.')
      }
      return
    }

    setExportStatus('loading')
    setExportMessage('Preparing a secure download…')

    try {
      await downloadMedia(mediaUrl, 'prometheus-export.mp4')
      setExportStatus('success')
      setExportMessage('Download started. Your final cut is on its way.')
      dispatchCompletionEvent({
        process: 'export',
        title: `${exportMode === 'cinematic' ? 'Cinematic' : 'Fast'} export ready`,
        message: 'Your finished cut is ready to share.',
      })
    } catch (error) {
      setExportStatus('error')
      setExportMessage(normalizeUxError(error, 'export'))
    }
  }

  return (
    <section className="space-y-6" aria-label="Export options">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(34,211,238,0.15),transparent_38%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-prometheus-accent-cyan/80">Output desk</p>
            <h2 className="mt-2 text-xl font-medium tracking-[-0.03em] text-white">Deliver the final cut.</h2>
            <p className="mt-2 max-w-[26rem] text-sm leading-6 text-prometheus-text-secondary">Choose the finish, confirm the destination, then export with a single clear action.</p>
          </div>
          <span className={cn('mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]', mediaUrl ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-300' : 'border-amber-300/20 bg-amber-300/8 text-amber-200')}>
            <span className={cn('size-1.5 rounded-full', mediaUrl ? 'bg-emerald-300' : 'animate-pulse bg-amber-200')} />
            {mediaUrl ? 'Source ready' : 'Source loading'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/28">01</span>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">Resolution</h3>
        </div>
        <div className="space-y-2">
          {resolutions.map((resolution) => (
            <button
              key={resolution.id}
              type="button"
              aria-pressed={selectedResolution === resolution.id}
              onClick={() => setSelectedResolution(resolution.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                selectedResolution === resolution.id
                  ? 'border-prometheus-accent-cyan/60 bg-prometheus-accent-cyan/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <span
                className={cn(
                  'size-4 rounded-full border-2',
                  selectedResolution === resolution.id
                    ? 'border-prometheus-accent-cyan bg-prometheus-accent-cyan shadow-[0_0_12px_rgba(34,211,238,0.55)]'
                    : 'border-white/30',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{resolution.label}</span>
                <span className="block text-xs text-white/42">{resolution.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/28">02</span>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">Render pace</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ExportModeButton active={exportMode === 'cinematic'} icon={Film} label="Cinematic" detail="Best finish" onClick={() => setExportMode('cinematic')} />
          <ExportModeButton active={exportMode === 'fast'} icon={Zap} label="Fast Export" detail="Quick handoff" onClick={() => setExportMode('fast')} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-white/28">03</span>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">Destination</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon
            const active = selectedPlatformId === platform.id

            return (
              <button
                key={platform.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedPlatformId(platform.id)}
                className={cn(
                  'relative flex min-h-[4.9rem] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-colors',
                  active ? 'border-prometheus-accent-purple/60 bg-prometheus-accent-purple/12' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                )}
              >
                <Icon className="size-5 text-white/68" aria-hidden="true" />
                <span className="text-[10px] leading-3 text-white/48">{platform.label}</span>
                {!platform.connected ? (
                  <span className="absolute right-1 top-1 rounded-full border border-white/10 bg-black/70 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/54">
                    Connect
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {selectedPlatform ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-white/52">
              {selectedPlatform.connected
                ? `${selectedPlatform.label} is connected.`
                : `${selectedPlatform.label} is not connected yet.`}
            </p>
            <a
              href={selectedPlatform.connected ? '#' : `/api/oauth/${selectedPlatform.id}/initiate`}
              className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-prometheus-accent-cyan/25 bg-prometheus-accent-cyan/12 px-3 text-xs font-medium text-prometheus-accent-cyan transition-colors hover:bg-prometheus-accent-cyan/20"
            >
              {selectedPlatform.connected ? `Export to ${selectedPlatform.label}` : `Connect ${selectedPlatform.label}`}
            </a>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-white/40">Export profile</span>
          <span className="text-right font-medium text-white/80">{selectedResolutionLabel} · {exportMode === 'cinematic' ? 'Cinematic' : 'Fast'}</span>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="text-white/40">Format</span>
          <span className="font-medium text-white/80">MP4 · Device</span>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-5">
        {exportMessage ? (
          <p className={cn('flex items-start gap-2 text-xs leading-5', exportStatus === 'error' ? 'text-amber-200' : exportStatus === 'success' ? 'text-emerald-300' : 'text-white/58')}>
            {exportStatus === 'error' ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : null}
            {exportStatus === 'success' ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : null}
            <span>{exportMessage}</span>
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={!mediaUrl || exportStatus === 'loading'}
        className="group relative flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-prometheus-accent-cyan/30 bg-prometheus-accent-cyan/18 text-sm font-semibold text-prometheus-accent-cyan shadow-[0_12px_32px_rgba(34,211,238,0.08)] transition-all hover:-translate-y-0.5 hover:bg-prometheus-accent-cyan/28 hover:shadow-[0_16px_38px_rgba(34,211,238,0.14)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[420%] motion-reduce:hidden" aria-hidden="true" />
        {exportStatus === 'loading' ? <InlineLoadingAnimation size={16} label="Preparing export download" /> : <Upload className="size-4" aria-hidden="true" />}
        {exportStatus === 'loading' ? 'Preparing export…' : mediaUrl ? 'Download to device' : 'Waiting for source'}
      </button>
    </section>
  )
}

function ExportModeButton({
  active,
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-center transition-all',
        active ? 'border-prometheus-accent-purple/60 bg-prometheus-accent-purple/12 text-white' : 'border-white/10 bg-white/[0.03] text-white/64 hover:bg-white/[0.06]',
      )}
    >
      <Icon className="mx-auto mb-2 size-5" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-white/36">{detail}</span>
    </button>
  )
}
