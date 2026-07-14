'use client'

import * as React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

type DodoCheckoutButtonProps = {
  ctaLabel: string
  className?: string
  disabled?: boolean
  featured?: boolean
  onClick: () => void
}

export function DodoCheckoutButton({
  ctaLabel,
  className,
  disabled,
  featured = false,
  onClick,
}: DodoCheckoutButtonProps) {
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className="w-full"
    >
      <Button
        size="lg"
        disabled={disabled}
        className={cn(
          className,
          'relative min-h-12 w-full overflow-hidden rounded-2xl px-6 text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40',
          !disabled
            ? featured
              ? 'border-blue-300/45 bg-[linear-gradient(135deg,#60a5fa_0%,#2563eb_55%,#1d4ed8_100%)] text-white shadow-[0_16px_36px_-18px_rgba(59,130,246,0.95),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 hover:shadow-[0_18px_42px_-18px_rgba(59,130,246,1)]'
              : 'border-white/30 bg-white text-black shadow-lg shadow-white/5 hover:scale-[1.02] hover:bg-white/90'
            : 'bg-white/5 text-white/20 border-white/5 shadow-none opacity-50',
          'border active:scale-[0.98]',
        )}
        onClick={onClick}
      >
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-inherit">
          <motion.div
            animate={{
              translateX: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
              delay: 1,
            }}
            className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] skew-x-[-20deg]"
          />
        </div>

        <div className="relative z-10 flex items-center justify-center gap-2">
          <span>{ctaLabel}</span>
          <motion.div
            initial={{ x: 0, y: 0 }}
            whileHover={{ x: 2, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <ArrowUpRight className="size-4" />
          </motion.div>
        </div>
      </Button>
    </motion.div>
  )
}
