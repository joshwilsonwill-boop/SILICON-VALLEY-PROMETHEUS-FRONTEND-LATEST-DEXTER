'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

import { normalizeNextPath } from '@/lib/auth/redirect'
import { BILLING_DASHBOARD_PATH, setBillingAccess, type BillingPlanId } from '@/lib/billing'
import { formatStorage, getStorageLimit, getStorageTierFromPlan } from '@/lib/storage-limits'
import { updateUserStorageTier } from '@/lib/user-storage-tier'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineLoadingAnimation } from '@/components/loading-animation'

type CheckoutSessionStatus = {
  status: string | null
  paymentStatus: string | null
  planId: BillingPlanId | null
  priceId: string | null
  customerEmail: string | null
  subscriptionId: string | null
}

type DodoSubscriptionResponse = {
  status?: string | null
  tier?: string | null
  product_id?: string | null
  dodo_subscription_id?: string | null
  dodo_customer_id?: string | null
  error?: string
} | null

export function BillingSuccessPanel() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const nextPath = normalizeNextPath(searchParams.get('next'), '/')
  const [sessionState, setSessionState] = React.useState<CheckoutSessionStatus | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const hasAppliedStorageTierRef = React.useRef(false)

  React.useEffect(() => {
    if (!sessionId) {
      setSessionState(null)
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/dodo/subscription', {
          cache: 'no-store',
        })

        const data = (await response.json().catch(() => null)) as DodoSubscriptionResponse

        if (!response.ok) {
          throw new Error(data?.error ?? 'Failed to confirm your Dodo subscription.')
        }

        if (cancelled) return

        const tier = data?.tier === 'creator' || data?.tier === 'studio' || data?.tier === 'cinema' ? data.tier : null
        const nextSessionState: CheckoutSessionStatus = {
          status: data?.status ?? null,
          paymentStatus: data?.status === 'active' ? 'paid' : data?.status ?? null,
          planId: tier,
          priceId: data?.product_id ?? null,
          customerEmail: data?.dodo_customer_id ?? null,
          subscriptionId: data?.dodo_subscription_id ?? null,
        }

        setSessionState(nextSessionState)

        if (
          nextSessionState.planId &&
          nextSessionState.status === 'active' &&
          nextSessionState.paymentStatus !== 'unpaid' &&
          !hasAppliedStorageTierRef.current
        ) {
          hasAppliedStorageTierRef.current = true
          setBillingAccess(nextSessionState.planId, 'external')
          const priceId = nextSessionState.priceId ?? nextSessionState.planId
          const mappedTier = getStorageTierFromPlan(priceId)
          const tier = mappedTier === 'free' ? getStorageTierFromPlan(nextSessionState.planId) : mappedTier
          updateUserStorageTier(tier)
          toast.success(`Welcome to ${tier[0].toUpperCase()}${tier.slice(1)}! Storage upgraded to ${formatStorage(getStorageLimit(tier))}.`)
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to confirm your Dodo subscription.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  const isReady =
    sessionState?.planId && sessionState.status === 'active' && sessionState.paymentStatus !== 'unpaid'

  return (
    <div className="px-4 py-5 md:px-6 md:py-6">
      <section className="mx-auto max-w-3xl rounded-[30px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(63,122,255,0.16)_0%,rgba(10,10,16,0)_30%),linear-gradient(180deg,rgba(18,18,23,0.98)_0%,rgba(13,13,16,1)_100%)] p-6 shadow-[0_48px_120px_-64px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)] md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
              {isReady ? (
                <CheckCircle2 className="size-6" />
              ) : (
                <InlineLoadingAnimation size={20} label="Confirming subscription" />
              )}
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-white">
                {isReady ? 'Subscription confirmed' : 'Finishing your billing setup'}
              </div>
              <div className="mt-1 text-sm text-white/52">
                {isReady
                  ? 'Dodo completed the checkout flow and your workspace can continue.'
                  : 'We are checking your Dodo subscription and syncing the current workspace access.'}
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[20px] border border-rose-400/25 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Session status</div>
              <div className="mt-2 text-lg font-semibold text-white">{sessionState?.status ?? 'Checking...'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Payment status</div>
              <div className="mt-2 text-lg font-semibold text-white">{sessionState?.paymentStatus ?? 'Checking...'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">Plan</div>
              <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                <CreditCard className="size-4 text-[#7ebcff]" />
                {sessionState?.planId ?? 'Checking...'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="border-[#2f8eff]/25 bg-[#2f8eff]/10 text-[#cae2ff]">
              {sessionState?.customerEmail ?? 'Waiting for customer details'}
            </Badge>
            {sessionState?.subscriptionId ? <Badge variant="secondary">Subscription saved</Badge> : null}
            {isReady ? (
              <Badge className="border-emerald-400/25 bg-emerald-400/10 text-emerald-100">Workspace unlocked</Badge>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-[14px] bg-white text-black hover:bg-white/90">
              <Link href={isReady ? nextPath : BILLING_DASHBOARD_PATH}>
                {isReady ? 'Continue to workspace' : 'Back to billing'}
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-[14px] border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.06]"
            >
              <Link href={BILLING_DASHBOARD_PATH}>Open billing settings</Link>
            </Button>
          </div>

          <div className="text-sm leading-6 text-white/46">
            This success screen currently mirrors access into local workspace state so you can keep testing the gate.
            The Dodo webhook route persists subscription status in your database and enforces
            billing from the server.
          </div>
        </div>
      </section>
    </div>
  )
}
