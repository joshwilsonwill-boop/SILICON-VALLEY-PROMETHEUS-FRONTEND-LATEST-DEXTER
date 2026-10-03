'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase/client'

export function useAccountSummary() {
  const { session, isLoading } = useAuth()
  const userId = session?.user.id
  const [summary, setSummary] = useState<{ plan: string; credits: number | null; loading: boolean; error: string | null }>({ plan: 'Free', credits: null, loading: true, error: null })
  useEffect(() => {
    let disposed = false
    if (isLoading) return
    if (!userId) { setSummary({ plan: 'Free', credits: null, loading: false, error: null }); return }
    const load = async () => {
      const supabase = createClient()
      try {
        const [subscription, credits] = await Promise.all([
          supabase.from('dodo_subscriptions').select('tier,status').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('dodo_credits').select('total_remaining').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (subscription.error) throw subscription.error
        if (credits.error) throw credits.error
        const remaining = credits.data?.total_remaining ?? 0
        if (!Number.isFinite(remaining)) throw new Error('Credit balance unavailable')
        const tier = ['active', 'trialing'].includes(subscription.data?.status ?? '') ? subscription.data?.tier : 'Free'
        if (!disposed) setSummary({ plan: tier || 'Free', credits: remaining ?? null, loading: false, error: null })
      } catch {
        if (!disposed) setSummary({ plan: '', credits: null, loading: false, error: 'Plan and credits could not be loaded.' })
      }
    }
    void load()
    window.addEventListener('prometheus:credits-updated', load)
    return () => { disposed = true; window.removeEventListener('prometheus:credits-updated', load) }
  }, [isLoading, userId])
  return summary
}
