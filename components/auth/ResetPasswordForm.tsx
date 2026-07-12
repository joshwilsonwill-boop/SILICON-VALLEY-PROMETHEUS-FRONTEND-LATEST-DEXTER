'use client'

import * as React from 'react'
import Link from 'next/link'
import { LockIcon } from 'lucide-react'
import { toast } from 'sonner'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { normalizeUxError } from '@/lib/ux/errors'

export function ResetPasswordForm() {
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        setServerError(null)
        setSuccess(false)

        if (!password || password.length < 8) {
          setServerError('Password must be at least 8 characters.')
          return
        }

        if (confirmPassword !== password) {
          setServerError('Passwords must match.')
          return
        }

        setSubmitting(true)

        try {
          const supabase = createClient()
          const { error } = await supabase.auth.updateUser({ password })

          if (error) {
            throw error
          }

          setSuccess(true)
          toast.success('Password updated', {
            description: 'Returning you to the workspace.',
          })
          window.setTimeout(() => {
            window.location.assign('/')
          }, 700)
        } catch (error) {
          const message = normalizeUxError(error, 'password_reset')
          setServerError(message)
          toast.error('Password update paused', { description: message })
        } finally {
          setSubmitting(false)
        }
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium" htmlFor="reset-password">
          New password
        </label>
        <div className="mt-2 relative">
          <LockIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            id="reset-password"
            type="password"
            placeholder="Create a new password"
            className="peer ps-9"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="reset-password-confirm">
          Confirm new password
        </label>
        <div className="mt-2 relative">
          <LockIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            id="reset-password-confirm"
            type="password"
            placeholder="Repeat your new password"
            className="peer ps-9"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}
      {success ? <div className="text-xs text-emerald-500/90">Password updated. Redirecting...</div> : null}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? <InlineLoadingAnimation size={16} label="Saving new password" /> : null}
        {submitting ? 'Saving...' : 'Update password'}
      </Button>

      <div className="text-muted-foreground text-sm">
        Need to start over?{' '}
        <Link href="/forgot-password" className="hover:text-primary underline underline-offset-4">
          Request another link
        </Link>
      </div>
    </form>
  )
}
