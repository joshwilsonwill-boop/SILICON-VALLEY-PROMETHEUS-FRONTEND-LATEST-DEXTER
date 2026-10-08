'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { SettingsFrame, type SettingsPanel } from '@/components/settings/settings-frame'

type SettingsDetailShellProps = {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  description: string
  eyebrow?: string
  title: string
}

function panelForPath(pathname: string): SettingsPanel {
  if (pathname === '/settings/profile/mfa') return 'security'
  if (pathname.startsWith('/settings/billing')) return 'billing'
  if (pathname === '/settings/social-accounts') return 'integrations'
  return 'profile'
}

export function SettingsDetailShell({
  action,
  children,
  className,
  contentClassName,
  description,
  title,
}: SettingsDetailShellProps) {
  const pathname = usePathname()

  return (
    <SettingsFrame
      activePanel={panelForPath(pathname)}
      title={title}
      action={action}
      className={className}
      contentClassName={contentClassName}
    >
      <p className="mb-6 text-sm leading-6 text-white/48">{description}</p>
      {children}
    </SettingsFrame>
  )
}
