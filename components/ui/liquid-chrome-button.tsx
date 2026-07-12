'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  getMagneticTarget,
  getRippleOrigin,
  getSheenPosition,
  lerpPoint,
  type Point,
} from '@/lib/ui/liquid-chrome'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface LiquidChromeButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  success?: boolean
  magnetic?: boolean
  liquid?: boolean
  ripple?: boolean
  disabledTooltip?: string
}

type RippleState = { id: number; x: number; y: number }

const SIZE_CLASS_MAP: Record<ButtonSize, React.ComponentProps<typeof Button>['size']> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
}

const VARIANT_CLASS_MAP: Record<ButtonVariant, React.ComponentProps<typeof Button>['variant']> = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
}

function variantBaseClasses(variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return 'border-white/12 bg-white/[0.08] text-white'
    case 'ghost':
      return 'border-white/8 bg-transparent text-white/78'
    default:
      return 'border-white/14 bg-[#111214] text-white'
  }
}

function sheenOverlayForVariant(variant: ButtonVariant, sheenPosition: Point) {
  const rippleColor =
    variant === 'secondary'
      ? 'rgba(255,255,255,0.18)'
      : variant === 'ghost'
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(255,255,255,0.15)'

  return `radial-gradient(circle at ${sheenPosition.x}% ${sheenPosition.y}%, ${rippleColor} 0%, rgba(255,255,255,0) 52%)`
}

export function LiquidChromeButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  magnetic = true,
  liquid = true,
  ripple = true,
  className,
  children,
  disabled,
  disabledTooltip,
  asChild,
  onClick,
  onMouseMove,
  onMouseLeave,
  onMouseEnter,
  onMouseDown,
  onMouseUp,
  title,
  ...props
}: LiquidChromeButtonProps) {
  const containerRef = React.useRef<HTMLSpanElement | null>(null)
  const frameRef = React.useRef<number | null>(null)
  const offsetRef = React.useRef<Point>({ x: 0, y: 0 })
  const targetOffsetRef = React.useRef<Point>({ x: 0, y: 0 })
  const [mounted, setMounted] = React.useState(false)
  const [sheenPosition, setSheenPosition] = React.useState<Point>({ x: 50, y: 50 })
  const [magneticOffset, setMagneticOffset] = React.useState<Point>({ x: 0, y: 0 })
  const [ripples, setRipples] = React.useState<RippleState[]>([])
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    setMounted(true)
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const stopFrame = React.useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const startMagneticAnimation = React.useCallback(() => {
    if (frameRef.current || reduceMotion) return

    const tick = () => {
      offsetRef.current = lerpPoint(offsetRef.current, targetOffsetRef.current)
      setMagneticOffset(offsetRef.current)

      if (
        Math.abs(offsetRef.current.x - targetOffsetRef.current.x) < 0.05 &&
        Math.abs(offsetRef.current.y - targetOffsetRef.current.y) < 0.05 &&
        Math.abs(targetOffsetRef.current.x) < 0.05 &&
        Math.abs(targetOffsetRef.current.y) < 0.05
      ) {
        offsetRef.current = { x: 0, y: 0 }
        setMagneticOffset({ x: 0, y: 0 })
        stopFrame()
        return
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [reduceMotion, stopFrame])

  const fallbackTitle = disabled && disabledTooltip ? disabledTooltip : title

  if (!mounted) {
    return (
      <Button
        variant={VARIANT_CLASS_MAP[variant]}
        size={SIZE_CLASS_MAP[size]}
        className={className}
        disabled={disabled || loading}
        title={fallbackTitle}
        asChild={asChild}
        {...props}
      >
        {loading ? <InlineLoadingAnimation size={16} label="Loading" /> : null}
        {children}
      </Button>
    )
  }

  return (
    <span ref={containerRef} className="inline-flex">
      <Button
        data-cursor="pointer"
        variant={VARIANT_CLASS_MAP[variant]}
        size={SIZE_CLASS_MAP[size]}
        disabled={disabled || loading}
        title={fallbackTitle}
        asChild={false}
        onMouseEnter={(event) => {
          setIsHovered(true)
          onMouseEnter?.(event)
        }}
        onMouseMove={(event) => {
          const container = containerRef.current
          if (!container) return

          if (liquid) {
            setSheenPosition(
              getSheenPosition({
                clientX: event.clientX,
                clientY: event.clientY,
                rect: container.getBoundingClientRect(),
              }),
            )
          }

          if (magnetic && !disabled && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
            targetOffsetRef.current = getMagneticTarget({
              clientX: event.clientX,
              clientY: event.clientY,
              rect: container.getBoundingClientRect(),
            })
            startMagneticAnimation()
          }

          onMouseMove?.(event)
        }}
        onMouseLeave={(event) => {
          setIsHovered(false)
          setSheenPosition({ x: 50, y: 50 })
          targetOffsetRef.current = { x: 0, y: 0 }
          startMagneticAnimation()
          onMouseLeave?.(event)
        }}
        onMouseDown={(event) => {
          setIsPressed(true)
          onMouseDown?.(event)
        }}
        onMouseUp={(event) => {
          setIsPressed(false)
          onMouseUp?.(event)
        }}
        onClick={(event) => {
          if (ripple && containerRef.current && !reduceMotion) {
            const nextRipple = {
              id: Date.now(),
              ...getRippleOrigin({
                clientX: event.clientX,
                clientY: event.clientY,
                rect: containerRef.current.getBoundingClientRect(),
              }),
            }
            setRipples((current) => [...current, nextRipple])
            window.setTimeout(() => {
              setRipples((current) => current.filter((rippleState) => rippleState.id !== nextRipple.id))
            }, 600)
          }
          onClick?.(event)
        }}
        className={cn(
          'group relative overflow-hidden rounded-[18px] border transition-[transform,background,box-shadow,filter,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-0',
          'focus-visible:shadow-[0_0_0_3px_rgba(var(--theme-accent-rgb,56,189,248),0.30)]',
          variantBaseClasses(variant),
          disabled && 'cursor-not-allowed grayscale-[0.4] opacity-50',
          isHovered && !disabled && !reduceMotion && '-translate-y-px',
          className,
        )}
        style={{
          backgroundImage: liquid ? sheenOverlayForVariant(variant, sheenPosition) : undefined,
          transform: `${magnetic ? `translate(${magneticOffset.x}px, ${magneticOffset.y}px)` : ''} ${isPressed ? 'scale(0.98)' : 'scale(1)'}`.trim(),
        }}
        {...props}
      >
        {ripples.map((rippleState) => (
          <span
            key={rippleState.id}
            className="pointer-events-none absolute animate-ripple rounded-full bg-white/30"
            style={{
              left: rippleState.x,
              top: rippleState.y,
              width: 4,
              height: 4,
              marginLeft: -2,
              marginTop: -2,
            }}
          />
        ))}

        <span className={cn('relative z-10 flex items-center gap-2', loading && 'opacity-0', success && !loading && 'opacity-0')}>
          {children}
        </span>

        {loading ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center">
            <InlineLoadingAnimation size={16} label="Loading" />
          </span>
        ) : null}

        {success && !loading ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center animate-success-pop">
            <Check className="h-4 w-4 text-emerald-400" />
          </span>
        ) : null}
      </Button>
    </span>
  )
}
