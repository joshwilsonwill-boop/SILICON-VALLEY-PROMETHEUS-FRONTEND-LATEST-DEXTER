'use client'

import { useMemo, useState } from 'react'
import {
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

export function ExportPanel() {
  const [selectedResolution, setSelectedResolution] = useState('1080p')
  const [exportMode, setExportMode] = useState<'cinematic' | 'fast'>('cinematic')
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [selectedPlatformId, setSelectedPlatformId] = useState('')
  const selectedPlatform = useMemo(
    () => socialPlatforms.find((platform) => platform.id === selectedPlatformId) ?? null,
    [selectedPlatformId],
  )
  const startExportFeedback = (mode: 'cinematic' | 'fast') => {
    setExportMode(mode)
    setExportStatus('loading')
    window.setTimeout(() => setExportStatus('success'), mode === 'cinematic' ? 2600 : 1800)
    window.setTimeout(() => setExportStatus('idle'), mode === 'cinematic' ? 5200 : 4400)
  }

  return (
    <section className="space-y-6" aria-label="Export options">
      <div>
        <p className="text-sm text-prometheus-text-secondary">Export your edit to device or platform-ready destinations.</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/82">Resolution</h3>
        <div className="space-y-2">
          {resolutions.map((resolution) => (
            <button
              key={resolution.id}
              type="button"
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
        <h3 className="text-sm font-semibold text-white/82">Quick Export</h3>
        <div className="grid grid-cols-2 gap-3">
          <ExportModeButton active={exportMode === 'cinematic'} icon={Film} label="Cinematic" onClick={() => startExportFeedback('cinematic')} />
          <ExportModeButton active={exportMode === 'fast'} icon={Zap} label="Fast Export" onClick={() => startExportFeedback('fast')} />
        </div>
        {exportStatus !== 'idle' ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-xs text-white/68">
            {exportStatus === 'loading' ? <InlineLoadingAnimation size={12} label="Preparing export" /> : null}
            {exportStatus === 'loading' ? 'Preparing export...' : `${exportMode === 'cinematic' ? 'Cinematic' : 'Fast'} export is queued.`}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/82">Social Platforms</h3>
        <div className="grid grid-cols-4 gap-2">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon
            const active = selectedPlatformId === platform.id

            return (
              <button
                key={platform.id}
                type="button"
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

      <button
        type="button"
        onClick={() => startExportFeedback('fast')}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-prometheus-accent-cyan/25 bg-prometheus-accent-cyan/18 text-sm font-medium text-prometheus-accent-cyan transition-colors hover:bg-prometheus-accent-cyan/28"
      >
        {exportStatus === 'loading' ? <InlineLoadingAnimation size={16} label="Preparing export download" /> : <Upload className="size-4" aria-hidden="true" />}
        {exportStatus === 'loading' ? 'Preparing export...' : 'Download to Device'}
      </button>
    </section>
  )
}

function ExportModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-center transition-all',
        active ? 'border-prometheus-accent-purple/60 bg-prometheus-accent-purple/12 text-white' : 'border-white/10 bg-white/[0.03] text-white/64 hover:bg-white/[0.06]',
      )}
    >
      <Icon className="mx-auto mb-2 size-5" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
