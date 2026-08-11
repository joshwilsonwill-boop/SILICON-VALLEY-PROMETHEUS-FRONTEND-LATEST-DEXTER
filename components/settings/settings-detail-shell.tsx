'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  CreditCard,
  KeyRound,
  LayoutGrid,
  Link2,
  Settings2,
  UserRound,
} from 'lucide-react'

import { PrometheusShell } from '@/components/prometheus-shell'
import { cn } from '@/lib/utils'

type SettingsDetailShellProps = {
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  description: string
  eyebrow?: string
  title: string
}

const SETTINGS_NAV = [
  { href: '/settings', label: 'Overview', icon: LayoutGrid },
  { href: '/settings/profile', label: 'Profile & preferences', icon: UserRound },
  { href: '/settings/social-accounts', label: 'Connected accounts', icon: Link2 },
  { href: '/settings/billing', label: 'Billing & plans', icon: CreditCard },
  { href: '/settings/profile/mfa', label: 'Multi-factor auth', icon: KeyRound },
] as const

function isActivePath(pathname: string, href: string) {
  if (href === '/settings/profile') return pathname === href
  if (href === '/settings/billing') return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href
}

export function SettingsDetailShell({
  action,
  children,
  className,
  contentClassName,
  description,
  eyebrow = 'Account settings',
  title,
}: SettingsDetailShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const activeItemRef = React.useRef<HTMLAnchorElement | null>(null)
  const currentIndex = Math.max(0, SETTINGS_NAV.findIndex((item) => isActivePath(pathname, item.href)))

  React.useEffect(() => {
    activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <PrometheusShell
      rootClassName="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#050505] font-sans text-white"
      mainClassName="relative z-auto h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[#050505]"
    >
      <div className="min-h-full bg-[#050505] px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
        <div
          className={cn(
            'mx-auto min-h-[calc(100vh-7rem)] max-w-[1440px] overflow-hidden border border-white/[0.09] bg-[#090909] shadow-[0_28px_90px_-48px_rgba(0,0,0,0.95)] lg:grid lg:grid-cols-[256px_minmax(0,1fr)]',
            className,
          )}
        >
          <aside className="border-b border-white/[0.08] bg-[#070707] lg:border-b-0 lg:border-r">
            <div className="flex min-h-16 items-center gap-3 border-b border-white/[0.08] px-4 py-3 lg:px-5">
              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="grid size-10 shrink-0 place-items-center border border-white/[0.1] text-white/62 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Back to settings overview"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/38">
                  <Settings2 className="size-3" aria-hidden="true" />
                  Settings
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-white/88">Workspace control</p>
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible lg:p-4" aria-label="Settings subpages">
              <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28 lg:block">
                Sections
              </p>
              {SETTINGS_NAV.map(({ href, icon: Icon, label }, index) => {
                const active = isActivePath(pathname, href)

                return (
                  <Link
                    key={href}
                    ref={active ? activeItemRef : undefined}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex min-h-11 shrink-0 items-center gap-3 border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:w-full',
                      active
                        ? 'border-white/[0.13] bg-white/[0.09] text-white'
                        : 'border-transparent text-white/48 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white/82',
                    )}
                  >
                    <span className="w-4 text-[10px] tabular-nums text-white/25 group-hover:text-white/44">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                )
              })}
            </nav>

            <div className="hidden border-t border-white/[0.08] p-5 lg:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28">Prometheus Studio</p>
              <p className="mt-2 text-xs leading-5 text-white/38">Account controls for your creative workspace.</p>
            </div>
          </aside>

          <section className="min-w-0 bg-[radial-gradient(circle_at_78%_0%,rgba(73,116,255,0.065),transparent_30%),#090909]">
            <header className="relative overflow-hidden border-b border-white/[0.08] px-5 py-6 sm:px-7 sm:py-7 lg:px-10 lg:py-9">
              <div className="pointer-events-none absolute -right-3 -top-8 select-none text-[116px] font-semibold leading-none tracking-[-0.08em] text-white/[0.018] sm:text-[148px]" aria-hidden="true">
                {String(currentIndex + 1).padStart(2, '0')}
              </div>
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/36">{eyebrow}</p>
                  <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white/96 sm:text-3xl lg:text-[34px]">
                    {title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">{description}</p>
                </div>
                {action ? <div className="relative shrink-0">{action}</div> : null}
              </div>
            </header>

            <div className={cn('px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10', contentClassName)}>{children}</div>
          </section>
        </div>
      </div>
    </PrometheusShell>
  )
}
