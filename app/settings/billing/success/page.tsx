import { BillingSuccessPanel } from '@/components/billing/billing-success-panel'
import { LoadingAnimation } from '@/components/loading-animation'
import { SettingsDetailShell } from '@/components/settings/settings-detail-shell'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'

export default function BillingSuccessPage() {
  return (
    <SettingsDetailShell
      eyebrow="Workspace · Billing"
      title="Billing confirmed"
      description="We are validating the checkout and restoring workspace access."
      action={
        <Badge variant="secondary" className="rounded-none border-[#5ea8ff]/25 bg-[#5ea8ff]/10 text-[#cfe6ff]">
          Dodo checkout
        </Badge>
      }
    >
      <Suspense fallback={<LoadingAnimation message="Confirming billing..." />}>
        <BillingSuccessPanel />
      </Suspense>
    </SettingsDetailShell>
  )
}
