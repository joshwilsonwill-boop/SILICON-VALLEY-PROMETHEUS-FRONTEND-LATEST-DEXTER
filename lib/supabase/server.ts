import 'server-only'

import { createServerClient } from '@supabase/ssr'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { getSupabaseConfig } from '@/lib/supabase/config'
import { getDevSession } from '@/lib/supabase/dev-bypass'

function withDevSession(client: SupabaseClient): SupabaseClient {
  const devSession = getDevSession()
  if (!devSession) return client

  const session = devSession as unknown as Session
  const user = devSession.user as unknown as User
  const auth = new Proxy(client.auth, {
    get(target, property, receiver) {
      if (property === 'getSession' || property === 'refreshSession') {
        return async () => ({ data: { session }, error: null })
      }

      if (property === 'getUser') {
        return async () => ({ data: { user }, error: null })
      }

      return Reflect.get(target, property, receiver)
    },
  })

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'auth') return auth
      return Reflect.get(target, property, receiver)
    },
  })
}

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabaseConfig()

  const client = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server components cannot write cookies. Proxy handles refreshes.
        }
      },
    },
  })

  return withDevSession(client)
}
