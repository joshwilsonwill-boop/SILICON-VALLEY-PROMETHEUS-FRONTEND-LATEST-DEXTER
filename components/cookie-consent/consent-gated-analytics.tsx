'use client'

import * as React from 'react'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

import { useCookieConsent } from '@/hooks/use-cookie-consent'

export function ConsentGatedAnalytics() {
  const { consent, isHydrated } = useCookieConsent()
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

  React.useEffect(() => {
    if (!isHydrated || consent.analytics) return

    const posthog = (window as Window & {
      posthog?: { opt_out_capturing?: () => void }
    }).posthog
    posthog?.opt_out_capturing?.()
  }, [consent.analytics, isHydrated])

  if (!isHydrated || !consent.analytics) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
      {posthogKey ? (
        <Script
          id="posthog-consented-loader"
          strategy="afterInteractive"
          src={`${posthogHost.replace(/\/$/, '')}/static/array.js`}
          data-api-key={posthogKey}
          onLoad={() => {
            const posthog = (window as Window & {
              posthog?: { init?: (key: string, options: { api_host: string }) => void }
            }).posthog
            posthog?.init?.(posthogKey, { api_host: posthogHost })
          }}
        />
      ) : null}
    </>
  )
}
