'use client'

import { PrometheusShell } from '@/components/prometheus-shell'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export default function HighlightsPage() {
  return (
    <PrometheusShell
      header={<PageHeader title="Auto Highlights" description="Find moments worth clipping (mock)." showBackButton />}
    >
      <div className="px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Highlights Pipeline</CardTitle>
            <CardDescription>Hook up to detected timestamps later.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/60">
              This page is UI scaffolding for highlight discovery workflows.
            </div>
          </CardContent>
        </Card>
      </div>
    </PrometheusShell>
  )
}
