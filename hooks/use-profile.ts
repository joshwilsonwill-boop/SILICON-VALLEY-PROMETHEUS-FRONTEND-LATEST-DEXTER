'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/auth-provider'

export type ProfileV2 = {
  id: string
  username?: string | null
  full_name?: string | null
  name?: string | null
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  avatar_url?: string | null
  bio?: string | null
  pronouns?: string | null
  location?: string | null
  theme_preference?: string | null
  font_preference?: string | null
  notification_preferences?: Record<string, unknown> | null
  storage_quota_bytes?: number | null
  [key: string]: unknown
}

export function getProfileDisplayName(profile: ProfileV2 | null | undefined) {
  return profile?.display_name?.trim() || profile?.username?.trim() || profile?.full_name?.trim() || profile?.name?.trim() || 'Account'
}

export function useProfile() {
  const { session, isLoading: isAuthLoading } = useAuth()
  const userId = session?.user.id
  const userEmail = session?.user.email
  const [profile, setProfile] = React.useState<ProfileV2 | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let disposed = false
    const user = session?.user

    if (isAuthLoading) return

    if (!user) {
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }

    async function fetchProfile() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        const { data, error: queryError } = await supabase
          .from('profiles')
          .select(
            'id, username, full_name, name, display_name, first_name, last_name, email, avatar_url, bio, pronouns, location, theme_preference, font_preference, notification_preferences, storage_quota_bytes',
          )
          .eq('id', user.id)
          .maybeSingle()

        if (disposed) return

        if (queryError) {
          setError(queryError.message)
          setProfile(null)
          return
        }

        setProfile(((data ?? { id: user.id, email: user.email ?? null }) as ProfileV2) ?? null)
      } catch (caught) {
        if (!disposed) setError(caught instanceof Error ? caught.message : 'Unable to load profile.')
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    void fetchProfile()

    return () => {
      disposed = true
    }
  }, [isAuthLoading, userEmail, userId])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const user = session?.user
      if (!user) {
        setProfile(null)
        return
      }

      const { data, error: queryError } = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, name, display_name, first_name, last_name, email, avatar_url, bio, pronouns, location, theme_preference, font_preference, notification_preferences, storage_quota_bytes',
        )
        .eq('id', user.id)
        .maybeSingle()

      if (queryError) throw new Error(queryError.message)
      setProfile(((data ?? { id: user.id, email: user.email ?? null }) as ProfileV2) ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load profile.')
    } finally {
      setLoading(false)
    }
  }, [userEmail, userId])

  const updateProfile = React.useCallback(async (path: string, init: RequestInit) => {
    const response = await fetch(path, init)
    const payload = (await response.json().catch(() => null)) as { error?: string; profile?: ProfileV2 } | null
    if (!response.ok) throw new Error(payload?.error || 'Unable to update profile.')
    await refresh()
    return payload?.profile ?? null
  }, [refresh])

  const updateUsername = React.useCallback(
    (username: string) => updateProfile('/api/profile/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }),
    [updateProfile],
  )

  const updateDisplayName = React.useCallback(
    (display_name: string) => updateProfile('/api/profile/display-name', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name }),
    }),
    [updateProfile],
  )

  const updateAvatar = React.useCallback(
    (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return updateProfile('/api/profile/avatar', { method: 'POST', body: formData })
    },
    [updateProfile],
  )

  return {
    profile,
    loading,
    error,
    displayName: getProfileDisplayName(profile),
    themePreference: profile?.theme_preference ?? null,
    fontPreference: profile?.font_preference ?? null,
    notificationPreferences: profile?.notification_preferences ?? null,
    refresh,
    updateUsername,
    updateDisplayName,
    updateAvatar,
  }
}
