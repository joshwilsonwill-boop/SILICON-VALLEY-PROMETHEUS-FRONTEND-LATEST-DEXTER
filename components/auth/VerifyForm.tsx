'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { normalizeUxError } from '@/lib/ux/errors'
import {
  markPendingVerificationEmailSent,
  readPendingVerificationEmail,
  readPendingVerificationLastSentAt,
  writePendingVerificationEmail,
} from '@/lib/auth/pending-verification'
import { normalizeNextPath } from '@/lib/auth/redirect'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_MS = 60_000

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
  const [digits, setDigits] = React.useState<string[]>(() => Array(OTP_LENGTH).fill(''))
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(
    searchParams.get('error') ? normalizeUxError(searchParams.get('error'), 'verification') : null,
  )
  const [cooldownEndsAt, setCooldownEndsAt] = React.useState(0)
  const [now, setNow] = React.useState(() => Date.now())
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([])
  const submittedCodeRef = React.useRef('')

  const code = digits.join('')
  const codeComplete = code.length === OTP_LENGTH
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

  React.useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const verify = React.useCallback(async () => {
    if (submittedCodeRef.current === code) return
    if (!email.trim() || !codeComplete) return

    submittedCodeRef.current = code
    setServerError(null)
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'signup',
      })
      if (error) throw error

      toast.success('Email confirmed', {
        description: 'Setting up your workspace...',
      })
      window.location.assign(nextPath)
    } catch (err) {
      const message = normalizeUxError(err, 'verification')
      setServerError(message)
      toast.error('Verification paused', { description: message })
      setDigits(Array(OTP_LENGTH).fill(''))
      submittedCodeRef.current = ''
      inputRefs.current[0]?.focus()
    } finally {
      setSubmitting(false)
    }
  }, [code, codeComplete, email, nextPath])

  React.useEffect(() => {
    if (codeComplete && code !== submittedCodeRef.current) {
      const timer = window.setTimeout(() => {
        void verify()
      }, 250)
      return () => window.clearTimeout(timer)
    }
  }, [code, codeComplete, verify])

  const handleDigitChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 1)
    const nextDigits = [...digits]
    nextDigits[index] = clean
    setDigits(nextDigits)
    setServerError(null)

    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const nextDigits = [...digits]
      if (digits[index]) {
        nextDigits[index] = ''
        setDigits(nextDigits)
      } else if (index > 0) {
        nextDigits[index - 1] = ''
        setDigits(nextDigits)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return

    e.preventDefault()
    const nextDigits = [...digits]
    let startIndex = nextDigits.findIndex((d) => d === '')
    if (startIndex === -1) startIndex = 0

    for (let i = 0; i < OTP_LENGTH - startIndex && i < pasted.length; i++) {
      nextDigits[startIndex + i] = pasted[i]
    }
    setDigits(nextDigits)
    setServerError(null)

    const focusIndex = Math.min(startIndex + pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  const resend = async () => {
    if (!email.trim()) {
      setServerError('Enter your email so we can send a new code.')
      return
    }

    setServerError(null)
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
      setDigits(Array(OTP_LENGTH).fill(''))
      submittedCodeRef.current = ''
      inputRefs.current[0]?.focus()
      toast.success('New code sent', {
        description: 'Check your inbox for the newest 6-digit code.',
      })
    } catch (err) {
      const message = normalizeUxError(err, 'verification')
      setServerError(message)
      toast.error('Resend paused', { description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        We emailed a 6-digit code to{' '}
        <span className="font-medium text-white/80">{email || 'your email'}</span>. Enter it below to activate your
        account — no link needed.
      </p>

      <div className="flex justify-between gap-2">
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={submitting}
            aria-label={`Verification code digit ${index + 1}`}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="h-12 w-12 rounded-[10px] border-white/10 bg-white/[0.025] text-center text-lg font-semibold text-white placeholder:text-white/26 focus-visible:ring-white/20"
          />
        ))}
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={submitting || !codeComplete || !email.trim()}
        onClick={() => void verify()}
      >
        {submitting ? <InlineLoadingAnimation size={16} label="Confirming code" /> : null}
        {submitting ? 'Confirming...' : 'Verify email'}
      </Button>

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}

      <div className="space-y-2">
        <div className="text-sm font-medium">Didn&apos;t get a code?</div>
        <div className="text-muted-foreground text-sm">
          Check spam and promotions, or resend to a different address below.
          {cooldownActive ? ` Another code will be available in ${formatCooldown(cooldownRemainingMs)}.` : null}
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
            onClick={() => void resend()}
          >
            {submitting ? <InlineLoadingAnimation size={16} label="Sending code" /> : null}
            {submitting ? 'Sending...' : cooldownActive ? `Resend in ${formatCooldown(cooldownRemainingMs)}` : 'Resend code'}
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        Ready to try again?{' '}
        <Link
          href={nextPath === '/' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`}
          className="hover:text-primary underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
