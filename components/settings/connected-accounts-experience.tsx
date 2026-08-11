'use client'

import * as React from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Facebook,
  Instagram,
  Linkedin,
  Link2,
  Music2,
  ShieldCheck,
  Twitter,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConnectionStatus, type ConnectionStatus } from '@/hooks/use-connection-status'
import { useDisconnectPlatform } from '@/hooks/use-disconnect-platform'
import { cn } from '@/lib/utils'

const SOCIAL_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, accent: '#ff4b4b', scopes: ['Upload videos', 'Read analytics'], note: 'Long-form video and Shorts' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, accent: '#45f4d0', scopes: ['Post videos', 'Analytics'], note: 'Vertical video publishing' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, accent: '#f06aa6', scopes: ['Post reels', 'Stories'], note: 'Reels and story delivery' },
  { id: 'x', name: 'X', icon: Twitter, accent: '#b8c0cc', scopes: ['Post tweets', 'Media upload'], note: 'Posts and video threads' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, accent: '#5b91ff', scopes: ['Post to page', 'Groups'], note: 'Pages and community posts' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, accent: '#4ba3ff', scopes: ['Share articles', 'Company posts'], note: 'Professional publishing' },
] as const

type Platform = (typeof SOCIAL_PLATFORMS)[number]

type ConnectedAccountsExperienceProps = {
  onConnect: (provider: string) => void
}

function statusCopy(status: ConnectionStatus) {
  if (status === 'active') return 'Connected'
  if (status === 'expiring_soon') return 'Re-authentication due'
  if (status === 'expired') return 'Connection expired'
  return 'Not connected'
}

function statusTone(status: ConnectionStatus) {
  if (status === 'active') return 'bg-emerald-300'
  if (status === 'expiring_soon') return 'bg-amber-300'
  if (status === 'expired') return 'bg-rose-300'
  return 'bg-white/24'
}

