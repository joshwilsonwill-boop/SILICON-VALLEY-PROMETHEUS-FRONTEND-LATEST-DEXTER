'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { BrandWordmark } from '@/components/brand-wordmark'
import { buttonVariants } from '@/components/ui/button'

interface LandingHeaderProps {
  mobileNavControl?: ReactNode
  showBrandName?: boolean
  studioSurface?: boolean
}

export function LandingHeader({ mobileNavControl, studioSurface = false }: LandingHeaderProps = {}) {
  const { session, isLoading } = useAuth()
  return (
    <header className={`prometheus-masthead sticky top-0 z-50 border-b border-white/10 bg-[var(--theme-background)]${studioSurface ? ' studio-masthead--studio' : ''}`}>
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2">{mobileNavControl}<BrandWordmark /></div>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-3 text-sm sm:gap-5">
          <Link href="/pricing" className="py-2 text-white/80 hover:text-white">Pricing</Link>
          <Link href="/docs" className="py-2 text-white/80 hover:text-white">Docs</Link>
          {isLoading ? <span role="status" className="text-white/60">Loading account?</span> : session ? (
            <Link href="/projects" className={buttonVariants({ variant: 'secondary' })}>Projects</Link>
          ) : <>
            <Link href="/login" className="py-2 text-white/80 hover:text-white">Log in</Link>
            <Link href="/signup" className={buttonVariants()}>Get started</Link>
          </>}
        </nav>
      </div>
    </header>
  )
}
