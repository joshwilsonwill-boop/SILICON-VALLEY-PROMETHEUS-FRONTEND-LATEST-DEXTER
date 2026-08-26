'use client'

import { LandingHeader } from '@/components/LandingHeader'
import { PrometheusShell } from '@/components/prometheus-shell'
import { MiniRunStudio } from '@/components/mini-run/mini-run-studio'
import { MobileNavDrawer } from '@/app/components/mobile/MobileNavDrawer'

export default function MiniRunStudioPage() {
  return (
    <MobileNavDrawer>
      {({ hamburger }) => (
        <PrometheusShell header={<LandingHeader mobileNavControl={hamburger} showBrandName={false} studioSurface />}>
          <div className="bg-[#050505] pt-20">
            <MiniRunStudio />
          </div>
        </PrometheusShell>
      )}
    </MobileNavDrawer>
  )
}
