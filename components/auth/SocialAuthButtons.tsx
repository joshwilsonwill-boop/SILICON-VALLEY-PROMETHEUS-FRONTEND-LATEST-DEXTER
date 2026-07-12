'use client'

import * as React from 'react'
import { GithubIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { getSiteOrigin, normalizeNextPath } from '@/lib/auth/redirect'
import { createClient } from '@/lib/supabase/client'
import { normalizeUxError } from '@/lib/ux/errors'
import { toast } from 'sonner'

import { GoogleIcon, AppleIcon } from './auth-visuals'

type SocialProvider = 'google' | 'apple' | 'github'

const SOCIAL_OPTIONS: Array<{
  provider: SocialProvider
  label: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  { provider: 'google', label: 'Continue with Google', Icon: GoogleIcon },
  { provider: 'apple', label: 'Continue with Apple', Icon: AppleIcon },
  { provider: 'github', label: 'Continue with GitHub', Icon: GithubIcon },
]

const SUPABASE_CLIENT_READY = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
)

type SocialAuthButtonsProps = {
  providers?: SocialProvider[]
}

export function SocialAuthButtons({ providers }: SocialAuthButtonsProps) {
  const searchParams = useSearchParams()
  const [busyProvider, setBusyProvider] = React.useState<SocialProvider | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [slowProvider, setSlowProvider] = React.useState<SocialProvider | null>(null)

  const nextPath = normalizeNextPath(searchParams.get('next'))
  const enabledProviders = React.useMemo(
    () => SOCIAL_OPTIONS.filter(({ provider }) => !providers || providers.includes(provider)),
    [providers],
  )

  React.useEffect(() => {
    const resetBusyState = () => {
      setBusyProvider(null)
    }

    // Browsers can restore this page from bfcache after an OAuth redirect attempt.
    window.addEventListener('pageshow', resetBusyState)

    return () => {
      window.removeEventListener('pageshow', resetBusyState)
    }
  }, [])

  const handleOAuth = React.useCallback(
    async (provider: SocialProvider) => {
      if (!SUPABASE_CLIENT_READY) {
        const message = 'Secure sign-in is temporarily unavailable. Use email sign-in while we reconnect identity providers.'
        setServerError(message)
        toast.error('Identity provider unavailable', { description: message })
        return
      }

      setBusyProvider(provider)
      setSlowProvider(null)
      setServerError(null)
      const slowTimer = window.setTimeout(() => {
        setSlowProvider(provider)
        toast.info('Still waiting on the provider', {
          description: 'Keep this tab open while the secure identity handoff completes.',
        })
      }, 3000)

      try {
        const supabase = createClient()
        const origin = getSiteOrigin()
        const redirectTo = new URL('/auth/confirm', origin)

        if (nextPath !== '/') {
          redirectTo.searchParams.set('next', nextPath)
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectTo.toString(),
            queryParams: provider === 'google' ? {
              prompt: 'select_account',
            } : undefined,
          },
        })

        if (error) {
          throw error
        }
      } catch (error) {
        const message = normalizeUxError(error, 'oauth')
        setServerError(message)
        toast.error('Identity handoff paused', { description: message })
        setBusyProvider(null)
        setSlowProvider(null)
      } finally {
        window.clearTimeout(slowTimer)
      }
    },
    [nextPath],
  )

  return (
    <div className="space-y-2">
      {enabledProviders.map(({ provider, label, Icon }) => (
        <Button
          key={provider}
          type="button"
          size="lg"
          className="w-full"
          disabled={busyProvider !== null}
          onClick={() => {
            if (provider === 'google') console.log("google clicked")
            console.log('oauth clicked', { provider })
            void handleOAuth(provider)
          }}
        >
          <Icon className="size-4 me-2" />
          {busyProvider === provider ? (
            <InlineLoadingAnimation
              size={16}
              label={slowProvider === provider ? `Still connecting to ${provider}` : `Redirecting to ${provider}`}
            />
          ) : null}
          {busyProvider === provider ? (slowProvider === provider ? 'Still connecting...' : 'Redirecting...') : label}
        </Button>
      ))}

      {serverError ? <div className="text-xs text-red-500/80">{serverError}</div> : null}
    </div>
  )
}
