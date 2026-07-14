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

export default function CaptionsPage() {
  return (
    <PrometheusShell header={<PageHeader title="Captions Studio" description="UI-only scaffolding." showBackButton />}>
      <div className="px-8 py-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Caption Styles</CardTitle>
            <CardDescription>Preview intensity, rhythm, and readability.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {['Low', 'Medium', 'High'].map((v) => (
              <div
                key={v}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="text-sm font-medium text-white/85">{v} intensity</div>
                <Badge variant="secondary">Mock</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Caption Timing</CardTitle>
            <CardDescription>Segmented caption marks (mock).</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/60">
              Open a project in the editor to view timed caption segments.
            </div>
          </CardContent>
        </Card>
      </div>
    </PrometheusShell>
  )
}
