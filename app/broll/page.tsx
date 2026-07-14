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

export default function BRollPage() {
  return (
    <PrometheusShell header={<PageHeader title="B-roll Finder" description="Search + suggestions (mock)." showBackButton />}>
      <div className="px-8 py-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Suggested Queries</CardTitle>
            <CardDescription>Generated from the pipeline later.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/60">
              Run processing on a project to populate b-roll suggestions.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
            <CardDescription>UI-only; no paid integrations.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
              Connect to your own asset library later (Drive/Dropbox/etc).
            </div>
          </CardContent>
        </Card>
      </div>
    </PrometheusShell>
  )
}
