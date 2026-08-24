import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export type ServerProfile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  email: string | null
}

function metadataValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function usernameBaseFromEmail(email: string | null | undefined, userId: string): string {
  const cleaned = (email ?? '').split('@')[0]?.toLowerCase().replace(/[^a-z0-9_.-]/g, '') ?? ''
  if (cleaned) return cleaned
  return `user_${userId.replace(/-/g, '').slice(0, 8) || 'x'}`
}

async function resolveUniqueUsername(supabase: SupabaseClient, base: string): Promise<string> {
  let candidate = base
  let attempt = 1
  while (attempt < 100) {
    const { data: clash } = await supabase.from('profiles').select('id').eq('username', candidate).maybeSingle()
    if (!clash) return candidate
    candidate = `${base}_${attempt}`
    attempt += 1
  }
  return candidate
}

/**
 * Idempotent profile bootstrap. Runs with the signed-in user's session, so
 * RLS must allow `insert ... with check (auth.uid() = id)` on public.profiles.
 * Never throws: a rejected insert is logged (with its Postgres code) and the
 * caller treats the profile as missing rather than failing the whole request.
 */
export async function ensureProfile(supabase: SupabaseClient): Promise<ServerProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('[profile-bootstrap] select failed', {
      userId: user.id,
      code: selectError.code ?? null,
      message: selectError.message,
      details: selectError.details ?? null,
      hint: selectError.hint ?? null,
    })
    return null
  }

  if (existing) return existing as ServerProfile

  const metadata = user.user_metadata ?? {}
  const fallbackName = metadataValue(metadata, 'full_name')
    ?? metadataValue(metadata, 'display_name')
    ?? metadataValue(metadata, 'username')
    ?? user.email?.split('@')[0]
    ?? 'user'
  const username = await resolveUniqueUsername(supabase, usernameBaseFromEmail(user.email, user.id))

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        username,
        display_name: fallbackName,
        avatar_url: metadataValue(metadata, 'avatar_url') ?? metadataValue(metadata, 'picture'),
      },
      { onConflict: 'id' },
    )
    .select('id, username, display_name, avatar_url, email')
    .single()

  if (createError) {
    // code 42501 = row-level security rejection: the anon/session role cannot
    // insert into profiles. Fix lives in the Supabase SQL policy, not here.
    console.error('[profile-bootstrap] insert rejected', {
      userId: user.id,
      code: createError.code ?? null,
      message: createError.message,
      details: createError.details ?? null,
      hint: createError.hint ?? null,
    })
    return null
  }

  return created as ServerProfile
}

export async function getProfile(): Promise<ServerProfile | null> {
  const supabase = await createClient()
  return ensureProfile(supabase)
}
