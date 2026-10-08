'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Bell, ChevronLeft, CircleHelp, CreditCard, Link2, Palette, ShieldCheck, UserRound, UsersRound } from 'lucide-react'

import { PrometheusShell } from '@/components/prometheus-shell'
import { cn } from '@/lib/utils'

export type SettingsPanel = 'profile' | 'notifications' | 'appearance' | 'workspace' | 'integrations' | 'billing' | 'security'

const NAV_GROUPS = [
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: UserRound },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'appearance', label: 'Appearance', icon: Palette },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'workspace', label: 'Workspace', icon: UsersRound },
      { id: 'integrations', label: 'Integrations', icon: Link2 },
      { id: 'billing', label: 'Billing & access', icon: CreditCard },
    ],
  },
  { label: 'Security', items: [{ id: 'security', label: 'Privacy & security', icon: ShieldCheck }] },
] as const

export function isSettingsPanel(value: string | null): value is SettingsPanel {
  return NAV_GROUPS.some(({ items }) => items.some(({ id }) => id === value))
}

export function settingsPanelTitle(panel: SettingsPanel) {
  return NAV_GROUPS.flatMap(({ items }) => [...items]).find(({ id }) => id === panel)?.label ?? 'Profile'
}

type SettingsFrameProps = {
  activePanel: SettingsPanel
  title: string
  children: ReactNode
  action?: ReactNode
  className?: string
  contentClassName?: string
  backHref?: string
  backLabel?: string
  onBack?: () => void
  onPanelChange?: (panel: SettingsPanel) => void
}

// The overview and account editors share the reference Settings structure.
// At phone widths the two regions stack, while the menu remains vertical.
export function SettingsFrame({
  activePanel,
  title,
  children,
  action,
  className,
  contentClassName,
  backHref = '/settings',
  backLabel = 'Back to settings overview',
  onBack,
  onPanelChange,
}: SettingsFrameProps) {
  const backClassName = 'grid size-9 shrink-0 place-items-center border border-white/[0.1] text-white/62 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

  return (
    <PrometheusShell
      rootClassName="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#050505] font-sans text-white"
      mainClassName="relative z-auto h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[#050505]"
    >
      <div data-light-mode-reference className="min-h-full bg-[#050505] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className={cn('mx-auto max-w-[1440px] overflow-hidden border border-white/[0.09] bg-[#090909] shadow-[0_28px_90px_-48px_rgba(0,0,0,0.95)] sm:grid sm:min-h-[760px] sm:grid-cols-[224px_minmax(0,1fr)] md:grid-cols-[256px_minmax(0,1fr)]', className)}>
          <aside className="border-b border-white/[0.08] bg-[#070707] sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-4 lg:px-5">
              {onBack ? (
                <button type="button" onClick={onBack} className={backClassName} aria-label={backLabel} title={backLabel}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <Link href={backHref} className={backClassName} aria-label={backLabel} title={backLabel}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Link>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/42">Settings</p>
                <p className="truncate text-sm font-medium text-white/88">My account</p>
              </div>
            </div>

            <nav className="space-y-6 p-4" aria-label="Settings navigation">
              {NAV_GROUPS.map(({ label, items }) => (
                <div key={label} className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">{label}</p>
                  {items.map(({ id, label: itemLabel, icon: Icon }) => {
                    const active = activePanel === id
                    const itemClassName = cn(
                      'flex h-10 w-full items-center gap-2 border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                      active
                        ? 'border-white/[0.12] bg-white/[0.09] text-white'
                        : 'border-transparent text-white/52 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white/82',
                    )
                    const content = <><Icon className="size-4 shrink-0" aria-hidden="true" />{itemLabel}</>

                    return onPanelChange ? (
                      <button key={id} type="button" onClick={() => onPanelChange(id)} className={itemClassName} aria-current={active ? 'page' : undefined}>
                        {content}
                      </button>
                    ) : (
                      <Link key={id} href={`/settings?panel=${id}`} className={itemClassName} aria-current={active ? 'page' : undefined}>
                        {content}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/42">My account</p>
                <h1 className="mt-1 truncate text-lg font-semibold text-white/94">{title}</h1>
              </div>
              {action ? <div className="shrink-0">{action}</div> : (
                <div className="flex shrink-0 items-center gap-2 text-xs text-white/46">
                  <CircleHelp className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Account settings</span>
                </div>
              )}
            </header>
            <div className={cn('@container/settings px-5 py-7 sm:px-7 sm:py-9 lg:px-10', contentClassName)}>{children}</div>
          </section>
        </div>
      </div>
    </PrometheusShell>
  )
}
