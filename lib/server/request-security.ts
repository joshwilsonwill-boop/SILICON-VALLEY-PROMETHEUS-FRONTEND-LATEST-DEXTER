import { NextResponse, type NextRequest } from 'next/server'

let ratelimit: { limit: (id: string) => Promise<{ success: boolean }> } | null = null

async function getRatelimit() {
  if (ratelimit) return ratelimit
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(120, '60 s'),
      prefix: 'prometheus:rl',
    })
    return ratelimit
  } catch {
    return null
  }
}

export async function enforceRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  try {
    const rl = await getRatelimit()
    if (rl && !(await rl.limit(ip)).success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Policy': 'sliding-window-120-per-60s',
          },
        },
      )
    }
  } catch {
    // Preserve availability if the optional rate limiter fails.
  }
  return null
}

export function createCspNonce() {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

export function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  const developmentScriptSource = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  const cspDirectives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${developmentScriptSource} https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' blob: data: https:`,
    `media-src 'self' blob: https:`,
    `connect-src 'self' https: wss:`,
    `worker-src 'self' blob:`,
    `frame-src 'self' https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return response
}