export function ConnectedAccountsExperience({ onConnect }: ConnectedAccountsExperienceProps) {
  const { connections, loading, error, refresh, getStatus } = useConnectionStatus()
  const { disconnect, isDisconnecting } = useDisconnectPlatform()
  const [disconnectTarget, setDisconnectTarget] = React.useState<Platform | null>(null)
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null)
  const connectedCount = SOCIAL_PLATFORMS.filter((platform) => getStatus(platform.id).status === 'active').length
  const hasConnections = connectedCount > 0

  async function handleDisconnectConfirm() {
    if (!disconnectTarget) return

    setDisconnectError(null)
    try {
      await disconnect(disconnectTarget.id)
      await refresh()
      toast.success(`${disconnectTarget.name} disconnected`)
      setDisconnectTarget(null)
    } catch (caught) {
      setDisconnectError(caught instanceof Error ? caught.message : 'Unable to disconnect. Check your connection.')
    }
  }

  return (
    <>
      <section className="grid border border-white/[0.09] bg-white/[0.018] lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
        <div className="border-b border-white/[0.08] p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/34">Publishing network</p>
          <h2 className="mt-4 max-w-xl text-2xl font-medium leading-tight tracking-[-0.035em] text-white/94 sm:text-3xl">
            Publish everywhere. Keep access in one place.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/46">
            Connect only the channels you use. Prometheus requests publishing permissions through each platform&apos;s OAuth flow.
          </p>
          {!loading && !hasConnections ? (
            <Button
              type="button"
              className="mt-6 min-h-11 rounded-none bg-white px-5 text-black hover:bg-white/86 focus-visible:ring-white/60"
              onClick={() => onConnect(SOCIAL_PLATFORMS[0].id)}
            >
              Connect first channel
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 divide-x divide-white/[0.08] lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
          <Metric label="Connected" value={loading ? '—' : String(connectedCount).padStart(2, '0')} />
          <Metric label="Available" value={String(SOCIAL_PLATFORMS.length).padStart(2, '0')} />
          <Metric label="Protocol" value="OAuth" compact />
        </dl>
      </section>

      {error ? (
        <div className="mt-4 flex flex-col justify-between gap-4 border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-100 sm:flex-row sm:items-center" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">Connection status is unavailable.</p>
              <p className="mt-1 text-rose-100/68">{error}</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" className="rounded-none border-white/16 bg-transparent text-white hover:bg-white/8" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : null}

      <section className="mt-5 border border-white/[0.09] bg-white/[0.012]" aria-labelledby="publishing-destinations-title">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-6">
          <div>
            <h2 id="publishing-destinations-title" className="text-sm font-semibold text-white/88">Publishing destinations</h2>
            <p className="mt-1 text-xs text-white/38">Review access and connection health by platform.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/34">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Secure access
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 border-b border-white/[0.075] px-4 py-3 text-xs text-white/38 sm:px-6" role="status">
            <InlineLoadingAnimation size={15} label="Checking connected accounts" />
            Checking platform access…
          </div>
        ) : null}

        <div className="divide-y divide-white/[0.075]">
            {SOCIAL_PLATFORMS.map((platform, index) => {
              const Icon = platform.icon
              const connection = connections.find((entry) => entry.provider === platform.id)
              const { status, accountName } = getStatus(platform.id)
              const active = status === 'active'
              const needsReconnect = status === 'expired' || status === 'expiring_soon'
              const actionLabel = active ? 'Disconnect' : needsReconnect ? 'Reconnect' : 'Connect'

              return (
                <article
                  key={platform.id}
                  className="group relative grid gap-4 px-4 py-5 transition-colors duration-200 hover:bg-white/[0.025] sm:px-6 md:grid-cols-[36px_minmax(220px,0.9fr)_minmax(210px,1fr)_auto] md:items-center md:gap-5"
                >
                  <span className="hidden text-[10px] tabular-nums text-white/22 md:block" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative grid size-11 shrink-0 place-items-center border border-white/[0.1] bg-white/[0.025] text-white/64 transition-colors group-hover:border-white/[0.2] group-hover:text-white">
                      <span className="absolute inset-x-0 top-0 h-px opacity-70" style={{ backgroundColor: platform.accent }} aria-hidden="true" />
                      <Icon className="size-4.5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white/92">{platform.name}</h3>
                        {active ? <Check className="size-3.5 text-emerald-300" aria-label="Connected" /> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-white/38">{accountName || platform.note}</p>
                      <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/52">
                        <span className={cn('size-1.5 rounded-full', statusTone(status))} aria-hidden="true" />
                        {loading ? 'Checking access' : statusCopy(status)}
                        {connection?.lastSynced ? <span className="text-white/28">· {connection.lastSynced}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 md:justify-start">
                    {(connection?.scope?.length ? connection.scope : platform.scopes).map((scope) => (
                      <span key={`${platform.id}-${scope}`} className="text-[11px] text-white/38 before:mr-2 before:text-white/18 before:content-['/']">
                        {scope}
                      </span>
                    ))}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={active ? 'ghost' : 'default'}
                    disabled={loading || isDisconnecting === platform.id}
                    className={cn(
                      'min-h-11 w-full rounded-none px-5 font-medium md:w-auto',
                      active
                        ? 'border border-white/[0.1] bg-transparent text-white/58 hover:border-rose-300/25 hover:bg-rose-300/[0.06] hover:text-rose-100 disabled:border-white/[0.08] disabled:bg-white/[0.025] disabled:text-white/32'
                        : needsReconnect
                          ? 'border border-amber-200/25 bg-amber-100/[0.08] text-amber-100 hover:bg-amber-100/[0.14] disabled:border-white/[0.08] disabled:bg-white/[0.025] disabled:text-white/32'
                          : 'bg-white text-black hover:bg-white/86 disabled:border disabled:border-white/[0.08] disabled:bg-white/[0.025] disabled:text-white/32',
                    )}
                    onClick={() => {
                      if (!active) {
                        onConnect(platform.id)
                        return
                      }
                      setDisconnectTarget(platform)
                    }}
                  >
                    {isDisconnecting === platform.id ? <InlineLoadingAnimation size={15} label={`Disconnecting ${platform.name}`} /> : null}
                    {actionLabel}
                  </Button>
                </article>
              )
            })}
        </div>
      </section>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/32">
        <Link2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Disconnecting revokes Prometheus access without deleting content already published to that platform.
      </p>

      <Dialog open={Boolean(disconnectTarget)} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <DialogContent className="rounded-none border-white/12 bg-[#090909] text-white">
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectTarget?.name}?</DialogTitle>
            <DialogDescription className="text-white/52">
              Prometheus will no longer be able to publish or read analytics for this account. You can reconnect at any time.
            </DialogDescription>
          </DialogHeader>
          {disconnectError ? <div className="border border-rose-300/20 bg-rose-300/[0.06] p-3 text-sm text-rose-100">{disconnectError}</div> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-none border-white/12 bg-transparent text-white hover:bg-white/[0.06]" onClick={() => setDisconnectTarget(null)}>
              Keep connected
            </Button>
            <Button
              type="button"
              className="rounded-none bg-rose-500 text-white hover:bg-rose-500/88"
              disabled={!disconnectTarget || isDisconnecting === disconnectTarget.id}
              onClick={() => void handleDisconnectConfirm()}
            >
              {isDisconnecting === disconnectTarget?.id ? <InlineLoadingAnimation size={16} label={`Disconnecting ${disconnectTarget?.name ?? 'account'}`} /> : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Metric({ compact = false, label, value }: { compact?: boolean; label: string; value: string }) {
  return (
    <div className="p-4 sm:p-5 lg:px-6 lg:py-5">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.17em] text-white/28">{label}</dt>
      <dd className={cn('mt-2 font-medium tracking-[-0.04em] text-white/82', compact ? 'text-lg' : 'text-2xl')}>{value}</dd>
    </div>
  )
}
