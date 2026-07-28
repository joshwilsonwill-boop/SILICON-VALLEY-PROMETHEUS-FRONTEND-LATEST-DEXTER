'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { LiquidChromeButton } from '@/components/ui/liquid-chrome-button'

interface LandingHeaderProps {
  mobileNavControl?: ReactNode
  showBrandName?: boolean
}

export function LandingHeader({ mobileNavControl, showBrandName = true }: LandingHeaderProps = {}) {
  const router = useRouter()
  const { session, isLoading } = useAuth()
  const isAuthenticated = !!session

  return (
    <header className="fixed top-0 z-30 w-full border-b border-white/[0.05] bg-black/10 backdrop-blur-md md:z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-2">
          {mobileNavControl ? <div className="md:hidden">{mobileNavControl}</div> : null}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image
              src="/branding/prometheus-logo-no-bg.png"
              alt="Prometheus"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
            {showBrandName ? (
              <span className="text-sm font-bold uppercase tracking-[0.3em] text-white">
                rometheus
              </span>
            ) : null}
          </Link>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {isLoading ? null : !isAuthenticated ? (
            <>
              <Link
                href="/login"
                className="text-xs font-medium uppercase tracking-widest text-gray-400 transition-colors hover:text-white"
              >
                Login
              </Link>
              <LiquidChromeButton
                variant="secondary"
                size="sm"
                liquid
                magnetic
                ripple
                className="h-8 rounded-full px-4 text-[10px] uppercase tracking-widest"
                onClick={() => router.push('/signup')}
              >
                Get Started
              </LiquidChromeButton>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-4 md:hidden">
          {isLoading ? null : isAuthenticated ? null : (
            <Link href="/login" className="text-xs font-medium uppercase tracking-widest text-white">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
