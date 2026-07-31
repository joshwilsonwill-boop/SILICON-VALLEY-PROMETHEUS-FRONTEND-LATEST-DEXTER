'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Cloud,
  Cookie,
  CreditCard,
  Eye,
  LayoutTemplate,
  Link2,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { PrometheusShell } from '@/components/prometheus-shell'
import { CookieSettingsButton } from '@/components/cookie-consent/cookie-settings-button'
import { StorageIntegrationsPanel } from '@/components/settings/storage-integrations-panel'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { getProfileDisplayName, useProfile } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

type SettingsPanel = 'profile' | 'notifications' | 'appearance' | 'workspace' | 'integrations' | 'billing' | 'security'

type SettingsNavItem = {
  id: SettingsPanel
  label: string
  icon: LucideIcon
}

const accountItems: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

const workspaceItems: SettingsNavItem[] = [
  { id: 'workspace', label: 'Workspace', icon: UsersRound },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'billing', label: 'Billing & access', icon: CreditCard },
]

const securityItems: SettingsNavItem[] = [{ id: 'security', label: 'Privacy & security', icon: ShieldCheck }]

export default function SettingsPage() {
  const router = useRouter()
  const { session } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [activePanel, setActivePanel] = React.useState<SettingsPanel>('profile')
  const [notifications, setNotifications] = React.useState(true)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  const [safeMode, setSafeMode] = React.useState(true)
  const [signingOut, setSigningOut] = React.useState(false)

  const displayName = getProfileDisplayName(profile)
  const username = profile?.username?.trim() || 'prometheus-user'
  const email = session?.user?.email || profile?.email || 'No email connected'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    setSigningOut(true)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.assign('/login')
    }
  }

  return (
    <PrometheusShell
      rootClassName="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#050505] font-sans text-white"
      mainClassName="relative z-auto h-full overflow-y-auto overflow-x-hidden overscroll-contain bg-[#050505]"
    >
      <div className="min-h-full bg-[#050505] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1440px] overflow-hidden border border-white/[0.09] bg-[#090909] shadow-[0_28px_90px_-48px_rgba(0,0,0,0.95)] lg:grid lg:min-h-[760px] lg:grid-cols-[256px_minmax(0,1fr)]">
          <aside className="border-b border-white/[0.08] bg-[#070707] lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-4 lg:px-5">
              <button
                type="button"
                onClick={() => router.push('/studio')}
                className="grid size-9 shrink-0 place-items-center border border-white/[0.1] text-white/62 transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Return to studio"
                title="Return to studio"
              >
                <ChevronRight className="size-4 rotate-180" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/42">Settings</p>
                <p className="truncate text-sm font-medium text-white/88">My account</p>
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-6 lg:overflow-visible lg:p-4" aria-label="Settings navigation">
              <SettingsNavSection label="Account" items={accountItems} activePanel={activePanel} onChange={setActivePanel} />
              <SettingsNavSection label="Workspace" items={workspaceItems} activePanel={activePanel} onChange={setActivePanel} />
              <SettingsNavSection label="Security" items={securityItems} activePanel={activePanel} onChange={setActivePanel} />
            </nav>
          </aside>

          <section className="min-w-0">
            <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4 sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/42">My account</p>
                <h1 className="mt-1 truncate text-lg font-semibold text-white/94">{panelTitle(activePanel)}</h1>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-white/46">
                <CircleHelp className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Account settings</span>
              </div>
            </header>

            <div className="px-5 py-7 sm:px-7 sm:py-9 lg:px-10">
              {activePanel === 'profile' ? (
                <ProfilePanel
                  avatarUrl={profile?.avatar_url}
                  displayName={profileLoading ? 'Loading account' : displayName}
                  email={email}
                  initials={initials || 'P'}
                  location={profile?.location}
                  pronouns={profile?.pronouns}
                  username={username}
                />
              ) : null}

              {activePanel === 'notifications' ? (
                <SettingsSurface title="Notifications" subtitle="Choose which account updates reach you.">
                  <SettingToggle
                    label="Processing completion"
                    description="Notify me when edits are ready."
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                  <SettingToggle
                    label="Reduced motion"
                    description="Limit non-essential interface animation."
                    checked={reducedMotion}
                    onCheckedChange={setReducedMotion}
                  />
                  <Link href="/settings/profile" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-white/68 transition-colors hover:text-white">
                    Notification preferences <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </SettingsSurface>
              ) : null}

              {activePanel === 'appearance' ? (
                <SettingsSurface title="Appearance" subtitle="Use your saved preferences across the workspace.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PreferenceLink icon={Palette} label="Theme & accent" href="/settings/profile" />
                    <PreferenceLink icon={LayoutTemplate} label="Display preferences" href="/settings/profile" />
                  </div>
                </SettingsSurface>
              ) : null}

              {activePanel === 'workspace' ? (
                <SettingsSurface title="Workspace" subtitle="Manage the people and defaults behind your projects.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PreferenceLink icon={UsersRound} label="Team workspace" href="/team" />
                    <PreferenceLink icon={SlidersHorizontal} label="Editor preferences" href="/settings/profile" />
                  </div>
                </SettingsSurface>
              ) : null}

              {activePanel === 'integrations' ? (
                <SettingsSurface title="Integrations" subtitle="Connect storage and publishing accounts.">
                  <StorageIntegrationsPanel />
                  <PreferenceLink className="mt-3" icon={Cloud} label="Social accounts" href="/settings/social-accounts" />
                </SettingsSurface>
              ) : null}

              {activePanel === 'billing' ? (
                <SettingsSurface title="Billing & access" subtitle="Review your plan and manage workspace access.">
                  <div className="flex flex-col gap-4 border border-white/[0.09] bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/88">Workspace subscription</p>
                      <p className="mt-1 text-sm text-white/48">Plans, invoices, and editing access.</p>
                    </div>
                    <Button asChild className="rounded-none bg-white px-4 text-black hover:bg-white/85">
                      <Link href="/settings/billing">Open billing</Link>
                    </Button>
                  </div>
                </SettingsSurface>
              ) : null}

              {activePanel === 'security' ? (
                <SettingsSurface title="Privacy & security" subtitle="Keep your account and workspace protected.">
                  <div className="space-y-3">
                    <PreferenceLink icon={ShieldCheck} label="Password, sessions & API access" href="/settings/profile" />
                    <CookieSettingsButton className="flex w-full items-center justify-between gap-3 border border-white/[0.09] bg-white/[0.025] p-4 text-left text-sm font-medium text-white/82 transition-colors hover:border-white/[0.18] hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                      <span className="flex items-center gap-3"><Cookie className="size-4 text-white/52" aria-hidden="true" />Cookie preferences</span>
                      <ChevronRight className="size-4 text-white/42" aria-hidden="true" />
                    </CookieSettingsButton>
                    <SettingToggle
                      label="Safe mode"
                      description="Use conservative pacing and captioning defaults."
                      checked={safeMode}
                      onCheckedChange={setSafeMode}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      disabled={signingOut}
                      className="flex w-full items-center justify-between gap-3 border border-red-400/20 bg-red-400/[0.04] p-4 text-left text-sm font-medium text-red-100 transition-colors hover:bg-red-400/[0.09] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/50"
                    >
                      <span className="flex items-center gap-3"><LogOut className="size-4" aria-hidden="true" />Sign out of this account</span>
                      {signingOut ? <InlineLoadingAnimation size={16} label="Signing out" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                </SettingsSurface>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </PrometheusShell>
  )
}

function SettingsNavSection({
  label,
  items,
  activePanel,
  onChange,
}: {
  label: string
  items: SettingsNavItem[]
  activePanel: SettingsPanel
  onChange: (panel: SettingsPanel) => void
}) {
  return (
    <div className="flex shrink-0 gap-1 lg:block lg:space-y-1">
      <p className="hidden px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35 lg:block">{label}</p>
      {items.map(({ id, label: itemLabel, icon: Icon }) => {
        const active = activePanel === id

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex h-10 items-center gap-2 border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:w-full',
              active
                ? 'border-white/[0.12] bg-white/[0.09] text-white'
                : 'border-transparent text-white/52 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white/82',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {itemLabel}
          </button>
        )
      })}
    </div>
  )
}

function ProfilePanel({
  avatarUrl,
  displayName,
  email,
  initials,
  location,
  pronouns,
  username,
}: {
  avatarUrl?: string | null
  displayName: string
  email: string
  initials: string
  location?: string | null
  pronouns?: string | null
  username: string
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b border-white/[0.08] pb-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden border border-white/[0.13] bg-white/[0.08] text-xl font-semibold text-white">
              {avatarUrl ? (
                // External avatar URLs are not guaranteed to be configured for next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold text-white/95">{displayName}</h2>
              <p className="mt-1 truncate text-sm text-white/48">{email}</p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0 rounded-none border-white/20 bg-transparent text-white hover:bg-white/[0.08] hover:text-white">
            <Link href="/settings/profile">Edit profile</Link>
          </Button>
        </div>
      </div>

      <div className="mt-7 border border-white/[0.09] bg-white/[0.018]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-white/88">Personal details</h3>
            <p className="mt-1 text-xs text-white/42">Profile information visible in your workspace.</p>
          </div>
          <Eye className="size-4 text-white/35" aria-hidden="true" />
        </div>
        <dl className="divide-y divide-white/[0.07]">
          <DetailRow label="Display name" value={displayName} />
          <DetailRow label="Username" value={`@${username}`} />
          <DetailRow label="Email" value={email} />
          <DetailRow label="Location" value={location || 'Not set'} />
          <DetailRow label="Pronouns" value={pronouns || 'Not set'} />
        </dl>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PreferenceLink icon={ShieldCheck} label="Security settings" href="/settings/profile" />
        <PreferenceLink icon={Bell} label="Notification preferences" href="/settings/profile" />
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6 sm:px-5">
      <dt className="text-xs font-medium text-white/42">{label}</dt>
      <dd className="min-w-0 truncate text-sm text-white/84" title={value}>{value}</dd>
    </div>
  )
}

function SettingsSurface({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white/94">{title}</h2>
        <p className="mt-2 text-sm text-white/48">{subtitle}</p>
      </div>
      <div className="border border-white/[0.09] bg-white/[0.018] p-4 sm:p-5">{children}</div>
    </div>
  )
}

function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/[0.08] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-white/88">{label}</p>
        <p className="mt-1 text-sm text-white/46">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  )
}

function PreferenceLink({
  icon: Icon,
  label,
  href,
  className,
}: {
  icon: LucideIcon
  label: string
  href: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-14 items-center justify-between gap-3 border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-medium text-white/82 transition-colors hover:border-white/[0.18] hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-3"><Icon className="size-4 shrink-0 text-white/52" aria-hidden="true" /><span className="truncate">{label}</span></span>
      <ChevronRight className="size-4 shrink-0 text-white/42" aria-hidden="true" />
    </Link>
  )
}

function panelTitle(panel: SettingsPanel) {
  return panel === 'billing' ? 'Billing & access' : panel === 'security' ? 'Privacy & security' : panel.charAt(0).toUpperCase() + panel.slice(1)
}
