'use client'

import { VideoUploadInterface } from "@/components/video-upload-interface";
import { PrometheusShell } from "@/components/prometheus-shell";
import { UploadErrorBoundary } from "@/components/error-boundaries/UploadErrorBoundary";
import { LandingHeader } from "@/components/LandingHeader";
import { MobileNavDrawer } from "@/app/components/mobile/MobileNavDrawer";

export default function HeroPage() {
  return (
    <MobileNavDrawer>
      {({ hamburger }) => (
        <PrometheusShell header={<LandingHeader mobileNavControl={hamburger} />}>
          <UploadErrorBoundary>
            <div>
              <VideoUploadInterface />
            </div>
          </UploadErrorBoundary>
        </PrometheusShell>
      )}
    </MobileNavDrawer>
  );
}
