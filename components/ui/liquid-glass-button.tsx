'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface LiquidGlassButtonProps {
  'aria-expanded'?: boolean
  'aria-label'?: string
  className?: string
  disabled?: boolean
  isOpen: boolean
  onClick: () => void
}

export const LiquidGlassButton = React.forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(function LiquidGlassButton(
  { className, isOpen, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      aria-expanded={props['aria-expanded']}
      aria-label={props['aria-label']}
      disabled={props.disabled}
      onClick={props.onClick}
      type="button"
      whileTap={{ scale: 0.92 }}
      className={cn('relative isolate flex size-11 items-center justify-center overflow-hidden rounded-2xl', className)}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)',
      }}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(255,255,255,0.1),transparent_55%),radial-gradient(ellipse_60%_40%_at_70%_80%,rgba(99,102,241,0.08),transparent_50%)]" />
      <span className="relative flex w-5 flex-col gap-[5px]" aria-hidden="true">
        <motion.span animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 8 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="block h-[1.5px] w-full rounded-full bg-white/70" />
        <motion.span animate={{ opacity: isOpen ? 0 : 1, scaleX: isOpen ? 0 : 1 }} transition={{ duration: 0.2 }} className="block h-[1.5px] w-full rounded-full bg-white/70" />
        <motion.span animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -8 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="block h-[1.5px] w-full rounded-full bg-white/70" />
      </span>
    </motion.button>
  )
})
