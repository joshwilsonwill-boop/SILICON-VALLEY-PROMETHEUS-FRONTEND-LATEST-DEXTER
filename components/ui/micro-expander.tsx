'use client'

import * as React from 'react'
import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  type Variants,
} from 'motion/react'
import { Plus } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'

type MicroExpanderVariant = 'default' | 'outline' | 'ghost' | 'destructive'

export interface MicroExpanderProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  text: string
  icon?: React.ReactNode
  variant?: MicroExpanderVariant
  isLoading?: boolean
}

const containerVariants: Variants = {
  initial: { width: 48 },
  hover: { width: 'auto' },
  loading: { width: 48 },
}

const textVariants: Variants = {
  initial: { opacity: 0, x: -8 },
  hover: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.12, duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -5,
    transition: { duration: 0.1, ease: 'linear' },
  },
}

const variantClassNames: Record<MicroExpanderVariant, string> = {
  default: 'border-white/10 bg-white text-black shadow-[0_18px_38px_-24px_rgba(255,255,255,0.72)]',
  outline: 'border-white/12 bg-black/20 text-white/76 hover:border-white/22 hover:bg-white/[0.05] hover:text-white',
  ghost: 'border-white/8 bg-white/[0.035] text-white/66 hover:border-white/14 hover:bg-white/[0.07] hover:text-white',
  destructive: 'border-rose-300/18 bg-rose-500/18 text-rose-50 hover:bg-rose-500/24',
}

export const MicroExpander = React.forwardRef<HTMLButtonElement, MicroExpanderProps>(
  (
    {
      text,
      icon,
      variant = 'ghost',
      isLoading = false,
      className,
      onClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    ref,
    ) => {
    const [isHovered, setIsHovered] = React.useState(false)
    const satellites = React.useMemo(
      () => [
        { key: 'north', className: '-top-1 left-1/2 -translate-x-1/2' },
        { key: 'west', className: 'left-0 top-1/2 -translate-y-1/2' },
        { key: 'east', className: 'right-0 top-1/2 -translate-y-1/2' },
      ],
      [],
    )

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isLoading) return
        onClick?.(event)
      },
      [isLoading, onClick],
    )

    return (
      <motion.button
        ref={ref}
        type="button"
        data-slot="micro-expander"
        aria-label={text}
        disabled={isLoading}
        initial="initial"
        animate={isLoading ? 'loading' : isHovered ? 'hover' : 'initial'}
        variants={containerVariants}
        transition={{ type: 'spring', stiffness: 170, damping: 21, mass: 0.82 }}
        className={cn(
          'relative inline-flex h-12 items-center overflow-hidden rounded-full border',
          'whitespace-nowrap text-sm font-medium tracking-[0.01em]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/24',
          isLoading && 'cursor-not-allowed',
          variantClassNames[variant],
          className,
        )}
        onMouseEnter={(event) => {
          setIsHovered(true)
          onMouseEnter?.(event)
        }}
        onMouseLeave={(event) => {
          setIsHovered(false)
          onMouseLeave?.(event)
        }}
        onFocus={(event) => {
          setIsHovered(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsHovered(false)
          onBlur?.(event)
        }}
        onClick={handleClick}
        {...props}
      >
        <AnimatePresence initial={false}>
          {!isLoading && isHovered ? (
            <>
              {satellites.map((satellite, index) => (
                <motion.span
                  key={satellite.key}
                  initial={{ opacity: 0, scale: 0.55, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.55, filter: 'blur(8px)' }}
                  transition={{
                    delay: 0.03 * index,
                    duration: 0.22,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={cn(
                    'absolute z-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/16 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_24%,rgba(14,16,24,0.96)_100%)] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.95),0_0_18px_-16px_rgba(150,225,255,0.65)]',
                    satellite.className,
                  )}
                  aria-hidden="true"
                >
                  <span className="flex items-center gap-[3px]">
                    <span className="h-1 w-1 rounded-full bg-white/90" />
                    <span className="h-1 w-1 rounded-full bg-white/90" />
                  </span>
                </motion.span>
              ))}
            </>
          ) : null}
        </AnimatePresence>
        <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              <motion.span
                key="loading-animation"
                initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18 }}
              >
                <InlineLoadingAnimation size={20} label={`${text} in progress`} />
              </motion.span>
            ) : (
              <motion.span
                key="icon"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}
              >
                {icon ?? <Plus className="size-5" />}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <AnimatePresence initial={false}>
          {!isLoading && isHovered ? (
            <motion.span
              key="text"
              variants={textVariants}
              initial="initial"
              animate="hover"
              exit="exit"
              className="relative z-10 pr-5 text-[13px]"
            >
              {text}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>
    )
  },
)

MicroExpander.displayName = 'MicroExpander'
