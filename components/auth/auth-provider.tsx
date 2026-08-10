'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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

  React.useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    async function initSession() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        if (!mounted) return

        const supabase = createClient()
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
        unsubscribe = () => subscription.unsubscribe()

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

    void initSession()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [router])

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => React.useContext(AuthContext)
