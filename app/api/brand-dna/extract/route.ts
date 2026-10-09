import 'server-only'

import { NextResponse } from 'next/server'

import { analyzeBrandEvidence } from '@/lib/brand-dna/analyze-site'
import { inspectPublicBrandSite, normalizeWebsiteUrl } from '@/lib/brand-dna/site-source'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > 4_096) {
    return NextResponse.json({ error: 'The website address is too long.' }, { status: 413 })
  }

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Sign in to analyze a brand website.' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Sign in to analyze a brand website.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Enter a website address to analyze.' }, { status: 400 })
  }
  const rawWebsite = body && typeof body === 'object' && 'url' in body && typeof body.url === 'string' ? body.url : ''
  if (rawWebsite.length > 2_000) return NextResponse.json({ error: 'The website address is too long.' }, { status: 413 })
  const website = rawWebsite.trim()
  if (!website) return NextResponse.json({ error: 'Enter a website address to analyze.' }, { status: 400 })

  try {
    const normalizedUrl = normalizeWebsiteUrl(website)
    const evidence = await inspectPublicBrandSite(normalizedUrl.href)
    const profile = await analyzeBrandEvidence(evidence)
    return NextResponse.json({ profile })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('not configured on this server')) {
      return NextResponse.json({ error: 'Brand analysis is temporarily unavailable. Ask your workspace admin to configure the AI provider.' }, { status: 503 })
    }
    if (
      message.startsWith('Enter a valid website') ||
      message.startsWith('Only public HTTP') ||
      message.startsWith('Website addresses') ||
      message.startsWith('Use a website') ||
      message.startsWith('Enter a publicly') ||
      message.startsWith('That address')
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (message.startsWith('We could not find') || message.startsWith('The website') || message.startsWith('A linked stylesheet') || message.startsWith('That address did not')) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    console.error('[api/brand-dna/extract] analysis failed')
    return NextResponse.json({ error: 'We could not build a brand profile from that site. Check the address and try again.' }, { status: 502 })
  }
}
