'use client'

import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

export function GlassSphereAvatar({
  alt,
  className,
  fallback,
  size = 40,
  src,
}: {
  alt: string
  className?: string
  fallback?: string
  size?: number
  src?: string | null
}) {
  const initial = fallback || alt.trim().charAt(0).toUpperCase() || 'P'

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={cn('relative shrink-0 rounded-full', className)} style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%,rgba(255,255,255,0.25),transparent 40%),radial-gradient(circle at 50% 50%,rgba(120,140,200,0.15),transparent 60%),radial-gradient(circle at 70% 70%,rgba(80,100,180,0.2),transparent 50%)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)' }} />
      <span className="absolute inset-[2px] overflow-hidden rounded-full bg-gradient-to-br from-white/10 to-white/5">
        {src ? <img src={src} alt={alt} className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-sm font-medium text-white/65">{initial}</span>}
      </span>
      <span className="pointer-events-none absolute left-[15%] top-[8%] h-[20%] w-[35%] rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,0.3),transparent_70%)] blur-[1px]" />
    </motion.div>
  )
}
