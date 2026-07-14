'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { BackButton } from '@/components/navigation/BackButton'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  title: string
  description?: string
  showBackButton?: boolean
  backHref?: string
}

export function PageHeader({ title, description, actions, className, showBackButton = false, backHref = '/studio' }: PageHeaderProps) {
  const pathname = usePathname()
  const shouldShowBackButton = showBackButton && pathname !== '/'

  return (
    <header
      className={cn(
        'flex items-center justify-between gap-6 border-b border-white/8 bg-[linear-gradient(180deg,rgba(10,12,18,0.88)_0%,rgba(8,10,14,0.72)_100%)] px-4 py-4 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-8 sm:py-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {shouldShowBackButton ? <BackButton fallbackHref={backHref} /> : null}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-white/96 md:text-3xl">
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm leading-6 text-white/58">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
