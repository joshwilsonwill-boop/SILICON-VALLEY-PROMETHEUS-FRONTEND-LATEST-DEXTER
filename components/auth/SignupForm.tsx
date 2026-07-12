'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { AtSignIcon, EyeIcon, EyeOffIcon, LockIcon, UserIcon } from 'lucide-react'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useAuthInteraction, type AuthActiveField } from '@/components/auth/auth-interaction'
import { markPendingVerificationEmailSent, writePendingVerificationEmail } from '@/lib/auth/pending-verification'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { normalizeUxError } from '@/lib/ux/errors'

function isValidEmail(email: string) {
  return email.includes('@')
}

function deriveSignupName(name: string, email: string) {
  const trimmedName = name.trim()
  if (trimmedName) return trimmedName
  const emailHandle = email.split('@')[0]?.trim()
  return emailHandle || 'Prometheus User'
}

type SignupFormProps = {
  compact?: boolean
}

export function SignupForm({ compact = false }: SignupFormProps) {
  const searchParams = useSearchParams()
  const { setActiveField, setPasswordSignal } = useAuthInteraction()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const turnstileRef = React.useRef<TurnstileInstance>(null)
  const [serverError, setServerError] = React.useState<string | null>(
    searchParams.get('error') ? normalizeUxError(searchParams.get('error'), 'signup') : null,
  )

  const nextPath = normalizeNextPath(searchParams.get('next'))

  const [errors, setErrors] = React.useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!compact && !name.trim()) next.name = 'Full name is required.'
    if (!email.trim() || !isValidEmail(email)) next.email = 'Enter a valid email.'
    if (!password || password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (confirmPassword !== password) next.confirmPassword = 'Passwords must match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  React.useEffect(() => {
    setPasswordSignal({
      isSubmitting: submitting,
      passwordLength: password.length + confirmPassword.length,
      showPassword,
    })
  }, [confirmPassword.length, password.length, setPasswordSignal, showPassword, submitting])

  React.useEffect(() => {
    return () => {
      setActiveField('idle')
      setPasswordSignal({ isSubmitting: false, passwordLength: 0, showPassword: false })
    }
  }, [setActiveField, setPasswordSignal])

  const focusField = React.useCallback((field: AuthActiveField) => {
    setActiveField(field)
  }, [setActiveField])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setServerError(null)
        if (!validate()) return
        setSubmitting(true)
        window.setTimeout(() => {
          ;(async () => {
            try {
              const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: deriveSignupName(name, email), email, password, next: nextPath, captchaToken }),
              })
              const data = (await res.json()) as {
                user?: unknown
                requiresVerification?: boolean
                error?: string
              }
              if (!res.ok) throw new Error(data.error || 'Signup failed')
              console.log('signup', { email })
              if (data.requiresVerification) {
                writePendingVerificationEmail(email)
                markPendingVerificationEmailSent(email)
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
              const message = normalizeUxError(err, 'signup')
              setServerError(message)
              toast.error('Account setup paused', { description: message })
              turnstileRef.current?.reset()
              setCaptchaToken(null)
            } finally {
              setSubmitting(false)
            }
          })()
        }, 800)
      }}
      className={compact ? 'auth-signup-form-compact space-y-3' : 'space-y-4'}
    >
      {compact ? null : (
      <div>
        <label className="text-sm font-medium text-white/76" htmlFor="signup-name">
          Full name
        </label>
        <div className="mt-2 relative">
          <UserIcon className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-white/34" />
          <Input
            id="signup-name"
            type="text"
            placeholder="Your name"
            className="peer h-11 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 text-white placeholder:text-white/26 focus-visible:ring-white/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => focusField('name')}
            onBlur={() => focusField('idle')}
            autoComplete="name"
          />
        </div>
        {errors.name ? (
          <div className="mt-1 text-xs text-red-500/80">{errors.name}</div>
        ) : null}
      </div>
      )}

      <div>
        <label className="text-sm font-medium text-white/76" htmlFor="signup-email">
          Email
        </label>
        <div className="mt-2 relative">
          <AtSignIcon className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-white/34" />
          <Input
            id="signup-email"
            type="email"
            placeholder="you@domain.com"
            className={compact ? 'peer h-10 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 text-white placeholder:text-white/26 focus-visible:ring-white/20' : 'peer h-11 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 text-white placeholder:text-white/26 focus-visible:ring-white/20'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => focusField('email')}
            onBlur={() => focusField('idle')}
            autoComplete="email"
          />
        </div>
        {errors.email ? (
          <div className="mt-1 text-xs text-red-500/80">{errors.email}</div>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-medium text-white/76" htmlFor="signup-password">
          Password
        </label>
        <div className="mt-2 relative">
          <LockIcon className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-white/34" />
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            className={compact ? 'peer h-10 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 pe-10 text-white placeholder:text-white/26 focus-visible:ring-white/20' : 'peer h-11 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 pe-10 text-white placeholder:text-white/26 focus-visible:ring-white/20'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => focusField('password')}
            onBlur={() => focusField('idle')}
            autoComplete="new-password"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute end-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/36 transition-colors hover:bg-white/[0.06] hover:text-white/72"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        {errors.password ? (
          <div className="mt-1 text-xs text-red-500/80">{errors.password}</div>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-medium text-white/76" htmlFor="signup-confirm">
          Confirm password
        </label>
        <div className="mt-2 relative">
          <LockIcon className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-white/34" />
          <Input
            id="signup-confirm"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repeat your password"
            className={compact ? 'peer h-10 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 pe-10 text-white placeholder:text-white/26 focus-visible:ring-white/20' : 'peer h-11 rounded-[10px] border-white/10 bg-white/[0.025] ps-9 pe-10 text-white placeholder:text-white/26 focus-visible:ring-white/20'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => focusField('confirm')}
            onBlur={() => focusField('idle')}
            autoComplete="new-password"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute end-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-white/36 transition-colors hover:bg-white/[0.06] hover:text-white/72"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        {errors.confirmPassword ? (
          <div className="mt-1 text-xs text-red-500/80">{errors.confirmPassword}</div>
        ) : null}
      </div>

      <div className={compact ? 'h-11 overflow-hidden rounded-[10px]' : undefined}>
        <div className={compact ? 'origin-top-left scale-[0.78]' : undefined}>
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={(token) => setCaptchaToken(token)}
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className={compact ? 'h-10 w-full rounded-[10px]' : 'h-11 w-full rounded-[10px]'}
        disabled={submitting || !captchaToken}
      >
        {submitting ? <InlineLoadingAnimation size={16} label="Creating account" /> : null}
        {submitting ? 'Creating account...' : 'Create account'}
      </Button>

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}

      {compact ? <SocialAuthButtons providers={['google']} /> : null}

      <div className={compact ? 'text-center text-xs text-white/42' : 'text-sm text-white/42'}>
        Already have an account?{' '}
        <Link
          href={nextPath === '/' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-white/82 underline underline-offset-4 hover:text-white"
        >
          Sign in
        </Link>
      </div>
    </form>
  )
}
