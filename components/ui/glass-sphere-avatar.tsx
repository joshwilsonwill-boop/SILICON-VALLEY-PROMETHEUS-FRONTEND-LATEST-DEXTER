'use client'

import { cn } from '@/lib/utils'

export function GlassSphereAvatar({ alt, className, fallback, size = 40, src }: { alt: string; className?: string; fallback?: string; size?: number; src?: string | null }) {
  return <span className={cn('relative block shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_24%,rgba(255,255,255,.32),transparent_28%),radial-gradient(circle_at_70%_78%,rgba(99,102,241,.3),transparent_58%)] p-[2px] shadow-[inset_0_1px_2px_rgba(255,255,255,.2),0_3px_12px_rgba(0,0,0,.35)]', className)} style={{ width: size, height: size }}>
    <span className="grid size-full overflow-hidden rounded-full bg-white/[0.07] text-center text-sm font-medium leading-none text-white/75">{src ? <img src={src} alt={alt} className="size-full object-cover" /> : <span className="grid size-full place-items-center">{fallback ?? alt.charAt(0).toUpperCase()}</span>}</span>
    <span aria-hidden className="pointer-events-none absolute left-[18%] top-[11%] h-[23%] w-[36%] rounded-full bg-white/25 blur-[1px]" />
  </span>
}
