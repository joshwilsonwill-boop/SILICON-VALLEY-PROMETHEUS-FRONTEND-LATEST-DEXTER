'use client'

import * as React from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'
import { motion, AnimatePresence } from 'framer-motion'

import type { BillingPlanId } from '@/lib/billing'
import { cn } from '@/lib/utils'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'

type PaddleCheckoutButtonProps = {
  planId: BillingPlanId
  nextPath?: string | null
  ctaLabel: string
  className?: string
  paddleToken?: string
  paddleEnv?: 'sandbox' | 'production'
}

export function PaddleCheckoutButton({ 
  planId, 
  nextPath, 
  ctaLabel, 
  className,
  paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  paddleEnv = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as any) || 'sandbox'
}: PaddleCheckoutButtonProps) {
  // --- DEBUG LOGGING ---
  console.log('--- Paddle Button Render ---')
  console.log('Plan:', planId)
  console.log('Token Exists:', !!paddleToken)
  console.log('Env:', paddleEnv)
  // ---------------------

  const [isLoading, setIsLoading] = React.useState(false)
  const [paddle, setPaddle] = React.useState<Paddle>()
  const [isInitializing, setIsInitializing] = React.useState(true)

  React.useEffect(() => {
    if (!paddleToken) {
      console.error('CRITICAL: Paddle Token is missing in the browser console. Did you restart the server?')
      setIsInitializing(false)
      return
    }

    setIsInitializing(true)
    console.log(`Paddle: Initializing library for ${paddleEnv}...`)
    
    initializePaddle({ 
      environment: paddleEnv, 
      token: paddleToken,
      checkout: {
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'en',
        }
      },
      eventCallback: (event) => {
        if (event.name === 'checkout.closed') {
          setIsLoading(false)
        }
      }
    }).then((paddleInstance) => {
      if (paddleInstance) {
        console.log('Paddle: Connection successful.')
        setPaddle(paddleInstance)
      }
      setIsInitializing(false)
    }).catch((err) => {
      console.error('Paddle: Connection failed:', err)
      setIsInitializing(false)
    })
  }, [paddleToken, paddleEnv])

  const isDisabled = isLoading || isInitializing || (!paddle && !!paddleToken)

  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.01 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className="w-full"
    >
      <Button
        size="lg"
        disabled={isDisabled}
        className={cn(
          'relative h-12 w-full overflow-hidden rounded-[18px] text-[15px] font-semibold tracking-tight text-white transition-all duration-300',
          !isDisabled 
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]'
            : 'bg-white/5 text-white/20 border-white/5 shadow-none opacity-50',
          'border border-white/10',
          !isDisabled && 'hover:border-white/25 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_100%)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)]',
          className
        )}
        onClick={async () => {
          if (!paddleToken) {
            toast.error('Paddle Client Token not found. Please check your .env.local and restart the server.')
            return
          }
          if (!paddle) {
            toast.error('Paddle is still connecting. Please wait a moment.')
            return
          }
          
          try {
            console.log(`PaddleCheckoutButton: Clicked for plan ${planId}`)
            setIsLoading(true)

            // Auto-revert the button after 5 seconds to prevent it getting stuck
            const resetTimeout = setTimeout(() => {
              setIsLoading(false)
            }, 5000)

            console.log('PaddleCheckoutButton: Fetching transaction ID from /api/billing/checkout...')
            const response = await fetch('/api/billing/checkout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                planId,
                nextPath,
              }),
            })

            const data = (await response.json().catch(() => null)) as { error?: string; transactionId?: string; customerEmail?: string } | null
            console.log('PaddleCheckoutButton: Backend response:', data)

            if (!response.ok || !data?.transactionId) {
              clearTimeout(resetTimeout) // Clear if we got an immediate error
              const errMsg = data?.error ?? 'Unable to start Paddle checkout.'
              console.error('PaddleCheckoutButton: Backend error:', errMsg)
              throw new Error(errMsg)
            }

            if (!paddle) {
              clearTimeout(resetTimeout)
              console.error('PaddleCheckoutButton: Paddle instance is missing at time of click.')
              throw new Error('Paddle is not initialized yet.')
            }

            console.log('PaddleCheckoutButton: Opening Paddle overlay with transactionId:', data.transactionId)
            paddle.Checkout.open({
              transactionId: data.transactionId,
              settings: {
                displayMode: 'overlay',
                successUrl: `${window.location.origin}/settings/billing/success?session_id=${data.transactionId}${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''}`,
              },
              customer: data.customerEmail ? { email: data.customerEmail } : undefined
            })
            
          } catch (error) {
            console.error('PaddleCheckoutButton: Catch block triggered:', error)
            toast.error(error instanceof Error ? error.message : 'Unable to start Paddle checkout.')
            setIsLoading(false)
          }
        }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-inherit">
           <motion.div 
             animate={{ 
               translateX: ['-100%', '100%'],
             }}
             transition={{ 
               duration: 3, 
               repeat: Infinity, 
               ease: "linear",
               delay: 1
             }}
             className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] skew-x-[-20deg]"
           />
        </div>

        <div className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <InlineLoadingAnimation size={16} label="Opening Paddle checkout" />
              <span>Opening Checkout...</span>
            </>
          ) : (
            <>
              {isInitializing ? (
                <InlineLoadingAnimation size={12} label="Connecting to Paddle" />
              ) : null}
              <span>{ctaLabel}</span>
              {!isInitializing && (
                <motion.div
                  initial={{ x: 0, y: 0 }}
                  whileHover={{ x: 2, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <ArrowUpRight className="size-4" />
                </motion.div>
              )}
            </>
          )}
        </div>
      </Button>
    </motion.div>
  )
}
