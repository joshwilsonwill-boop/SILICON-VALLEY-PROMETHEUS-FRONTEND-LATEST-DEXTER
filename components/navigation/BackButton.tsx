'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'

interface BackButtonProps {
  className?: string
  fallbackHref?: string
  onClick?: () => void
}

export function BackButton({ className, fallbackHref = '/studio', onClick }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onClick) {
      onClick()
      return
    }
    const historyIndex = (window.history.state as { idx?: unknown } | null)?.idx
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#94a3b8] transition-all duration-200 hover:bg-white/[0.05] hover:text-[#f8fafc] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prometheus-accent-purple/70',
        className,
      )}
      aria-label="Go back"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
    </button>
  )
}
