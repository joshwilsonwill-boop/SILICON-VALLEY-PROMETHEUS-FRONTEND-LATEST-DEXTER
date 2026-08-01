'use client'

import { LandingHeader } from '@/components/LandingHeader'
import { UploadErrorBoundary } from '@/components/error-boundaries/UploadErrorBoundary'
import { PrometheusShell } from '@/components/prometheus-shell'
import { VideoUploadInterface } from '@/components/video-upload-interface'
import { MobileNavDrawer } from '@/app/components/mobile/MobileNavDrawer'

export default function StudioPage() {
  return (
    <MobileNavDrawer>
      {({ hamburger }) => (
        <PrometheusShell header={<LandingHeader mobileNavControl={hamburger} showBrandName={false} studioSurface />}>
          <UploadErrorBoundary>
            <div className="bg-[#050505] pt-20">
              <VideoUploadInterface />
            </div>
          </UploadErrorBoundary>
        </PrometheusShell>
      )}
    </MobileNavDrawer>
  )
}
