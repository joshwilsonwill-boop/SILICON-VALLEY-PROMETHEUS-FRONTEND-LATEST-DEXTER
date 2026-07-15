'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, CreditCard, LogOut, Shield, User, Users, X } from 'lucide-react'
import { GlassSphereAvatar } from '@/components/ui/glass-sphere-avatar'

const items = [{ label: 'Profile', href: '/settings/profile', icon: User }, { label: 'Billing', href: '/settings/billing', icon: CreditCard }, { label: 'Team Members', href: '/team', icon: Users }, { label: 'Notifications', href: '/settings', icon: Bell }, { label: 'Security', href: '/settings/profile/mfa', icon: Shield }]
export function UserProfilePopup({ isOpen, onClose, onLogout, user }: { isOpen: boolean; onClose: () => void; onLogout: () => void; user: { avatar?: string | null; email?: string | null; name: string; plan?: string } }) {
  return <AnimatePresence>{isOpen && <><motion.button aria-label="Close profile menu" className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.section role="dialog" aria-label="Account menu" className="fixed bottom-5 left-4 right-4 z-[91] mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#14141e]/90 p-3 text-white shadow-2xl backdrop-blur-3xl" initial={{ opacity: 0, scale: .9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
    <div className="flex items-center gap-3 p-2"><GlassSphereAvatar alt={user.name} src={user.avatar} size={44} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-white/45">{user.email}</p></div><span className="rounded-md border border-indigo-400/25 bg-indigo-500/15 px-2 py-1 text-[10px] text-indigo-200">{user.plan ?? 'Free'}</span><button aria-label="Close profile menu" onClick={onClose}><X className="size-4 text-white/50" /></button></div>
    <div className="border-t border-white/8 pt-1">{items.map(({ icon: Icon, label, href }, index) => <motion.a key={label} href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/70 hover:bg-white/5" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .06 + index * .04 }}><Icon className="size-4" strokeWidth={1.5} />{label}<ChevronRight className="ml-auto size-4 text-white/25" /></motion.a>)}</div>
    <button onClick={onLogout} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-red-300/70 hover:bg-red-500/10"><LogOut className="size-4" strokeWidth={1.5} />Sign Out</button>
  </motion.section></>}</AnimatePresence>
}
