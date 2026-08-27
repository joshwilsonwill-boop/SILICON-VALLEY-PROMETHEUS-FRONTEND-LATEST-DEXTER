import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createMortyLiveSessionContext, buildMortyLiveTokenRequest } from '@/lib/hermes/live-context'
import { SupabaseHermesMemoryStore } from '@/lib/hermes/supabase-memory'
import { getValidAccessToken } from '@/lib/oauth/refresh'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Live voice is not configured.' }, { status: 500 })

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to start a live Morty conversation.' }, { status: 401 })

    const sessionId = randomUUID()
    const context = await createMortyLiveSessionContext({
      userId: user.id,
      sessionId,
      memoryStore: new SupabaseHermesMemoryStore(supabase),
      getDriveToken: () => getValidAccessToken(user.id, 'google_drive'),
    })
    const gemini = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildMortyLiveTokenRequest({ instructions: context.instructions })),
      cache: 'no-store',
    })
    const payload = await gemini.json().catch(() => null) as { name?: unknown; expireTime?: unknown } | null
    if (!gemini.ok || !payload || typeof payload.name !== 'string' || !payload.name) {
      console.error('[Morty Live] token provisioning failed:', gemini.status)
      return NextResponse.json({ error: 'Morty could not start a live session.' }, { status: 502 })
    }

    return NextResponse.json({
      token: payload.name,
      expiresAt: typeof payload.expireTime === 'string' ? payload.expireTime : null,
      sessionId,
    })
  } catch (error) {
    console.error('[Morty Live] token route failed:', error)
    return NextResponse.json({ error: 'Morty could not start a live session.' }, { status: 500 })
  }
}
