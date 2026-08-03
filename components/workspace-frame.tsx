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
    <div className="prometheus-workspace-shell relative h-[100dvh] w-full overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(255,255,255,0.065)_0%,rgba(255,255,255,0.018)_34%,rgba(0,0,0,0)_64%),linear-gradient(180deg,#0b0b0c_0%,#050506_46%,#000_100%)]" />
      <IsoLevelWarp color="148, 148, 156" density={34} speed={0.08} />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_-20%,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.012)_42%,rgba(0,0,0,0)_70%),linear-gradient(180deg,rgba(7,7,8,0.42)_0%,rgba(0,0,0,0.72)_100%)]" />

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
