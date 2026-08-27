import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { compactHermesMemory, extractSalientSnippets, type HermesMemoryEntry } from '@/lib/hermes/memory'
import { SupabaseHermesMemoryStore } from '@/lib/hermes/supabase-memory'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
    const userTranscript = typeof body?.userTranscript === 'string' ? body.userTranscript.trim() : ''
    const assistantTranscript = typeof body?.assistantTranscript === 'string' ? body.assistantTranscript.trim() : ''
    if (!sessionId || userTranscript.length > 4000 || assistantTranscript.length > 4000) {
      return NextResponse.json({ error: 'Invalid Live memory request.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to save Morty memory.' }, { status: 401 })

    const store = new SupabaseHermesMemoryStore(supabase)
    const snippets = [...extractSalientSnippets(userTranscript), ...extractSalientSnippets(assistantTranscript)]
    const now = new Date().toISOString()
    const entries: HermesMemoryEntry[] = snippets.map((text) => ({
      id: `${user.id}:${sessionId}:${randomUUID()}`,
      userId: user.id,
      sessionId,
      text,
      kind: 'fact',
      createdAt: now,
      lastTouchedAt: now,
    }))
    if (!entries.length) return NextResponse.json({ persisted: false, added: 0 })
    const existing = await store.load(user.id)
    await store.save(user.id, compactHermesMemory([...existing, ...entries]))
    return NextResponse.json({ persisted: true, added: entries.length })
  } catch (error) {
    console.error('[Morty Live] memory route failed:', error)
    return NextResponse.json({ persisted: false, added: 0 })
  }
}
