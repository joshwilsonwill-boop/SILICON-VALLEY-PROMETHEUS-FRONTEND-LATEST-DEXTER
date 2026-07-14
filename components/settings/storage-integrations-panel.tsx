'use client'

import * as React from 'react'
import { AlertCircle, Cloud, HardDrive } from 'lucide-react'
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
import { getProviderMetadata } from '@/lib/oauth/provider-metadata'
import { cn } from '@/lib/utils'

const STORAGE_INTEGRATIONS = [
  { id: 'google_drive', name: 'Google Drive', icon: HardDrive, color: '#4285F4', description: 'Import source media and export completed edits.' },
  { id: 'dropbox', name: 'Dropbox', icon: Cloud, color: '#0061FF', description: 'Import source media and export completed edits.' },
] as const

type StorageIntegration = (typeof STORAGE_INTEGRATIONS)[number]

function statusDotClass(status: ConnectionStatus) {
  switch (status) {
    case 'active':
      return 'bg-emerald-400'
    case 'expiring_soon':
      return 'bg-amber-400'
    case 'expired':
      return 'bg-rose-400'
    default:
      return 'bg-white/35'
  }
}

function statusCopy(status: ConnectionStatus) {
  switch (status) {
    case 'active':
      return 'Connected'
    case 'expiring_soon':
      return 'Reconnect soon'
    case 'expired':
      return 'Reconnect required'
    default:
      return 'Not connected'
  }
}

export function StorageIntegrationsPanel() {
  const { connections, loading, error, refresh, getStatus } = useConnectionStatus()
  const { disconnect, isDisconnecting } = useDisconnectPlatform()
  const [disconnectTarget, setDisconnectTarget] = React.useState<StorageIntegration | null>(null)
  const [disconnectError, setDisconnectError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const provider = params.get('connected') || params.get('provider')
    const error = params.get('error')

    if (!provider || !STORAGE_INTEGRATIONS.some((integration) => integration.id === provider)) return

    const providerName = getProviderMetadata(provider)?.name ?? provider
    if (error) toast.error(`Unable to connect ${providerName}. Please try again.`)
    else if (params.get('connected')) toast.success(`${providerName} connected successfully`)

    params.delete('connected')
    params.delete('success')
    params.delete('error')
    params.delete('provider')
    params.delete('reason')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [])

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
        <div className="flex items-start justify-between gap-3 rounded-lg border border-rose-300/20 bg-rose-300/[0.08] p-3 text-sm text-rose-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Storage connection status is unavailable.</span>
          </div>
          <Button
            type="button"
            size="sm"
            className="border border-white/20 bg-white/10 font-medium text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {STORAGE_INTEGRATIONS.map((integration) => {
        const Icon = integration.icon
        const connection = connections.find((entry) => entry.provider === integration.id)
        const { status, accountName } = getStatus(integration.id)
        const isConnected = status === 'active'
        const actionLabel = status === 'disconnected' ? 'Connect' : status === 'active' ? 'Disconnect' : 'Reconnect'
        const actionClassName =
          status === 'disconnected'
            ? 'min-h-11 w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-auto'
            : status === 'active'
              ? 'min-h-11 w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-medium rounded-lg px-4 py-2 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-auto'
              : 'min-h-11 w-full border border-amber-300/40 bg-amber-300/15 px-4 py-2 font-medium text-amber-100 hover:bg-amber-300/25 focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-auto'

        return (
          <div key={integration.id} className="flex flex-col items-stretch gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]', !isConnected && 'opacity-70')}>
                <Icon className="size-4" style={{ color: integration.color }} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', statusDotClass(status))} aria-hidden="true" />
                  <div className="text-sm font-medium text-white/85">{integration.name}</div>
                </div>
                <div className="mt-1 truncate text-xs text-white/52">{accountName || statusCopy(status)}</div>
                <div className="mt-1 truncate text-xs text-white/42">
                  {connection?.lastSynced ? `Synced ${connection.lastSynced}` : integration.description}
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className={actionClassName}
              aria-label={`${actionLabel} ${integration.name}`}
              disabled={loading || isDisconnecting === integration.id}
              onClick={() => {
                if (status === 'active') {
                  setDisconnectTarget(integration)
                  return
                }
                window.location.assign(`/api/oauth/${integration.id}/initiate`)
              }}
            >
              {isDisconnecting === integration.id ? <InlineLoadingAnimation size={16} label={`Disconnecting ${integration.name}`} /> : null}
              {actionLabel}
            </Button>
          </div>
        )
      })}

      <Dialog open={Boolean(disconnectTarget)} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <DialogContent className="border-white/10 bg-[#050505] text-white">
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectTarget?.name}?</DialogTitle>
            <DialogDescription className="text-white/58">
              This will revoke Prometheus&apos;s access to {disconnectTarget?.name}. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>
          {disconnectError ? <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] p-3 text-sm text-rose-100">{disconnectError}</div> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setDisconnectTarget(null)}>
              Cancel
            </Button>
            <Button type="button" className="bg-rose-500 text-white hover:bg-rose-500/90" disabled={!disconnectTarget || isDisconnecting === disconnectTarget.id} onClick={() => void handleDisconnectConfirm()}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
