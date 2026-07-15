'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/components/auth/auth-provider'
import { GlassSphereAvatar } from '@/components/ui/glass-sphere-avatar'
import { UserProfilePopup } from '@/components/ui/user-profile-popup'
import { useProfile, getProfileDisplayName } from '@/hooks/use-profile'
import { bottomNavItems, mainNavItems } from '@/lib/navigation'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PrometheusDashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAuth()
  const { profile } = useProfile()
  const [collapsed, setCollapsed] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const userName = getProfileDisplayName(profile)
  const userEmail = profile?.email ?? session?.user?.email ?? 'Signed in'

  const logout = React.useCallback(() => {
    setProfileOpen(false)
    void fetch('/api/auth/logout', { method: 'POST' }).finally(() => router.push('/login'))
  }, [router])

  return (
    <aside className={cn('relative z-40 hidden h-screen shrink-0 flex-col border-r border-white/[0.04] bg-[rgba(14,14,22,0.68)] backdrop-blur-2xl transition-[width] duration-300 lg:flex', collapsed ? 'w-[72px]' : 'w-[260px]')} aria-label="Prometheus navigation">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)]">P</span><AnimatePresence initial={false}>{!collapsed ? <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap text-sm font-semibold tracking-[0.15em] text-white/80">PROMETHEUS</motion.span> : null}</AnimatePresence></div>
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="grid size-6 place-items-center rounded-full bg-white/5 text-white/35 transition-colors hover:bg-white/10 hover:text-white/70">{collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}</button>
      </div>

      <nav className="flex-1 space-y-1 px-3 pt-4">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return <Link key={item.label} href={item.href} className={cn('group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', active ? 'bg-white/[0.06] text-white' : 'text-white/35 hover:bg-white/[0.03] hover:text-white/65')}>
            {active ? <motion.span layoutId="dashboard-active-nav" className="absolute left-0 h-5 w-[3px] rounded-full bg-indigo-500" transition={{ type: 'spring', stiffness: 400, damping: 30 }} /> : null}
            <span className={cn('grid shrink-0 place-items-center rounded-lg', collapsed ? 'size-10' : 'size-9', active ? 'bg-indigo-500/12 text-indigo-400' : 'text-white/35 group-hover:bg-white/5 group-hover:text-white/60')}><Icon className={collapsed ? 'size-5' : 'size-[18px]'} strokeWidth={1.5} /></span>
            <AnimatePresence initial={false}>{!collapsed ? <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="min-w-0 flex-1 overflow-hidden whitespace-nowrap font-medium">{item.label}</motion.span> : null}</AnimatePresence>
            {!collapsed && item.badge ? <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-white/40">{item.badge}</span> : null}
            {collapsed ? <span className="pointer-events-none absolute left-full ml-3 rounded-lg border border-white/8 bg-[#1a1a24] px-3 py-1.5 text-xs text-white/70 opacity-0 transition-opacity group-hover:opacity-100">{item.label}</span> : null}
          </Link>
        })}
      </nav>

      <div className="space-y-1 px-3 pb-4">
        <Link href="/editor/__new__" className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 transition-colors hover:bg-white/[0.03] hover:text-white/70', collapsed && 'justify-center')}><span className="grid size-9 place-items-center rounded-lg bg-white/5"><Plus className="size-[18px]" strokeWidth={1.5} /></span>{!collapsed ? <span>New Project</span> : null}</Link>
        {bottomNavItems.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 transition-colors hover:bg-white/[0.03] hover:text-white/65', collapsed && 'justify-center')}><span className="grid size-9 place-items-center rounded-lg"><Icon className="size-[18px]" strokeWidth={1.5} /></span>{!collapsed ? <span>{item.label}</span> : null}</Link> })}
        <button type="button" onClick={() => setProfileOpen(true)} className={cn('mt-2 flex w-full items-center gap-3 rounded-2xl border border-white/[0.04] p-2.5 text-left transition-colors hover:bg-white/[0.04]', collapsed && 'justify-center')}><GlassSphereAvatar src={profile?.avatar_url} alt={userName} size={collapsed ? 36 : 32} /><AnimatePresence initial={false}>{!collapsed ? <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="min-w-0 flex-1 overflow-hidden"><span className="block truncate text-sm font-medium text-white/70">{userName}</span><span className="block truncate text-[11px] text-white/25">Free Plan</span></motion.span> : null}</AnimatePresence></button>
      </div>
      <UserProfilePopup isOpen={profileOpen} onClose={() => setProfileOpen(false)} onLogout={logout} user={{ avatar: profile?.avatar_url, email: userEmail, name: userName, plan: 'Free' }} />
    </aside>
  )
}
