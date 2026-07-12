'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft, ChevronRight, Link2, Shield, User } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { PrometheusShell } from '@/components/prometheus-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const router = useRouter()
  const [reducedMotion, setReducedMotion] = React.useState(false)
  const [notifications, setNotifications] = React.useState(true)
  const [safeMode, setSafeMode] = React.useState(true)
  const [signingOut, setSigningOut] = React.useState(false)

  return (
    <PrometheusShell
      header={
        <header className="flex items-center justify-between gap-6 border-b border-white/8 bg-[linear-gradient(180deg,rgba(10,12,18,0.88)_0%,rgba(8,10,14,0.72)_100%)] px-4 py-4 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-8 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/studio')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#94a3b8] transition-all duration-200 hover:bg-white/[0.05] hover:text-[#f8fafc] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/70"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-white/96 md:text-3xl">
                Settings
              </h1>
              <p className="mt-1 text-sm leading-6 text-white/58">Preferences and integrations (UI scaffolding).</p>
            </div>
          </div>
        </header>
      }
    >
      <div className="px-8 py-6 grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <Link
            href="/settings/profile"
            className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.06]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/85">Profile</div>
                <div className="mt-1 truncate text-xs text-white/45">Account info, security, preferences</div>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-white/42" />
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-white/60" />
              Notifications
            </CardTitle>
            <CardDescription>Mock toggles for future alerts.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <div className="text-sm font-medium text-white/85">Processing completion</div>
                <div className="mt-1 text-xs text-white/45">Notify when edits are ready.</div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <div className="text-sm font-medium text-white/85">Reduced motion override</div>
                <div className="mt-1 text-xs text-white/45">UI-only. Respects system preference by default.</div>
              </div>
              <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 text-white/60" />
              Integrations
            </CardTitle>
            <CardDescription>Mock connect states.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/85">Google Drive</div>
                <div className="mt-1 text-xs text-white/45 truncate">Connect to import sources.</div>
              </div>
              <Badge variant="secondary">Mock</Badge>
            </div>
            <Link
              href="/settings/social-accounts"
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.06]"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/85">Social Accounts</div>
                <div className="mt-1 truncate text-xs text-white/45">Connect publishing channels.</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-white/42" />
            </Link>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/85">Dropbox</div>
                <div className="mt-1 text-xs text-white/45 truncate">Connect to import sources.</div>
              </div>
              <Badge variant="secondary">Mock</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-white/60" />
              Billing & access
            </CardTitle>
            <CardDescription>Where users manage payment and unlock editing rights.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white/85">Editor access is subscription-gated</div>
                <div className="mt-1 text-xs text-white/45">
                  Unpaid users are redirected here before they can open or run edits.
                </div>
              </div>
              <Button asChild>
                <Link href="/settings/billing">Open billing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-4 text-white/60" />
              Safety
            </CardTitle>
            <CardDescription>Editing guardrails (UI only).</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <div className="text-sm font-medium text-white/85">Safe mode</div>
                <div className="mt-1 text-xs text-white/45">Conservative pacing and captioning.</div>
              </div>
              <Switch checked={safeMode} onCheckedChange={setSafeMode} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Session controls for the current workspace login.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white/85">Signed-in session</div>
                <div className="mt-1 text-xs text-white/45">Sign out here if you want to switch accounts.</div>
              </div>
              <Button
                variant="outline"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true)

                  try {
                    await fetch('/api/auth/logout', { method: 'POST' })
                  } finally {
                    window.location.assign('/login')
                  }
                }}
              >
                {signingOut ? <InlineLoadingAnimation size={16} label="Signing out" /> : null}
                {signingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 mt-4 border-t border-white/10 pt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-white/40">
            <Link href="/terms" className="transition-colors hover:text-white/60">
              Terms of Service
            </Link>
            <span>|</span>
            <Link href="/privacy" className="transition-colors hover:text-white/60">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="/refund" className="transition-colors hover:text-white/60">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </PrometheusShell>
  )
}
