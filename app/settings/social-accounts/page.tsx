'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { ConnectedAccountsPanel } from '@/components/settings/connected-accounts-panel'
import { getProviderMetadata } from '@/lib/oauth/provider-metadata'

function SocialAccountsContent() {
  const searchParams = useSearchParams()
  const connectedProvider = searchParams.get('connected') || searchParams.get('success')
  const errorCode = searchParams.get('error')
  const errorProvider = searchParams.get('provider') || connectedProvider
  const handledRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    const currentKey = `${connectedProvider || ''}:${errorCode || ''}:${errorProvider || ''}`
    if (handledRef.current === currentKey) return
    handledRef.current = currentKey

    if (connectedProvider) {
      const providerName = getProviderMetadata(connectedProvider)?.name ?? connectedProvider
      toast.success(`${providerName} connected successfully`)
    }

    if (errorCode) {
      const providerName = errorProvider ? getProviderMetadata(errorProvider)?.name ?? errorProvider : 'provider'
      toast.error(
        errorCode === 'invalid_state'
          ? 'Failed to connect account due to a security state mismatch. Please try again.'
          : `Failed to connect ${providerName}. Please try again.`,
      )
    }

    if (connectedProvider || errorCode) {
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.delete('connected')
      nextUrl.searchParams.delete('success')
      nextUrl.searchParams.delete('error')
      nextUrl.searchParams.delete('provider')
      nextUrl.searchParams.delete('reason')
      window.history.replaceState({}, '', nextUrl.toString())
    }
  }, [connectedProvider, errorCode, errorProvider])

  const handleConnect = React.useCallback((provider: string) => {
    window.location.href = `/api/oauth/${provider}/initiate`
  }, [])

  return <ConnectedAccountsPanel onConnect={handleConnect} />
}

export default function SocialAccountsPage() {
  return (
    <div className="min-h-screen bg-[#050505] px-6 py-8 text-white md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Connected Accounts</h1>
          <p className="mt-2 text-sm text-white/42">
            Real-time OAuth connection status for every publishing and storage platform.
          </p>
        </div>

        <React.Suspense
          fallback={
            <div className="flex justify-center p-10">
              <InlineLoadingAnimation size={120} label="Loading connected accounts" />
            </div>
          }
        >
          <SocialAccountsContent />
        </React.Suspense>
      </div>
    </div>
  )
}
