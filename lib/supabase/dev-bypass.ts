/**
 * Development-only auth bypass for local UI audits.
 * Never enable DEV_AUTH_BYPASS outside a local development environment.
 */
export interface DevSession {
  user: {
    id: string
    email: string
    user_metadata?: Record<string, unknown>
  }
  access_token: string
  refresh_token: string
  expires_at: number
}

export const DEV_AUTH_BYPASS_COOKIE = 'prometheus-dev-auth-bypass'

function hasDevBypassCookie() {
  if (typeof document === 'undefined') return false

  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim() === `${DEV_AUTH_BYPASS_COOKIE}=1`)
}

export function isDevBypassActive(): boolean {
  if (process.env.NODE_ENV !== 'development') return false

  if (typeof window === 'undefined') {
    return process.env.DEV_AUTH_BYPASS === 'true'
  }

  return hasDevBypassCookie()
}

export function getDevSession(): DevSession | null {
  if (!isDevBypassActive()) return null

  const now = Math.floor(Date.now() / 1000)
  return {
    user: {
      id: 'dev-audit-user-001',
      email: 'audit@prometheus.local',
      user_metadata: {
        full_name: 'Audit User',
        avatar_url: null,
      },
    },
    access_token: 'dev-access-token-audit-001',
    refresh_token: 'dev-refresh-token-audit-001',
    expires_at: now + 86400,
  }
}
