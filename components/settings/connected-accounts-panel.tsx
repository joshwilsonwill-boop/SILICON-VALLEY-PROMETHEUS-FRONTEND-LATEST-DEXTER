'use client'

import * as React from 'react'
import {
  AlertCircle,
  Cloud,
  Facebook,
  HardDrive,
  Instagram,
  Link2,
  Linkedin,
  Music2,
  Twitter,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { InlineLoadingAnimation } from '@/components/loading-animation'
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

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', scopes: ['Upload videos', 'Manage playlists'] },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#000000', scopes: ['Post videos', 'Analytics'] },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', scopes: ['Post reels', 'Stories'] },
  { id: 'x', name: 'X', icon: Twitter, color: '#000000', scopes: ['Post tweets', 'Media upload'] },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', scopes: ['Post to page', 'Groups'] },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', scopes: ['Share articles', 'Company posts'] },
  { id: 'google_drive', name: 'Google Drive', icon: HardDrive, color: '#4285F4', scopes: ['Export to Drive', 'Read files'] },
  { id: 'dropbox', name: 'Dropbox', icon: Cloud, color: '#0061FF', scopes: ['Export to Dropbox', 'Read files'] },
] as const

type ConnectedAccountsPanelProps = {
  onConnect: (provider: string) => void
}

function statusDotClass(status: ConnectionStatus) {
  switch (status) {
    case 'active':
      return 'bg-emerald-400 animate-pulse'
    case 'expiring_soon':
      return 'bg-amber-400 animate-pulse'
    case 'expired':
      return 'bg-red-400'
    default:
      return 'bg-white/20'
  }
}

function statusCopy(status: ConnectionStatus) {
  switch (status) {
    case 'active':
      return 'Connected'
    case 'expiring_soon':
      return 'Needs re-auth soon'
    case 'expired':
      return 'Expired'
    default:
      return 'Not connected'
  }
}

export function ConnectedAccountsPanel({ onConnect }: ConnectedAccountsPanelProps) {
  const { connections, loading, error, refresh, getStatus } = useConnectionStatus()
  const { disconnect, isDisconnecting } = useDisconnectPlatform()
  const [disconnectTarget, setDisconnectTarget] = React.useState<(typeof PLATFORMS)[number] | null>(null)
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null)
  const hasConnections = connections.length > 0

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
      {error ? (
        <GlassCard className="mb-4 border-rose-300/20 bg-rose-300/[0.08] p-4 text-sm text-rose-100" hoverable={false}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Connected account status unavailable.</p>
                <p className="mt-1 text-rose-100/78">{error}</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        </GlassCard>
      ) : null}

      {!loading && !hasConnections ? (
        <GlassCard className="mb-6 p-8 text-center" hoverable={false} staggerChildren>
          <Link2 className="mx-auto h-16 w-16 text-white/20" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-white">No accounts connected</h2>
          <p className="mt-2 text-sm text-white/52">
            Connect your social platforms to export directly from Prometheus.
          </p>
          <Button type="button" className="mt-5 bg-white text-black hover:bg-white/90" onClick={() => onConnect(PLATFORMS[0].id)}>
            Connect your first account
          </Button>
        </GlassCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {loading
          ? (
              <div className="flex min-h-64 items-center justify-center md:col-span-2">
                <InlineLoadingAnimation size={120} label="Loading connected accounts" />
              </div>
            )
          : PLATFORMS.map((platform) => {
              const Icon = platform.icon
              const connection = connections.find((entry) => entry.provider === platform.id)
              const { status, accountName } = getStatus(platform.id)
              const isConnected = status === 'active'
              const actionLabel = status === 'disconnected' ? 'Connect' : status === 'active' ? 'Disconnect' : 'Reconnect'

              return (
                <GlassCard
                  as="article"
                  key={platform.id}
                  className="p-4"
                  staggerChildren
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]',
                          !isConnected && 'grayscale opacity-40',
                        )}
                      >
                        <Icon className="h-5 w-5" style={{ color: platform.color }} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', statusDotClass(status))} />
                          <h3 className="text-base font-semibold text-white">{platform.name}</h3>
                        </div>
                        <p className="mt-1 text-sm text-white/68">{accountName || statusCopy(status)}</p>
                        <p className="mt-1 text-xs text-white/42">
                          {connection?.lastSynced ? `Synced ${connection.lastSynced}` : 'No sync recorded yet'}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={status === 'disconnected' ? 'default' : 'outline'}
                      className={
                        status === 'disconnected'
                          ? 'min-h-12 bg-white text-black hover:bg-white/90'
                          : status === 'active'
                            ? 'min-h-12 border-white/10 bg-transparent text-white/72 hover:border-rose-300/30 hover:bg-rose-300/[0.08] hover:text-rose-100'
                            : 'min-h-12 border-amber-300/20 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.12]'
                      }
                      onClick={() => {
                        if (status === 'disconnected' || status === 'expired' || status === 'expiring_soon') {
                          onConnect(platform.id)
                          return
                        }
                        setDisconnectTarget(platform)
                      }}
                    >
                      {actionLabel}
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(connection?.scope?.length ? connection.scope : platform.scopes).map((scope) => (
                      <span key={`${platform.id}-${scope}`} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">
                        {scope}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              )
            })}
      </div>

      <Dialog open={Boolean(disconnectTarget)} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <DialogContent className="border-white/10 bg-[#050505] text-white">
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectTarget?.name}?</DialogTitle>
            <DialogDescription className="text-white/58">
              This will revoke Prometheus&apos;s access to your {disconnectTarget?.name} account. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>

          {disconnectError ? (
            <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.08] p-3 text-sm text-rose-100">
              {disconnectError}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setDisconnectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-500 text-white hover:bg-rose-500/90"
              disabled={!disconnectTarget || isDisconnecting === disconnectTarget.id}
              onClick={() => void handleDisconnectConfirm()}
            >
              {isDisconnecting === disconnectTarget?.id ? (
                <InlineLoadingAnimation
                  size={16}
                  label={`Disconnecting ${disconnectTarget?.name ?? 'account'}`}
                />
              ) : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
