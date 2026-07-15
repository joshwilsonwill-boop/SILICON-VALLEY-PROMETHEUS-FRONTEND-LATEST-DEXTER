"use client";

import { DashboardRotator } from "@/components/dashboard/DashboardRotator";
import { AmbientGlow } from "@/components/editor/AmbientGlow";
import { MobileLanding } from "@/components/mobile/MobileLanding";
import { PrometheusDashboardSidebar } from "@/components/sidebar/prometheus-dashboard-sidebar";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function DashboardPage() {
  const tier = useDeviceTier();
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return <MobileLanding />;
  }

  return (
    <div
      className="relative flex h-screen w-screen overflow-hidden bg-chrome-950 text-text-primary"
      data-device-tier={tier}
    >
      <AmbientGlow />
      <PrometheusDashboardSidebar />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <DashboardRotator />
      </main>
    </div>
  );
}
