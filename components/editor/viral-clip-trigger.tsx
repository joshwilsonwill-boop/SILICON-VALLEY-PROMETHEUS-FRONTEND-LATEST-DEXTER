'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Scissors } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { cn } from '@/lib/utils'

interface ViralClipTriggerProps {
  active?: boolean
  processing?: boolean
  disabled?: boolean
  className?: string
  onLockedHoverChange?: (hovered: boolean) => void
  onActivate: () => void
}

const CONTROL_FONT_STYLE = {
  fontFamily:
    '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif',
} satisfies React.CSSProperties

export function ViralClipTrigger({
  active = false,
  processing = false,
  disabled = false,
  className,
  onLockedHoverChange,
  onActivate,
}: ViralClipTriggerProps) {
  const reduceMotion = useStableReducedMotion()
  const [isHovered, setIsHovered] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [magneticOffset, setMagneticOffset] = React.useState({ x: 0, y: 0 })
  const isLocked = active || processing || disabled
  const isInteractiveHover = (isHovered || isFocused) && !isLocked
  const isExpanded = isInteractiveHover || isLocked

  React.useEffect(() => {
    if (!isLocked) {
      onLockedHoverChange?.(false)
    }
  }, [isLocked, onLockedHoverChange])

  const handlePointerEnter = React.useCallback(() => {
    setIsHovered(true)
    if (isLocked) {
      onLockedHoverChange?.(true)
    }
  }, [isLocked, onLockedHoverChange])

  const handlePointerLeave = React.useCallback(() => {
    setIsHovered(false)
    setMagneticOffset({ x: 0, y: 0 })
    onLockedHoverChange?.(false)
  }, [onLockedHoverChange])

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion || isLocked) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8
    setMagneticOffset({ x, y })
  }, [isLocked, reduceMotion])

  const handleFocus = React.useCallback(() => {
    setIsFocused(true)
    if (isLocked) {
      onLockedHoverChange?.(true)
    }
  }, [isLocked, onLockedHoverChange])

  const handleBlur = React.useCallback(() => {
    setIsFocused(false)
    setMagneticOffset({ x: 0, y: 0 })
    onLockedHoverChange?.(false)
  }, [onLockedHoverChange])

  return (
    <motion.button
      type="button"
      aria-label="Clip long-form content into viral cuts"
      aria-pressed={active}
      aria-disabled={isLocked}
      tabIndex={isLocked ? -1 : 0}
      onClick={isLocked ? undefined : onActivate}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        'group relative inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full border bg-black text-left backdrop-blur-xl transition-opacity',
        isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
        isLocked ? 'border-white/14 text-white/84 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.82)]' : 'border-white/10 text-white/88 shadow-[0_18px_38px_-28px_rgba(0,0,0,0.9)]',
        className,
      )}
      style={CONTROL_FONT_STYLE}
      initial={false}
      animate={
        reduceMotion
          ? undefined
          : {
              x: magneticOffset.x,
              y: magneticOffset.y,
              width: isExpanded ? 122 : 40,
              boxShadow: processing
                ? '0 22px 42px -30px rgba(0,0,0,0.88), 0 0 0 1px rgba(255,255,255,0.12)'
                : active
                  ? '0 20px 36px -30px rgba(0,0,0,0.84), 0 0 0 1px rgba(255,255,255,0.1)'
                  : isInteractiveHover
                    ? '0 22px 42px -28px rgba(0,0,0,0.98), 0 0 26px -16px rgba(156,134,255,0.58), 0 0 0 1px rgba(156,134,255,0.2)'
                  : '0 18px 38px -28px rgba(0,0,0,0.9)',
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              type: 'spring',
              stiffness: 280,
              damping: 26,
              mass: 0.8,
            }
      }
      whileTap={reduceMotion || isLocked ? undefined : { scale: 0.985 }}
    >
      <span
        className={cn(
          'absolute inset-0 rounded-full',
          isLocked
            ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_28%,rgba(17,18,24,0.92)_64%,rgba(10,10,14,0.96)_100%)]'
            : isInteractiveHover
              ? 'bg-[linear-gradient(135deg,rgba(156,134,255,0.18)_0%,rgba(255,255,255,0.08)_24%,rgba(0,0,0,1)_70%,rgba(0,0,0,1)_100%)]'
            : 'bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(10,10,14,0.98)_36%,rgba(0,0,0,1)_100%)]',
        )}
      />
      <span
        className={cn(
          'absolute inset-0 rounded-full',
          isLocked
            ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_44%),radial-gradient(circle_at_120%_120%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_48%)]'
            : isInteractiveHover
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(162,220,255,0.28)_0%,rgba(162,220,255,0)_42%),radial-gradient(circle_at_120%_120%,rgba(56,124,255,0.18)_0%,rgba(56,124,255,0)_48%)]'
            : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_42%),radial-gradient(circle_at_120%_120%,rgba(127,242,212,0.18)_0%,rgba(127,242,212,0)_46%)]',
        )}
      />
      {!processing ? (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-[-28%] w-[44%] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.28)_52%,rgba(255,255,255,0)_100%)] blur-md"
          animate={reduceMotion ? undefined : {
            x: isExpanded ? ['0%', '180%'] : ['0%', '110%'],
            opacity: isExpanded ? [0.1, 0.2, 0.12] : 0.08,
          }}
          transition={reduceMotion ? undefined : {
            duration: 2.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
      ) : null}
      <span className="pointer-events-none absolute inset-0 rounded-full border border-white/10 transition-colors duration-300 group-hover:border-[#9c86ff]/24" />

      <span className="relative z-[1] inline-flex h-full items-center">
        <motion.span
          className={cn(
            'ml-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white/88',
            isLocked && 'border-white/14 bg-white/[0.08] text-white/90',
          )}
          animate={reduceMotion || processing ? undefined : {
            scale: isHovered || isFocused ? [1, 1.02, 1] : 1,
            y: isHovered || isFocused ? [0, -0.6, 0] : 0,
          }}
          transition={{
            duration: 1.8,
            repeat: reduceMotion ? 0 : Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        >
          {processing ? (
            <InlineLoadingAnimation size={18} label="Creating viral clips" />
          ) : (
            <motion.span
              animate={reduceMotion ? undefined : isHovered || isFocused ? { rotate: [0, -8, 6, 0] } : { rotate: 0 }}
              transition={{
                duration: 1.35,
                repeat: reduceMotion || !isExpanded ? 0 : Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }}
            >
              <Scissors className="size-3.5" />
            </motion.span>
          )}
        </motion.span>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.span
              key="clip-copy"
              initial={reduceMotion ? false : { opacity: 0, x: -8, filter: 'blur(10px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -8, filter: 'blur(8px)' }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-w-0 items-center pl-2 pr-3"
            >
              <span className="truncate text-[10px] font-medium tracking-[0.16em] text-white/92">
                {processing ? 'Clipping' : 'Quick Clip'}
              </span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
    </motion.button>
  )
}
