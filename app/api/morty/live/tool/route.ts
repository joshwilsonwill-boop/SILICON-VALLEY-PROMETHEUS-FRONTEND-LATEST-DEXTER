import { NextRequest, NextResponse } from 'next/server'

import { HERMES_TOOL_DEFINITIONS, createHermesToolExecutor, toHermesToolCallResult } from '@/lib/hermes/tools'
import { SupabaseHermesMemoryStore } from '@/lib/hermes/supabase-memory'
import { getValidAccessToken } from '@/lib/oauth/refresh'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function miniRunEnv() {
  return {
    MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
    MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
    MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const callId = typeof body?.callId === 'string' ? body.callId.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const args = body?.args && typeof body.args === 'object' && !Array.isArray(body.args) ? body.args as Record<string, unknown> : null
    if (!callId || !sessionId || !args || !HERMES_TOOL_DEFINITIONS.some((tool) => tool.name === name)) {
      return NextResponse.json({ error: 'Invalid Live tool call.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in to use Morty tools.' }, { status: 401 })

    const value = await createHermesToolExecutor({
      userId: user.id,
      sessionId,
      memoryStore: new SupabaseHermesMemoryStore(supabase),
      getDriveToken: () => getValidAccessToken(user.id, 'google_drive'),
      miniRunEnv: miniRunEnv(),
    })(name, args)
    const result = toHermesToolCallResult(name, value)
    return NextResponse.json({ callId, response: value ?? {}, summary: result.summary })
  } catch (error) {
    console.error('[Morty Live] tool route failed:', error)
    return NextResponse.json({ error: 'Morty could not complete that tool.' }, { status: 500 })
  }
}
