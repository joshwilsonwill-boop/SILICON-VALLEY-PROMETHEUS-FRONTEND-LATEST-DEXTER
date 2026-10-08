'use client'

import { useRouter } from 'next/navigation'
import { PrometheusShell } from '@/components/prometheus-shell'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

export default function TeamPage() {
  const router = useRouter()
  const workspaceHref = '/settings?panel=workspace'

  return (
    <PrometheusShell header={<PageHeader title="Team" description="UI-only team management scaffolding." showBackButton backHref={workspaceHref} onBack={() => router.push(workspaceHref)} />}>
      <div className="px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Invite, roles, permissions (mock).</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/60">
              This is a placeholder for team collaboration flows.
            </div>
          </CardContent>
        </Card>
      </div>
    </PrometheusShell>
  )
}
