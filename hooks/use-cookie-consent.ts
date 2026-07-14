'use client'

import * as React from 'react'

import { CookieConsentContext } from '@/components/cookie-consent/consent-context'

export function useCookieConsent() {
  const context = React.useContext(CookieConsentContext)

  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider.')
  }

  return context
}
