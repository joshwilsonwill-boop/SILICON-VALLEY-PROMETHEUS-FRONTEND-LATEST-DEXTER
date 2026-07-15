import 'server-only'

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

export async function getProfile(): Promise<ServerProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch profile:', error)
    return null
  }

  if (data) return data as ServerProfile

  const metadata = user.user_metadata ?? {}
  const fallbackName = metadataValue(metadata, 'display_name')
    ?? metadataValue(metadata, 'username')
    ?? user.email?.split('@')[0]
    ?? 'user'
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        username: fallbackName,
        display_name: fallbackName,
        avatar_url: metadataValue(metadata, 'avatar_url') ?? metadataValue(metadata, 'picture'),
      },
      { onConflict: 'id' },
    )
    .select('id, username, display_name, avatar_url, email')
    .single()

  if (createError) {
    console.error('Failed to create profile:', createError)
    return null
  }

  return created as ServerProfile
}
