'use client'

import * as React from 'react'

import { DashboardMobileSidebarProfileV2 } from '@/components/dashboard/dashboard-mobile-sidebar-profile-v2'
import { DashboardRotator } from '@/components/dashboard/DashboardRotator'
import { AmbientGlow } from '@/components/editor/AmbientGlow'
import { PrometheusDashboardSidebar } from '@/components/sidebar/prometheus-dashboard-sidebar'
import { useDeviceTier } from '@/hooks/useDeviceTier'

function dispatchDashboardEvent(name: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name))
}

export default function DashboardPageV2() {
  const tier = useDeviceTier()

  const handleNewProject = React.useCallback(() => {
    dispatchDashboardEvent('prometheus:dashboard:new-project')
  }, [])

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-chrome-950 text-text-primary"
      data-device-tier={tier}
      data-dashboard-shell="v2"
    >
      <AmbientGlow />

      <div className="hidden lg:block">
        <PrometheusDashboardSidebar />
      </div>

      <DashboardMobileSidebarProfileV2
        className="lg:hidden"
        onNewProject={handleNewProject}
        profileHref="/settings/profile"
        studioHref="/studio"
      />

      <main className="relative flex min-h-screen min-w-0 flex-col lg:ml-0">
        <DashboardRotator />
      </main>
    </div>
  )
}
