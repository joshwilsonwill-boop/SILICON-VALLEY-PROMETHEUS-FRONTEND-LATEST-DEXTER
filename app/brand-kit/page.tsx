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
import { Badge } from '@/components/ui/badge'

export default function BrandKitPage() {
  return (
    <PrometheusShell header={<PageHeader title="Brand Kit" description="Fonts, colors, watermark (mock)." showBackButton />}>
      <div className="px-8 py-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Brand Presets</CardTitle>
            <CardDescription>UI-only scaffolding.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {['Fonts', 'Colors', 'Watermark'].map((k) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="text-sm font-medium text-white/85">{k}</div>
                <Badge variant="secondary">Mock</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Export Defaults</CardTitle>
            <CardDescription>Applied at export time later.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/60">
              Add watermark placement, safe margins, and LUT presets later.
            </div>
          </CardContent>
        </Card>
      </div>
    </PrometheusShell>
  )
}
