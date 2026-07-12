'use client'

import * as React from 'react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { SocialPostingStaging, type SocialPostingPlatformV2 } from '@/components/editor/staging/social-posting-staging'
import { useUserConnections } from '@/hooks/use-user-connections'
import { cn } from '@/lib/utils'

export interface SocialPostingPanelV2Props {
  platforms?: SocialPostingPlatformV2[]
  onConnect?: (platformId: string) => void
  className?: string
}

const DEFAULT_SOCIAL_PLATFORMS: SocialPostingPlatformV2[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
  {
    id: 'facebook',
    label: 'Facebook',
    reviewPending: true,
    docsHref: 'https://developers.facebook.com/docs/app-review/',
  },
]

export function SocialPostingPanelV2({ platforms = DEFAULT_SOCIAL_PLATFORMS, onConnect, className }: SocialPostingPanelV2Props) {
  const { connections, loading, error, empty } = useUserConnections()

  return (
    <section className={cn('space-y-3', className)} aria-label="Social publishing status">
      {loading ? (
        <div className="flex min-h-24 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <InlineLoadingAnimation size={48} label="Loading connected accounts" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm leading-6 text-rose-100">
          Connected account status unavailable: {error}
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/58">
          Connect your social accounts to publish directly.
        </div>
      ) : null}

      <SocialPostingStaging platforms={platforms} connections={connections} onConnect={onConnect} />
    </section>
  )
}
