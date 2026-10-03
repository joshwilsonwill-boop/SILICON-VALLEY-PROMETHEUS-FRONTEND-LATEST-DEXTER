const DEFAULT_REDIRECT_LIMIT = 4

function isPublicIpAddress(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false

  const ipv4 = host.split('.').map(Number)
  if (ipv4.length === 4 && ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = ipv4
    return a !== 0 && a !== 10 && a !== 127 && !(a === 169 && b === 254) &&
      !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168) && a < 224
  }

  // IPv6 literals and non-public/reserved IPv6 ranges are not media origins.
  if (host.includes(':')) return false
  return true
}

export function isAllowedMiniRunMediaUrl(value: string, backendBaseUrl: string, extraAllowedHosts = '') {
  let url: URL
  try {
    url = new URL(value, backendBaseUrl)
  } catch {
    return false
  }

  if (url.protocol !== 'https:' || url.username || url.password || !isPublicIpAddress(url.hostname)) return false

  const backendHost = new URL(backendBaseUrl).hostname.toLowerCase()
  const host = url.hostname.toLowerCase()
  const configuredHosts = extraAllowedHosts.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
  const isTrustedMediaHost =
    host === backendHost ||
    host.endsWith('.r2.dev') ||
    host.endsWith('.r2.cloudflarestorage.com') ||
    host.endsWith('.cloudfront.net') ||
    host.endsWith('.amazonaws.com') ||
    configuredHosts.some((allowed) => host === allowed)

  return isTrustedMediaHost
}

export async function fetchMiniRunMedia({
  url,
  backendBaseUrl,
  proxyHeaders,
  range,
  allowedHosts,
  fetchImpl = fetch,
}: {
  url: string
  backendBaseUrl: string
  proxyHeaders: HeadersInit
  range?: string | null
  allowedHosts?: string
  fetchImpl?: typeof fetch
}) {
  let nextUrl = url

  for (let redirects = 0; redirects <= DEFAULT_REDIRECT_LIMIT; redirects += 1) {
    if (!isAllowedMiniRunMediaUrl(nextUrl, backendBaseUrl, allowedHosts)) {
      throw new Error('Mini-Run returned an untrusted media URL.')
    }

    const parsedUrl = new URL(nextUrl, backendBaseUrl)
    const isBackend = parsedUrl.origin === new URL(backendBaseUrl).origin
    const headers = new Headers(isBackend ? proxyHeaders : undefined)
    if (range) headers.set('Range', range)

    const response = await fetchImpl(parsedUrl, {
      headers,
      redirect: 'manual',
      cache: 'no-store',
    })

    if (response.status < 300 || response.status >= 400) return response

    const location = response.headers.get('location')
    if (!location || redirects === DEFAULT_REDIRECT_LIMIT) {
      throw new Error('Mini-Run media redirect could not be completed safely.')
    }
    nextUrl = new URL(location, parsedUrl).toString()
  }

  throw new Error('Mini-Run media redirect limit exceeded.')
}
