'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

import { DashboardSidebar } from '@/components/dashboard-sidebar'

const IsoLevelWarp = dynamic(() => import('@/components/ui/isometric-wave-grid-background'), {
  ssr: false,
})

const WORKSPACE_ROUTE_REGEX =
  /^\/(?:$|studio(?:\/|$)|dashboard(?:\/|$)|analytics(?:\/|$)|projects(?:\/|$)|assets(?:\/|$)|editor(?:\/|$)|settings(?:\/|$)|exports(?:\/|$)|templates(?:\/|$)|team(?:\/|$)|highlights(?:\/|$)|captions(?:\/|$)|broll(?:\/|$)|brand-kit(?:\/|$)|billing(?:\/|$))/
const EDITOR_DETAIL_ROUTE_REGEX = /^\/editor\/[^/]+(?:\/|$)/

const AUTH_ROUTE_REGEX = /^\/(?:login|signup|verify|forgot-password|reset-password|terms|privacy|refund)(?:\/|$)/

function isWorkspaceRoute(pathname: string) {
  if (!pathname || pathname.startsWith('/api')) return false
  if (AUTH_ROUTE_REGEX.test(pathname)) return false
  return WORKSPACE_ROUTE_REGEX.test(pathname)
}

export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const shouldRenderWorkspaceShell = isWorkspaceRoute(pathname)
  const shouldRenderSidebar = shouldRenderWorkspaceShell && !EDITOR_DETAIL_ROUTE_REGEX.test(pathname)

  if (!shouldRenderWorkspaceShell) {
    return <>{children}</>
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_14%_2%,rgba(212,176,255,0.14)_0%,rgba(34,14,58,0.08)_38%,rgba(0,0,0,0)_68%),linear-gradient(180deg,rgba(14,9,24,0.96)_0%,rgba(6,4,10,1)_100%)]" />
      <IsoLevelWarp color="168, 124, 255" density={34} speed={0.08} />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_14%_2%,rgba(212,176,255,0.22)_0%,rgba(34,14,58,0.12)_38%,rgba(0,0,0,0)_68%),linear-gradient(180deg,rgba(12,7,20,0.62)_0%,rgba(6,4,10,0.84)_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 w-full">
        {shouldRenderSidebar ? <DashboardSidebar /> : null}

        <div
          data-lenis-prevent
          className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
