function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function isSupabaseConfigured() {
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || cleanEnvValue(process.env.SUPABASE_URL)
  const publishableKey =
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnvValue(process.env.SUPABASE_ANON_KEY) ||
    cleanEnvValue(process.env.JWT)

  return Boolean(url && publishableKey)
}

export function getSupabaseConfig() {
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || cleanEnvValue(process.env.SUPABASE_URL)
  const publishableKey =
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnvValue(process.env.SUPABASE_ANON_KEY) ||
    cleanEnvValue(process.env.JWT)

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.',
    )
  }

  return { url, publishableKey }
}
