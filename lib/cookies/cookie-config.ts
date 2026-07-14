export const COOKIE_CONSENT_STORAGE_KEY = 'prometheus_cookie_consent'
export const COOKIE_CONSENT_VERSION = '1.0'
export const COOKIE_SETTINGS_EVENT = 'prometheus:open-cookie-settings'

export type CookieCategory = 'essential' | 'analytics' | 'preferences' | 'marketing'

export type CookieConsent = Record<CookieCategory, boolean> & {
  timestamp: string
  version: string
}

export type CookieDefinition = {
  name: string
  provider: string
  purpose: string
  duration: string
  type: 'First-party' | 'Third-party'
}

export const ESSENTIAL_ONLY_CONSENT: CookieConsent = {
  essential: true,
  analytics: false,
  preferences: false,
  marketing: false,
  timestamp: '',
  version: COOKIE_CONSENT_VERSION,
}

export const COOKIE_CATEGORY_DETAILS: Record<CookieCategory, { title: string; description: string }> = {
  essential: {
    title: 'Essential',
    description: 'Required for authentication, security, checkout, and core Platform operation.',
  },
  analytics: {
    title: 'Analytics',
    description: 'Measures product usage, performance, and page activity so we can improve the Platform.',
  },
  preferences: {
    title: 'Preferences',
    description: 'Remembers optional visual and accessibility choices across visits.',
  },
  marketing: {
    title: 'Marketing',
    description: 'Reserved for future advertising measurement and retargeting. It is off unless you opt in.',
  },
}

export const COOKIE_CATALOG: Record<CookieCategory, CookieDefinition[]> = {
  essential: [
    {
      name: 'sb-*-auth-token*; sb-access-token; sb-refresh-token',
      provider: 'Supabase / prometheusstudio.tech',
      purpose: 'Maintains authenticated Supabase sessions and refreshes account access securely.',
      duration: 'Session to persistent, as configured by Supabase',
      type: 'First-party',
    },
    {
      name: 'xano_token',
      provider: 'Prometheus Studio',
      purpose: 'Maintains the application authentication session where the legacy authentication flow is used.',
      duration: '7 days',
      type: 'First-party',
    },
    {
      name: '__vercel_jwt',
      provider: 'Vercel',
      purpose: 'Supports edge routing, deployment protection, and request authentication where enabled.',
      duration: 'Session',
      type: 'First-party',
    },
    {
      name: 'cf_clearance',
      provider: 'Cloudflare',
      purpose: 'Records that a browser passed Cloudflare bot-management or security checks.',
      duration: 'Up to 1 year, provider-configured',
      type: 'Third-party',
    },
    {
      name: '__stripe_sid; __stripe_mid',
      provider: 'Payment service used in Dodo Payments checkout, where applicable',
      purpose: 'Supports payment-session security and fraud prevention when a configured checkout uses these services.',
      duration: 'Session to 1 year, provider-configured',
      type: 'Third-party',
    },
    {
      name: 'Next.js and application session cookies',
      provider: 'Prometheus Studio',
      purpose: 'Supports request integrity, navigation, and application session management.',
      duration: 'Session',
      type: 'First-party',
    },
  ],
  analytics: [
    {
      name: 'ph_*',
      provider: 'PostHog, when configured',
      purpose: 'Stores a distinct visitor or session identifier for product-usage analysis, funnels, and optional session replay.',
      duration: 'Up to 1 year, provider-configured',
      type: 'First-party',
    },
    {
      name: 'va_* or equivalent measurement storage',
      provider: 'Vercel Analytics, when enabled',
      purpose: 'Measures page visits, web vitals, and performance trends for Platform optimization.',
      duration: 'Provider-configured',
      type: 'First-party',
    },
  ],
  preferences: [
    {
      name: 'prometheus.theme.preferences.v1; theme',
      provider: 'Prometheus Studio',
      purpose: 'Stores an optional theme and font preference for the interface.',
      duration: 'Persistent until changed or cleared',
      type: 'First-party',
    },
    {
      name: 'locale',
      provider: 'Prometheus Studio',
      purpose: 'Stores an optional interface language preference when language selection is enabled.',
      duration: 'Persistent until changed or cleared',
      type: 'First-party',
    },
    {
      name: 'reduced-motion preference',
      provider: 'Prometheus Studio',
      purpose: 'Stores an optional accessibility preference that reduces non-essential motion.',
      duration: 'Persistent until changed or cleared',
      type: 'First-party',
    },
  ],
  marketing: [
    {
      name: 'None currently deployed',
      provider: 'Not applicable',
      purpose: 'No marketing or retargeting cookies are currently deployed. Any future marketing pixels require explicit opt-in first.',
      duration: 'Not applicable',
      type: 'Third-party',
    },
  ],
}

export function createConsent(input: Partial<Record<CookieCategory, boolean>>): CookieConsent {
  return {
    essential: true,
    analytics: input.analytics === true,
    preferences: input.preferences === true,
    marketing: input.marketing === true,
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  }
}

export function parseCookieConsent(value: string | null): CookieConsent | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsent>
    if (parsed.version !== COOKIE_CONSENT_VERSION || typeof parsed.timestamp !== 'string') return null

    return {
      essential: true,
      analytics: parsed.analytics === true,
      preferences: parsed.preferences === true,
      marketing: parsed.marketing === true,
      timestamp: parsed.timestamp,
      version: COOKIE_CONSENT_VERSION,
    }
  } catch {
    return null
  }
}

export function hasPreferenceConsent() {
  if (typeof window === 'undefined') return false
  return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY))?.preferences === true
}
