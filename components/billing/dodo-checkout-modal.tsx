'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react'
import { DodoPayments, type CheckoutEvent } from 'dodopayments-checkout'
import { toast } from 'sonner'

import type { BillingPlanId } from '@/lib/billing'
import { cn } from '@/lib/utils'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  isOpen: boolean
  onClose: () => void
  productId: string
  tier: BillingPlanId
  price: number
  priceDisplay: string
  nextPath?: string | null
  onSuccess?: () => void
}

type CheckoutState = 'summary' | 'loading' | 'ready' | 'success' | 'error'

function getDodoCheckoutMode(): 'test' | 'live' {
  return process.env.NEXT_PUBLIC_DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live' : 'test'
}

function getCheckoutStatus(event: CheckoutEvent) {
  const data = event.data ?? {}
  const status = typeof data.status === 'string' ? data.status : null
  const paymentIntent = typeof data.paymentIntent === 'object' && data.paymentIntent
    ? data.paymentIntent as Record<string, unknown>
    : null
  const intentStatus = typeof paymentIntent?.status === 'string' ? paymentIntent.status : null
  return status ?? intentStatus
}

export function DodoCheckoutModal({
  isOpen,
  onClose,
  productId,
  tier,
  price,
  priceDisplay,
  nextPath,
  onSuccess,
}: Props) {
  const [savePaymentMethod, setSavePaymentMethod] = React.useState(true)
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = React.useState(false)
  const [state, setState] = React.useState<CheckoutState>('summary')
  const [error, setError] = React.useState<string | null>(null)
  const checkoutElementId = React.useId().replace(/:/g, '')
  const mountedElementId = `dodo-checkout-${checkoutElementId}`

  React.useEffect(() => {
    if (!isOpen) {
      setState('summary')
      setError(null)
      setSavePaymentMethod(true)
      setHasAcceptedPolicies(false)
      try {
        DodoPayments.Checkout.close()
      } catch {
        // Dodo's singleton may not be mounted yet.
      }
    }
  }, [isOpen])

  const handleCheckoutEvent = React.useCallback((event: CheckoutEvent) => {
    if (event.event_type === 'checkout.error') {
      const message = typeof event.data?.message === 'string'
        ? event.data.message
        : 'Dodo checkout failed. Please retry.'
      setError(message)
      setState('error')
      return
    }

    const status = getCheckoutStatus(event)
    if (status === 'succeeded' || status === 'paid' || status === 'complete' || status === 'completed') {
      setState('success')
      toast.success('Subscription payment completed.')
      onSuccess?.()
      window.setTimeout(onClose, 1200)
    }
  }, [onClose, onSuccess])

  const startCheckout = React.useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          tier,
          save_payment_method: savePaymentMethod,
          nextPath,
        }),
      })

      const data = (await response.json().catch(() => null)) as {
        checkout_url?: string | null
        error?: string
      } | null

      if (!response.ok || !data?.checkout_url) {
        throw new Error(data?.error ?? 'Unable to create Dodo checkout session.')
      }

      DodoPayments.Initialize({
        mode: getDodoCheckoutMode(),
        displayType: 'inline',
        linkType: 'session',
        onEvent: handleCheckoutEvent,
      })

      DodoPayments.Checkout.open({
        checkoutUrl: data.checkout_url,
        elementId: mountedElementId,
        options: {
          showSecurityBadge: true,
          payButtonText: `Pay ${priceDisplay}/month`,
          themeConfig: {
            radius: '24px',
            dark: {
              bgPrimary: '#0f0f1a',
              bgSecondary: '#0a0a12',
              buttonPrimary: '#FFFFFF',
              buttonPrimaryHover: '#E5E7EB',
              buttonTextPrimary: '#09090B',
              textPrimary: '#FFFFFF',
              textSecondary: 'rgba(255,255,255,0.62)',
              borderPrimary: 'rgba(255,255,255,0.10)',
            },
          },
        },
      })

      setState('ready')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to start Dodo checkout.')
      setState('error')
    }
  }, [handleCheckoutEvent, mountedElementId, nextPath, priceDisplay, productId, savePaymentMethod, tier])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose()
    }}>
      <DialogContent
        overlayClassName="bg-black/60 backdrop-blur-[32px] saturate-[1.4]"
        className="bottom-0 top-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg translate-y-0 rounded-b-none rounded-t-3xl border-white/[0.08] bg-[#0f0f1a]/80 p-0 shadow-2xl shadow-black/50 backdrop-blur-[40px] sm:bottom-auto sm:top-1/2 sm:w-[min(100%-3rem,32rem)] sm:-translate-y-1/2 sm:rounded-3xl"
      >
        <div className="pointer-events-none absolute inset-0 rounded-t-3xl bg-[linear-gradient(145deg,rgba(255,255,255,0.08),transparent_34%)] sm:rounded-3xl" />
        <DialogHeader className="relative px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
            <ShieldCheck className="size-3.5" />
            Dodo Secure Checkout
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-normal text-white">
            Subscribe to {tier[0].toUpperCase()}{tier.slice(1)}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-white/50">
            Secure monthly billing, saved payment method enabled by default, and immediate credit allocation after webhook confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-4 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">Plan summary</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {tier[0].toUpperCase()}{tier.slice(1)} Plan
                </div>
                <div className="mt-1 text-sm text-white/42">Monthly subscription</div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-4xl font-bold text-white">{priceDisplay}</div>
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">per month</div>
                <div className="sr-only">Price in cents: {price}</div>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={savePaymentMethod}
              disabled={state === 'loading' || state === 'ready' || state === 'success'}
              onChange={(event) => setSavePaymentMethod(event.target.checked)}
              className="size-4 rounded-md border-white/10 bg-white/[0.05] accent-white"
            />
            <span>Save card for future payments</span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/70">
            <input
              type="checkbox"
              checked={hasAcceptedPolicies}
              disabled={state === 'loading' || state === 'ready' || state === 'success'}
              onChange={(event) => setHasAcceptedPolicies(event.target.checked)}
              className="mt-1 size-4 shrink-0 rounded-md border-white/10 bg-white/[0.05] accent-white"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Terms of Service
              </Link>
              {', '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Privacy Policy
              </Link>
              {', and '}
              <Link href="/refund" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Refund Policy
              </Link>
              . Dodo Payments will present its own buyer terms before payment.
            </span>
          </label>

          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <XCircle className="mt-0.5 size-4 shrink-0 text-red-300" />
              <span>{error}</span>
            </div>
          ) : null}

          {state === 'success' ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-4 text-emerald-100">
              <CheckCircle2 className="size-5 animate-in zoom-in-50" />
              <span className="text-sm font-semibold">Payment completed. Refreshing billing state...</span>
            </div>
          ) : null}

          <div
            id={mountedElementId}
            className={cn(
              'min-h-[480px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25 transition-opacity',
              state === 'ready' || state === 'success' ? 'opacity-100' : 'pointer-events-none h-0 min-h-0 opacity-0',
            )}
          />

          {state !== 'ready' && state !== 'success' ? (
            <Button
              onClick={startCheckout}
              disabled={state === 'loading' || !hasAcceptedPolicies}
              className="min-h-12 w-full rounded-2xl bg-white text-sm font-semibold tracking-wide text-black shadow-lg shadow-white/5 transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 active:scale-[0.98] disabled:scale-100 disabled:opacity-50"
            >
              {state === 'loading' ? (
                <>
                  <InlineLoadingAnimation size={16} label="Preparing checkout" />
                  Preparing Checkout...
                </>
              ) : (
                hasAcceptedPolicies ? `Continue to Dodo Checkout` : 'Accept policies to continue'
              )}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
