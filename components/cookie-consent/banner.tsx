'use client'

import Link from 'next/link'
import { Cookie, Settings2 } from 'lucide-react'

import { CookiePreferencesPanel } from '@/components/cookie-consent/preferences-panel'
import { Button } from '@/components/ui/button'
import { useCookieConsent } from '@/hooks/use-cookie-consent'

export function CookieConsentBanner() {
  const {
    consent,
    hasResponded,
    isHydrated,
    isPreferencesOpen,
    acceptAll,
    rejectNonEssential,
    saveConsent,
    openPreferences,
    closePreferences,
  } = useCookieConsent()

  return (
    <>
      {isHydrated && !hasResponded ? (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/15 bg-[#1a1a2e] p-4 shadow-[0_-18px_60px_-30px_rgba(0,0,0,0.9)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(34rem,calc(100vw-2.5rem))] sm:rounded-lg sm:border"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06]">
              <Cookie className="size-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">Your privacy choices</h2>
              <p className="mt-1 text-sm leading-6 text-white/68">
                We use essential technologies to run Prometheus Studio. With your permission, we also use analytics and preference technologies to improve your experience.
              </p>
              <Link href="/cookie-policy" className="mt-2 inline-flex text-sm font-medium text-white underline underline-offset-4 hover:text-white/75">
                Read our Cookie Policy
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              className="min-h-11 bg-white text-black hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/30"
              onClick={acceptAll}
            >
              Accept All
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
              onClick={rejectNonEssential}
            >
              Reject Non-Essential
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/30"
              onClick={openPreferences}
            >
              <Settings2 className="size-4" aria-hidden="true" />
              Customize
            </Button>
          </div>
          <button
            type="button"
            className="mt-3 text-left text-xs text-white/55 underline underline-offset-4 hover:text-white"
            onClick={openPreferences}
          >
            Do Not Sell or Share My Personal Information
          </button>
        </section>
      ) : null}

      <CookiePreferencesPanel
        open={isPreferencesOpen}
        currentPreferences={consent}
        onOpenChange={(open) => (open ? openPreferences() : closePreferences())}
        onSave={saveConsent}
        onAcceptAll={acceptAll}
        onRejectNonEssential={rejectNonEssential}
      />
    </>
  )
}
