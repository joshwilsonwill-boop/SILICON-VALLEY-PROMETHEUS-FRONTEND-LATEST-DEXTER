'use client'

import * as React from 'react'
import { DashboardMobileSidebar, type DashboardMobileSidebarProps } from '@/components/dashboard/mobile-sidebar'
import { useProfile } from '@/hooks/use-profile'

export type DashboardMobileSidebarProfileV2Props = Omit<DashboardMobileSidebarProps, 'userName' | 'userEmail' | 'userAvatar'> & {
  userName?: string | null
  userEmail?: string | null
}

export function DashboardMobileSidebarProfileV2({
  userName,
  userEmail,
  ...props
}: DashboardMobileSidebarProfileV2Props) {
  const { profile, displayName } = useProfile()

  return (
    <DashboardMobileSidebar
      {...props}
      userName={userName ?? displayName}
      userEmail={userEmail ?? profile?.email ?? null}
      userAvatar={profile?.avatar_url ?? null}
    />
  )
}
