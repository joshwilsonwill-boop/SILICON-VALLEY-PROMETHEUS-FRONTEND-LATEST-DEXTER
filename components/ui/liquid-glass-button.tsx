'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function LiquidGlassButton({ ariaControls = 'prometheus-mobile-nav-drawer', className, isOpen, onToggle }: { ariaControls?: string; className?: string; isOpen: boolean; onToggle: () => void }) {
  return <motion.button type="button" aria-controls={ariaControls} aria-expanded={isOpen} aria-label={isOpen ? 'Close mobile navigation' : 'Open mobile navigation'} onClick={onToggle} whileTap={{ scale: 0.92 }} className={cn('relative z-50 grid size-11 place-items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/75 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl md:hidden', className)}>
    <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(255,255,255,0.1),transparent_55%),radial-gradient(ellipse_60%_40%_at_70%_80%,rgba(99,102,241,0.08),transparent_50%)]" />
    <span className="relative flex w-5 flex-col gap-[5px]"><motion.span animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 7 : 0 }} className="h-[1.5px] w-full rounded-full bg-current" /><motion.span animate={{ opacity: isOpen ? 0 : 1, scaleX: isOpen ? 0 : 1 }} className="h-[1.5px] w-full rounded-full bg-current" /><motion.span animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -7 : 0 }} className="h-[1.5px] w-full rounded-full bg-current" /></span>
  </motion.button>
}
