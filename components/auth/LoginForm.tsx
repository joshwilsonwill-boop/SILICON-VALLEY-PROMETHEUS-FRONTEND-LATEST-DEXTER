'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AtSignIcon, LockIcon } from 'lucide-react'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { writePendingVerificationEmail } from '@/lib/auth/pending-verification'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { normalizeUxError } from '@/lib/ux/errors'

function isValidEmail(email: string) {
  return email.includes('@')
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(
    searchParams.get('error') ? normalizeUxError(searchParams.get('error'), 'login') : null,
  )

  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({})
  const nextPath = normalizeNextPath(searchParams.get('next'))

  const validate = () => {
    const next: typeof errors = {}
    if (!email.trim() || !isValidEmail(email)) next.email = 'Enter a valid email.'
    if (!password || password.length < 8) next.password = 'Password must be at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <form
      onSubmit={async (e) => {
        console.log("email submit")
        console.log('auth form submitted', { email })
        e.preventDefault()
        setServerError(null)
        if (!validate()) return
        setSubmitting(true)
        window.setTimeout(async () => {
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, next: nextPath }),
            })
            const data = (await res.json()) as { user?: unknown; requiresVerification?: boolean; error?: string }
            if (!res.ok) {
              if (data.requiresVerification) {
                writePendingVerificationEmail(email)
                const verifyUrl = new URL('/verify', window.location.origin)
                verifyUrl.searchParams.set('email', email)
                if (nextPath !== '/') {
                  verifyUrl.searchParams.set('next', nextPath)
                }
                window.location.assign(verifyUrl.toString())
                return
              }

              throw new Error(data.error || 'Login failed')
            }
            console.log('login', { email })
            if (data.requiresVerification) {
              writePendingVerificationEmail(email)
              const verifyUrl = new URL('/verify', window.location.origin)
              verifyUrl.searchParams.set('email', email)
              if (nextPath !== '/') {
                verifyUrl.searchParams.set('next', nextPath)
              }
              window.location.assign(verifyUrl.toString())
              return
            }

            window.location.assign(nextPath)
          } catch (err) {
            const message = normalizeUxError(err, 'login')
            setServerError(message)
            toast.error('Sign in paused', { description: message })
          } finally {
            setSubmitting(false)
          }
        }, 800)
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium" htmlFor="login-email">
          Email
        </label>
        <div className="mt-2 relative">
          <AtSignIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            id="login-email"
            type="email"
            placeholder="you@domain.com"
            className="peer ps-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        {errors.email ? (
          <div className="mt-1 text-xs text-red-500/80">{errors.email}</div>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="login-password">
          Password
        </label>
        <div className="mt-2 relative">
          <LockIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            id="login-password"
            type="password"
            placeholder="Your password"
            className="peer ps-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {errors.password ? (
          <div className="mt-1 text-xs text-red-500/80">{errors.password}</div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <div />
        <Link
          href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'}
          className="text-muted-foreground text-sm hover:text-primary underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? <InlineLoadingAnimation size={16} label="Signing in" /> : null}
        {submitting ? 'Signing in...' : 'Sign in'}
      </Button>

      <div className="text-muted-foreground text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href={nextPath === '/' ? '/signup' : `/signup?next=${encodeURIComponent(nextPath)}`}
          className="hover:text-primary underline underline-offset-4"
        >
          Sign up
        </Link>
      </div>
    </form>
  )
}
