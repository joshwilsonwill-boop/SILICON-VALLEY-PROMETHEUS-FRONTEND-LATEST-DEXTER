'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeUxError } from '@/lib/ux/errors'
import {
  markPendingVerificationEmailSent,
  readPendingVerificationEmail,
  readPendingVerificationLastSentAt,
  writePendingVerificationEmail,
} from '@/lib/auth/pending-verification'
import { normalizeNextPath } from '@/lib/auth/redirect'

const RESEND_COOLDOWN_MS = 60_000

function formatVerificationError(message: string | null) {
  if (!message) return null

  const normalized = message.trim().toLowerCase()
  if (normalized.includes('expired') || normalized.includes('invalid')) {
    return 'That confirmation link is no longer valid. Request a fresh email below and use the newest message.'
  }

  return normalizeUxError(message, 'verification')
}

function formatCooldown(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function VerifyForm() {
  const searchParams = useSearchParams()
  const nextPath = normalizeNextPath(searchParams.get('next'))
  const initialEmail = searchParams.get('email') ?? readPendingVerificationEmail()

  const [email, setEmail] = React.useState(initialEmail)
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(formatVerificationError(searchParams.get('error')))
  const [success, setSuccess] = React.useState(false)
  const [now, setNow] = React.useState(() => Date.now())
  const [cooldownEndsAt, setCooldownEndsAt] = React.useState(0)

  const cooldownRemainingMs = Math.max(0, cooldownEndsAt - now)
  const cooldownActive = cooldownRemainingMs > 0

  React.useEffect(() => {
    if (!initialEmail) return
    setEmail((current) => current || initialEmail)
    writePendingVerificationEmail(initialEmail)
  }, [initialEmail])

  React.useEffect(() => {
    const lastSentAt = readPendingVerificationLastSentAt(email)
    setCooldownEndsAt(lastSentAt ? lastSentAt + RESEND_COOLDOWN_MS : 0)
    setNow(Date.now())
  }, [email])

  React.useEffect(() => {
    if (!cooldownActive) return

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [cooldownActive])

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Check your inbox for the confirmation link from Supabase. Once you open it, we will bring you straight back to
        the app.
      </p>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/62">
        Keep this tab open after you click the email link. The callback route already knows where to send you next.
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/88">
        Fresh verification emails can be throttled by Supabase. With the built-in email sender, repeated requests may be
        delayed or limited, so wait at least 60 seconds before resending and use the newest email when it arrives.
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Resend verification</div>
        <div className="text-muted-foreground text-sm">
          If you did not receive an email, resend it.
          {cooldownActive ? ` Another request will be available in ${formatCooldown(cooldownRemainingMs)}.` : null}
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => {
              const nextEmail = e.target.value
              setEmail(nextEmail)
              writePendingVerificationEmail(nextEmail)
            }}
            autoComplete="email"
          />
          <Button
            type="button"
            variant="outline"
            disabled={submitting || !email.trim() || cooldownActive}
            onClick={async () => {
              setServerError(null)
              setSuccess(false)
              setSubmitting(true)
              try {
                const res = await fetch('/api/auth/resend-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, next: nextPath }),
                })
                const data = (await res.json()) as { error?: string }
                if (!res.ok) throw new Error(data.error || 'Resend failed')
                writePendingVerificationEmail(email)
                markPendingVerificationEmailSent(email)
                const nextCooldownEndsAt = Date.now() + RESEND_COOLDOWN_MS
                setCooldownEndsAt(nextCooldownEndsAt)
                setNow(Date.now())
                setSuccess(true)
                toast.success('Verification email requested', {
                  description: 'Use the newest email link when it arrives.',
                })
              } catch (err) {
                const message = normalizeUxError(err, 'verification')
                setServerError(message)
                toast.error('Verification resend paused', { description: message })
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? <InlineLoadingAnimation size={16} label="Sending verification email" /> : null}
            {submitting ? 'Sending...' : cooldownActive ? `Resend in ${formatCooldown(cooldownRemainingMs)}` : 'Resend'}
          </Button>
        </div>
      </div>

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}
      {success ? (
        <div className="text-xs text-emerald-500/90">
          Confirmation email requested. Check spam, promotions, and the newest Supabase message for this address.
        </div>
      ) : null}

      <div className="text-muted-foreground text-sm">
        Ready to try again?{' '}
        <Link href={nextPath === '/' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`} className="hover:text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
