'use client'

import * as React from 'react'

import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_SETTINGS_EVENT,
  ESSENTIAL_ONLY_CONSENT,
  createConsent,
  parseCookieConsent,
  type CookieCategory,
  type CookieConsent,
} from '@/lib/cookies/cookie-config'

type CookieConsentContextValue = {
  consent: CookieConsent
  hasResponded: boolean
  isHydrated: boolean
  isPreferencesOpen: boolean
  saveConsent: (input: Partial<Record<CookieCategory, boolean>>) => void
  acceptAll: () => void
  rejectNonEssential: () => void
  openPreferences: () => void
  closePreferences: () => void
}

export const CookieConsentContext = React.createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [storedConsent, setStoredConsent] = React.useState<CookieConsent | null>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = React.useState(false)

  React.useEffect(() => {
    setStoredConsent(parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)))
    setIsHydrated(true)

    const openSettings = () => setIsPreferencesOpen(true)
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings)
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings)
  }, [])

  const saveConsent = React.useCallback((input: Partial<Record<CookieCategory, boolean>>) => {
    const nextConsent = createConsent(input)
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(nextConsent))
    setStoredConsent(nextConsent)
    setIsPreferencesOpen(false)
    window.dispatchEvent(new CustomEvent('prometheus:cookie-consent-updated', { detail: nextConsent }))
  }, [])

  const value = React.useMemo<CookieConsentContextValue>(() => ({
    consent: storedConsent ?? ESSENTIAL_ONLY_CONSENT,
    hasResponded: storedConsent !== null,
    isHydrated,
    isPreferencesOpen,
    saveConsent,
    acceptAll: () => saveConsent({ analytics: true, preferences: true, marketing: true }),
    rejectNonEssential: () => saveConsent({ analytics: false, preferences: false, marketing: false }),
    openPreferences: () => setIsPreferencesOpen(true),
    closePreferences: () => setIsPreferencesOpen(false),
  }), [isHydrated, isPreferencesOpen, saveConsent, storedConsent])

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}
