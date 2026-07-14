'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'

export type ProfileV2 = {
  id: string
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
  return profile?.display_name?.trim() || profile?.full_name?.trim() || profile?.name?.trim() || 'Account'
}

export function useProfile() {
  const [profile, setProfile] = React.useState<ProfileV2 | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let disposed = false

    async function fetchProfile() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (disposed) return

        if (authError) {
          setError(authError.message)
          setProfile(null)
          return
        }

        if (!user) {
          setProfile(null)
          return
        }

        const { data, error: queryError } = await supabase
          .from('profiles')
          .select(
            'id, full_name, name, display_name, first_name, last_name, email, avatar_url, bio, pronouns, location, theme_preference, font_preference, notification_preferences, storage_quota_bytes',
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
  }, [])

  return {
    profile,
    loading,
    error,
    displayName: getProfileDisplayName(profile),
    themePreference: profile?.theme_preference ?? null,
    fontPreference: profile?.font_preference ?? null,
    notificationPreferences: profile?.notification_preferences ?? null,
  }
}
