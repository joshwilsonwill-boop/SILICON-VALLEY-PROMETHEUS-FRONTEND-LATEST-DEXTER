'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js'

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

      if (property === 'onAuthStateChange') {
        return (callback: (event: AuthChangeEvent, nextSession: Session | null) => void) => {
          queueMicrotask(() => callback('INITIAL_SESSION', session))

          return {
            data: {
              subscription: {
                unsubscribe() {},
              },
            },
          }
        }
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

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig()

  return withDevSession(createBrowserClient(url, publishableKey))
}
