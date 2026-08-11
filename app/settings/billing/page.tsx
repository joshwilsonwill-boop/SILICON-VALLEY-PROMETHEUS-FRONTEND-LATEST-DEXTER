import { Suspense } from 'react'

import { BillingDashboard } from '@/components/billing/billing-dashboard'
import { LoadingAnimation } from '@/components/loading-animation'
import { SettingsDetailShell } from '@/components/settings/settings-detail-shell'

export default function SettingsBillingPage() {
  return (
    <SettingsDetailShell
      eyebrow="Workspace"
      title="Billing & plans"
      description="Review plan capacity, invoices, payment methods, and workspace access."
      contentClassName="p-0 sm:p-0 lg:p-0"
    >
      <Suspense fallback={<LoadingAnimation message="Loading billing..." />}>
        <BillingDashboard />
      </Suspense>
    </SettingsDetailShell>
  )
}
