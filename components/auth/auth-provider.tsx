'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export const AuthContext = React.createContext<{
  session: Session | null
  isLoading: boolean
}>({
  session: null,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  // Keep one browser client for the provider lifetime. Recreating it on every
  // session update re-subscribed and re-ran session initialization work.
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    let mounted = true

    async function initSession() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.log('[AUTH_AUDIT] getSession error:', error.message)
          // Try refresh fallback
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && refreshedSession) {
            if (mounted) setSession(refreshedSession)
          }
        } else if (!initialSession) {
          // Fallback to refresh once if null
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
          if (mounted && refreshedSession) setSession(refreshedSession)
        } else {
          if (mounted) setSession(initialSession)
        }
      } catch (err) {
        console.log('[AUTH_AUDIT] unexpected session init error:', err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('[AUTH_AUDIT]', event, currentSession?.user?.id)

      if (mounted) {
        setSession(currentSession)
        
        if (event === 'SIGNED_IN') {
          router.refresh()
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
          router.refresh()
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => React.useContext(AuthContext)
