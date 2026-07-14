'use client'

import type { ReactNode } from 'react'

import { COOKIE_SETTINGS_EVENT } from '@/lib/cookies/cookie-config'

type CookieSettingsButtonProps = {
  children: ReactNode
  className?: string
}

export function CookieSettingsButton({ children, className }: CookieSettingsButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
    >
      {children}
    </button>
  )
}
