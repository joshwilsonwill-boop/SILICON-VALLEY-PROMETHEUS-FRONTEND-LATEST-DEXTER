/**
 * Oracle API configuration and URL resolution.
 * Contract:
 * Base URL from VITE_API_BASE_URL (fallback NEXT_PUBLIC_API_BASE_URL, default http://localhost:8000)
 */

export function getOracleApiBaseUrl(): string {
  const envUrl =
    (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000'

  return envUrl.trim().replace(/\/+$/, '')
}

export function resolveOracleUrl(pathOrUrl: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl
  }

  const base = (baseUrl || getOracleApiBaseUrl()).replace(/\/+$/, '')
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}
