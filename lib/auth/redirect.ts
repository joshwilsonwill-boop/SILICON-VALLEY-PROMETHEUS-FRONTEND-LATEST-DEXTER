const DEFAULT_NEXT_PATH = '/'

/**
 * Ensures a "next" path is a safe relative URL within the same application.
 */
export function normalizeNextPath(rawPath: string | null | undefined, fallback = DEFAULT_NEXT_PATH) {
  if (!rawPath) return fallback
  if (!rawPath.startsWith('/') || rawPath.startsWith('//')) return fallback

  try {
    const url = new URL(rawPath, 'http://localhost')

    if (url.origin !== 'http://localhost') return fallback

    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}

/**
 * Returns the auth origin for the application that started sign-in.
 * Exact preview hosts are supplied by the build config, so preview callbacks
 * retain their own session cookie instead of landing on the production app.
 * All other hosts continue to use the configured canonical site URL.
 */
export function getSiteOrigin(input?: Request | URL | string) {
  let currentOrigin: string | undefined
  if (typeof window !== 'undefined') {
    currentOrigin = window.location.origin
  } else if (input) {
    try {
      const url = input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(input)
      currentOrigin = url.origin
    } catch {
      // Ignore invalid request URLs.
    }
  }

  if (currentOrigin) {
    try {
      const previewOrigins: unknown = JSON.parse(process.env.NEXT_PUBLIC_AUTH_PREVIEW_ORIGINS || '[]')
      if (Array.isArray(previewOrigins) && previewOrigins.includes(currentOrigin)) {
        const url = new URL(currentOrigin)
        if (url.protocol === 'https:' && /^[a-z\d-]+\.vercel\.app$/i.test(url.hostname) && !url.port) {
          return url.origin
        }
      }
    } catch {
      // An absent or malformed preview configuration preserves canonical behavior.
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) {
    try {
      return new URL(envUrl).origin
    } catch {
      // ignore invalid env URL
    }
  }

  return currentOrigin || 'http://localhost:3000'
}

/**
 * Builds a reliable /auth/confirm URL for Supabase redirects.
 */
export function buildAuthConfirmUrl(input: Request | URL | string, nextPath?: string) {
  const origin = getSiteOrigin(input)
  const url = new URL('/auth/confirm', origin)
  const next = normalizeNextPath(nextPath)

  if (next !== DEFAULT_NEXT_PATH) {
    url.searchParams.set('next', next)
  }

  return url
}
