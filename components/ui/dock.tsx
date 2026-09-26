'use client'

import * as React from 'react'
import {
  motion,
  type MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion'
import { cn } from '@/lib/utils'

const DOCK_HEIGHT = 128
const DEFAULT_MAGNIFICATION = 68
const DEFAULT_DISTANCE = 140
const DEFAULT_PANEL_HEIGHT = 56

export type DockProps = {
  children: React.ReactNode
  className?: string
  outerClassName?: string
  distance?: number
  panelHeight?: number
  magnification?: number
  spring?: SpringOptions
}

export type DockItemProps = {
  className?: string
  children: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
  tabIndex?: number
  role?: string
  'aria-label'?: string
  'aria-checked'?: boolean
  'data-action'?: string
  'data-autonomous-target'?: string
  title?: string
}

export type DockLabelProps = {
  className?: string
  children: React.ReactNode
}

export type DockIconProps = {
  className?: string
  children: React.ReactNode
}

type DockContextType = {
  mouseX: MotionValue<number>
  spring: SpringOptions
  magnification: number
  distance: number
}

type DockProviderProps = {
  children: React.ReactNode
  value: DockContextType
}

const DockContext = React.createContext<DockContextType | undefined>(undefined)

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>
}

export function useDock() {
  const context = React.useContext(DockContext)
  if (!context) {
    throw new Error('useDock must be used within a DockProvider')
  }
  return context
}

export function Dock({
  children,
  className,
  outerClassName,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const mouseX = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)

  const maxHeight = React.useMemo(() => {
    return Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4)
  }, [magnification])

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight])
  const height = useSpring(heightRow, spring)

  return (
    <motion.div
      style={{
        height: height,
        scrollbarWidth: 'none',
      }}
      className={cn('mx-auto flex max-w-full items-end overflow-visible', outerClassName)}
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1)
          mouseX.set(pageX)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mouseX.set(Infinity)
        }}
        className={cn(
          'mx-auto flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-md',
          className,
        )}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        <DockProvider value={{ mouseX, spring, distance, magnification }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  )
}

export function DockItem({
  children,
  className,
  onClick,
  onKeyDown,
  role = 'button',
  tabIndex = 0,
  ...props
}: DockItemProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  const { distance, magnification, mouseX, spring } = useDock()

  const isHovered = useMotionValue(0)

  const mouseDistance = useTransform(mouseX, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - domRect.x - domRect.width / 2
  })

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [38, magnification, 38],
  )

  const width = useSpring(widthTransform, spring)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if ((event.key === 'Enter' || event.key === ' ') && onClick) {
      event.preventDefault()
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>)
    }
  }

  return (
    <motion.div
      ref={ref}
      style={{ width, height: width }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role={role}
      className={cn(
        'relative inline-flex aspect-square shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-150',
        className,
      )}
      {...props}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ width?: MotionValue<number>; isHovered?: MotionValue<number> }>, {
              width,
              isHovered,
            })
          : child,
      )}
    </motion.div>
  )
}

export function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>
  const isHovered = restProps['isHovered'] as MotionValue<number> | undefined
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (!isHovered) return
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1)
    })

    return () => unsubscribe()
  }, [isHovered])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'pointer-events-none absolute -top-8 left-1/2 z-50 w-fit whitespace-nowrap rounded-md border border-white/12 bg-[#090d12]/95 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md',
            className,
          )}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>
  const width = restProps['width'] as MotionValue<number> | undefined

  const fallbackWidth = useMotionValue(38)
  const widthTransform = useTransform(width ?? fallbackWidth, (val) => Math.max(16, val * 0.46))

  return (
    <motion.div
      style={{ width: widthTransform, height: widthTransform }}
      className={cn('flex items-center justify-center pointer-events-none', className)}
    >
      {children}
    </motion.div>
  )
}
