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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:min-h-16 sm:flex-nowrap sm:px-8 sm:py-3">
        <div className="flex min-h-10 shrink-0 items-center gap-2">{mobileNavControl}<BrandWordmark /></div>
        <nav aria-label="Main navigation" className="flex w-full items-center justify-between gap-2 border-t border-white/[0.07] pt-2 text-[13px] sm:w-auto sm:justify-end sm:gap-5 sm:border-0 sm:pt-0 sm:text-sm">
          <Link href="/pricing" className="py-2 text-white/80 hover:text-white">Pricing</Link>
          <Link href="/docs" className="py-2 text-white/80 hover:text-white">Docs</Link>
          {isLoading ? <span role="status" aria-label="Loading account" className="h-8 w-20 animate-pulse rounded-full bg-white/10" /> : session ? (
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
