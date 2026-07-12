'use client'

import * as React from 'react'
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
  const [state, setState] = React.useState<CheckoutState>('summary')
  const [error, setError] = React.useState<string | null>(null)
  const checkoutElementId = React.useId().replace(/:/g, '')
  const mountedElementId = `dodo-checkout-${checkoutElementId}`

  React.useEffect(() => {
    if (!isOpen) {
      setState('summary')
      setError(null)
      setSavePaymentMethod(true)
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
            radius: '16px',
            dark: {
              bgPrimary: '#1a1a2e',
              bgSecondary: '#10101a',
              buttonPrimary: '#38BDF8',
              buttonPrimaryHover: '#0EA5E9',
              buttonTextPrimary: '#020617',
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
      <DialogContent className="max-h-[92vh] w-[min(96vw,760px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a2e]/90 p-0 text-white shadow-[0_40px_140px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_36%)]" />
        <DialogHeader className="relative px-6 pt-6">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
            <ShieldCheck className="size-3.5" />
            Dodo Secure Checkout
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Subscribe to {tier[0].toUpperCase()}{tier.slice(1)}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Secure monthly billing, saved payment method enabled by default, and immediate credit allocation after webhook confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-5 px-6 pb-6 pt-5">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Plan summary</div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {tier[0].toUpperCase()}{tier.slice(1)} Plan
                </div>
                <div className="mt-1 text-sm text-white/42">Monthly subscription</div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-3xl font-bold text-white">{priceDisplay}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/30">per month</div>
                <div className="sr-only">Price in cents: {price}</div>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={savePaymentMethod}
              disabled={state === 'loading' || state === 'ready' || state === 'success'}
              onChange={(event) => setSavePaymentMethod(event.target.checked)}
              className="size-4 rounded border-white/20 bg-white/10 accent-[#38BDF8]"
            />
            <span>Save card for future payments</span>
          </label>

          {error ? (
            <div className="flex items-start gap-3 rounded-[18px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <XCircle className="mt-0.5 size-4 shrink-0 text-red-300" />
              <span>{error}</span>
            </div>
          ) : null}

          {state === 'success' ? (
            <div className="flex items-center gap-3 rounded-[20px] border border-emerald-400/25 bg-emerald-400/10 px-4 py-4 text-emerald-100">
              <CheckCircle2 className="size-5 animate-in zoom-in-50" />
              <span className="text-sm font-semibold">Payment completed. Refreshing billing state...</span>
            </div>
          ) : null}

          <div
            id={mountedElementId}
            className={cn(
              'min-h-[480px] overflow-hidden rounded-[22px] border border-white/10 bg-[#10101a]/80 transition-opacity',
              state === 'ready' || state === 'success' ? 'opacity-100' : 'pointer-events-none h-0 min-h-0 opacity-0',
            )}
          />

          {state !== 'ready' && state !== 'success' ? (
            <Button
              onClick={startCheckout}
              disabled={state === 'loading'}
              className="h-12 w-full rounded-[18px] bg-[#38BDF8] text-sm font-black uppercase tracking-[0.14em] text-slate-950 hover:bg-sky-300"
            >
              {state === 'loading' ? (
                <>
                  <InlineLoadingAnimation size={16} label="Preparing checkout" />
                  Preparing Checkout...
                </>
              ) : (
                `Pay ${priceDisplay}/month`
              )}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
