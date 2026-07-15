'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { Bell, ChevronRight, CreditCard, LogOut, Settings, Shield, User, Users, X } from 'lucide-react'

import { GlassSphereAvatar } from '@/components/ui/glass-sphere-avatar'

const menuItems = [
  { icon: User, label: 'Profile', href: '/settings/profile' },
  { icon: CreditCard, label: 'Billing', href: '/settings/billing' },
  { icon: Users, label: 'Team Members', href: '/settings/team' },
  { icon: Bell, label: 'Notifications', href: '/settings/notifications' },
  { icon: Shield, label: 'Security', href: '/settings/profile/mfa' },
]

export function UserProfilePopup({
  isOpen,
  onClose,
  onLogout,
  user,
}: {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
  user: { avatar?: string | null; email: string; name: string; plan?: string }
}) {
  return (
    <AnimatePresence>
      {isOpen ? <>
        <motion.button type="button" aria-label="Close account menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="fixed bottom-24 left-4 right-4 z-[101] mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(20,20,30,0.92)] shadow-[0_24px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-[40px]">
          <div className="relative p-5 pb-3">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(99,102,241,0.08),transparent_60%)]" />
            <div className="relative flex items-start gap-3">
              <GlassSphereAvatar src={user.avatar} alt={user.name} size={48} />
              <div className="min-w-0 flex-1 pt-0.5"><div className="flex items-center gap-2"><h3 className="truncate text-base font-semibold text-white">{user.name}</h3><span className="rounded-md border border-indigo-400/25 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-200">{user.plan ?? 'Free'}</span></div><p className="mt-0.5 truncate text-xs text-white/35">{user.email}</p></div>
              <button type="button" onClick={onClose} aria-label="Close account menu" className="grid size-7 place-items-center rounded-full bg-white/5 text-white/40 transition-colors hover:bg-white/10"><X className="size-3.5" /></button>
            </div>
          </div>
          <div className="relative px-2 pb-2">
            {menuItems.map(({ icon: Icon, label, href }) => <Link key={label} href={href} onClick={onClose} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"><span className="grid size-8 place-items-center rounded-lg bg-white/5 text-white/50 transition-colors group-hover:bg-white/10 group-hover:text-white/75"><Icon className="size-4" /></span><span className="flex-1 text-sm text-white/60 group-hover:text-white/90">{label}</span><ChevronRight className="size-4 text-white/20" /></Link>)}
            <div className="my-1 mx-3 h-px bg-white/5" />
            <button type="button" onClick={onLogout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-red-500/10"><span className="grid size-8 place-items-center rounded-lg bg-white/5 text-white/40 group-hover:bg-red-500/10 group-hover:text-red-400"><LogOut className="size-4" /></span><span className="text-sm text-white/40 group-hover:text-red-400">Sign Out</span></button>
          </div>
        </motion.div>
      </> : null}
    </AnimatePresence>
  )
}
