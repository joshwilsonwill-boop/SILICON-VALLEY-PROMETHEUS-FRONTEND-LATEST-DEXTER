import { BillingSuccessPanel } from '@/components/billing/billing-success-panel'
import { LoadingAnimation } from '@/components/loading-animation'
import { PageHeader } from '@/components/page-header'
import { PrometheusShell } from '@/components/prometheus-shell'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'

export default function BillingSuccessPage() {
  return (
    <PrometheusShell
      header={
        <PageHeader
          title="Billing Confirmed"
          description="Dodo returned from checkout. We are validating the subscription and restoring workspace access."
          actions={
            <Badge variant="secondary" className="border-[#5ea8ff]/25 bg-[#5ea8ff]/10 text-[#cfe6ff]">
              Dodo checkout
            </Badge>
          }
        />
      }
    >
      <Suspense fallback={<LoadingAnimation message="Confirming billing..." />}>
        <BillingSuccessPanel />
      </Suspense>
    </PrometheusShell>
  )
}
