'use client'

import * as React from 'react'
import Link from 'next/link'
import { AtSignIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeUxError } from '@/lib/ux/errors'

function isValidEmail(email: string) {
  return email.includes('@')
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState(() => searchParams.get('email') ?? '')
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(
    searchParams.get('error') ? normalizeUxError(searchParams.get('error'), 'password_reset') : null,
  )
  const [success, setSuccess] = React.useState(false)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setSuccess(false)
        setServerError(null)

        if (!email.trim() || !isValidEmail(email)) {
          setServerError('Enter a valid email.')
          return
        }

        setSubmitting(true)

        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })

          const data = (await res.json()) as { error?: string }

          if (!res.ok) {
            throw new Error(data.error || 'Reset password failed')
          }

          setSuccess(true)
          toast.success('Recovery link sent', {
            description: 'Use the newest email from Prometheus to reset your password.',
          })
        } catch (error) {
          const message = normalizeUxError(error, 'password_reset')
          setServerError(message)
          toast.error('Recovery email paused', { description: message })
        } finally {
          setSubmitting(false)
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium" htmlFor="forgot-password-email">
          Email
        </label>
        <div className="mt-2 relative">
          <AtSignIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            id="forgot-password-email"
            type="email"
            placeholder="you@domain.com"
            className="peer ps-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
      </div>

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}
      {success ? (
        <div className="text-xs text-emerald-500/90">
          Recovery link sent. Check your email, then open the link on this device.
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? <InlineLoadingAnimation size={16} label="Sending recovery link" /> : null}
        {submitting ? 'Sending link...' : 'Send recovery link'}
      </Button>

      <div className="text-muted-foreground text-sm">
        Remembered your password?{' '}
        <Link href="/login" className="hover:text-primary underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </form>
  )
}
