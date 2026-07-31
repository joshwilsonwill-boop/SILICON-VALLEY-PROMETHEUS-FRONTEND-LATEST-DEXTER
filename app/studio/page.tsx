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
        <PrometheusShell header={<LandingHeader mobileNavControl={hamburger} />}>
          <UploadErrorBoundary>
            <div className="pt-20">
              <VideoUploadInterface />
            </div>
          </UploadErrorBoundary>
        </PrometheusShell>
      )}
    </MobileNavDrawer>
  )
}
