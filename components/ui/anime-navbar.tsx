'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type AnimeNavItem = {
  name: string
  url?: string
  icon: React.ComponentType<any>
}

type AnimeNavBarProps = {
  items: AnimeNavItem[]
  className?: string
  defaultActive?: string
}

export type WorkspaceNavItem = {
  name: string
  icon?: React.ComponentType<any>
}


type WorkspaceNavBarProps = {
  items: WorkspaceNavItem[]
  className?: string
  defaultActive?: string
  activeItem?: string
  onChange?: (name: string) => void
}

type MascotMood = 'soft' | 'cheer' | 'focused' | 'wink'

const indicatorTransition = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
}

export function WorkspaceNavBar({
  items,
  className,
  defaultActive = 'Home',
  activeItem,
  onChange,
}: WorkspaceNavBarProps) {
  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<string>(defaultActive)
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0, opacity: 0 })
  const resolvedActiveTab = activeItem ?? activeTab

  React.useEffect(() => {
    if (activeItem) return
    if (!items.some((item) => item.name === activeTab)) {
      setActiveTab(defaultActive || items[0]?.name || '')
    }
  }, [activeItem, activeTab, defaultActive, items])

  React.useLayoutEffect(() => {
    const syncIndicator = () => {
      const previewTab = hoveredTab ?? resolvedActiveTab
      const node = buttonRefs.current[previewTab]
      if (!node) {
        setIndicatorStyle((current) => ({ ...current, opacity: 0 }))
        return
      }

      setIndicatorStyle({
        left: node.offsetLeft,
        width: node.offsetWidth,
        opacity: 1,
      })
    }

    syncIndicator()
    window.addEventListener('resize', syncIndicator)
    return () => window.removeEventListener('resize', syncIndicator)
  }, [hoveredTab, items, resolvedActiveTab])

  if (!items.length) return null

  return (
    <div className={cn('flex justify-center', className)}>
      <div className="relative inline-flex max-w-full items-center rounded-full border border-white/10 bg-black/26 p-0.5 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 top-0.5 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.065)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_34px_-22px_rgba(0,0,0,0.95),0_0_22px_rgba(94,106,210,0.12)] transition-[transform,width,opacity] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{
            width: indicatorStyle.width,
            opacity: indicatorStyle.opacity,
            transform: `translate3d(${indicatorStyle.left}px,0,0)`,
            willChange: 'transform,width,opacity',
          }}
        />

        {items.map((item) => {
          const Icon = item.icon
          const isActive = (hoveredTab ?? resolvedActiveTab) === item.name

          return (
            <button
              key={item.name}
              ref={(node) => {
                buttonRefs.current[item.name] = node
              }}
              type="button"
              data-workspace-tab={item.name}
              onClick={() => {
                if (!activeItem) {
                  setActiveTab(item.name)
                }
                onChange?.(item.name)
              }}
              onMouseEnter={() => setHoveredTab(item.name)}
              onMouseLeave={() => setHoveredTab(null)}
              aria-pressed={resolvedActiveTab === item.name}
              className={cn(
                'focus-ring-glow relative z-10 inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-[-0.01em] transition-colors duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-4.5',
                isActive ? 'text-white' : 'text-white/56 hover:text-white/82',
              )}
            >
              {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
              <span className="select-none whitespace-nowrap antialiased">{item.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AnimeNavBar({ items, className, defaultActive = 'Home' }: AnimeNavBarProps) {
  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<string>(defaultActive)
  const navId = React.useId()

  React.useEffect(() => {
    if (!items.some((item) => item.name === activeTab)) {
      setActiveTab(defaultActive || items[0]?.name || '')
    }
  }, [activeTab, defaultActive, items])

  if (!items.length) return null

  const previewTab = hoveredTab ?? activeTab
  const previewIndex = Math.max(items.findIndex((item) => item.name === previewTab), 0)
  const previewMood = getMascotMood(previewIndex, hoveredTab !== null)

  return (
    <div className={cn('flex justify-center', className)}>
      <motion.div
        className="relative flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-1.5 py-1.5 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.92)] backdrop-blur-lg"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%)]" />

        {items.map((item) => {
          const Icon = item.icon
          const isPreviewActive = previewTab === item.name

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => setActiveTab(item.name)}
              onMouseEnter={() => setHoveredTab(item.name)}
              onMouseLeave={() => setHoveredTab(null)}
              className={cn(
                'relative min-w-[84px] cursor-pointer rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-300 sm:min-w-[96px]',
                'sm:min-w-[88px] sm:px-4 sm:py-2.5 sm:text-[13px]',
                'min-w-[70px] px-3 py-2 text-[12px]',
                isPreviewActive ? 'text-white' : 'text-white/68 hover:text-white/88',
              )}
            >
              {isPreviewActive ? (
                <>
                    <motion.div
                      layoutId={`${navId}-active-pill`}
                      transition={indicatorTransition}
                      className="absolute inset-0 -z-10 overflow-hidden rounded-full"
                    >
                    <div className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(64,64,69,0.98)_0%,rgba(40,40,45,0.98)_100%)]" />
                    <div className="absolute inset-0 rounded-full border border-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_22px_-12px_rgba(0,0,0,0.9)]" />
                    <div className="absolute inset-[-8px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,transparent_68%)] blur-2xl" />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
                      style={{
                        animation: 'shine 3s ease-in-out infinite',
                      }}
                    />
                  </motion.div>

                  <motion.div
                    layoutId={`${navId}-anime-mascot`}
                    className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2"
                    initial={false}
                    transition={indicatorTransition}
                  >
                    <MascotFace mood={previewMood} isHovering={hoveredTab !== null} />
                  </motion.div>
                </>
              ) : null}

              <motion.span
                className="relative z-10 hidden md:inline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {item.name}
              </motion.span>
              <motion.span className="relative z-10 md:hidden" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                <Icon size={18} strokeWidth={2.5} />
              </motion.span>
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}

function MascotFace({ mood, isHovering }: { mood: MascotMood; isHovering: boolean }) {
  return (
    <div className="relative h-12 w-12">
      <motion.div
        className="absolute left-1/2 h-10 w-10 -translate-x-1/2 rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.18)]"
        animate={
          isHovering
            ? {
                scale: 1.04,
                y: -1,
                rotate: mood === 'wink' ? -4 : mood === 'focused' ? 1 : 0,
                transition: {
                  duration: 0.24,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
            : {
                y: [0, -3, 0],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }
        }
      >
        <motion.div
          className="absolute h-2 w-2 rounded-full bg-black"
          animate={
            mood === 'focused'
              ? { scaleX: 1.25, scaleY: 0.55 }
              : mood === 'wink'
                ? { scaleY: [1, 0.2, 1], transition: { duration: 0.32, repeat: Infinity, repeatDelay: 1.2 } }
                : { scaleY: 1 }
          }
          style={{ left: '25%', top: '40%' }}
        />
        <motion.div
          className="absolute h-2 w-2 rounded-full bg-black"
          animate={
            mood === 'cheer'
              ? { scale: [1, 1.08, 1], transition: { duration: 0.45, repeat: Infinity, repeatDelay: 0.8 } }
              : mood === 'focused'
                ? { scaleX: 1.25, scaleY: 0.55 }
                : { scaleY: 1 }
          }
          style={{ right: '25%', top: '40%' }}
        />
        <motion.div
          className="absolute h-1.5 w-2 rounded-full bg-pink-300"
          animate={{ opacity: mood === 'cheer' ? 0.92 : 0.65, scale: mood === 'cheer' ? 1.1 : 1 }}
          style={{ left: '15%', top: '55%' }}
        />
        <motion.div
          className="absolute h-1.5 w-2 rounded-full bg-pink-300"
          animate={{ opacity: mood === 'cheer' ? 0.92 : 0.65, scale: mood === 'cheer' ? 1.1 : 1 }}
          style={{ right: '15%', top: '55%' }}
        />

        <motion.div
          className="absolute left-[30%] top-[60%] h-2 w-4 rounded-full border-b-2 border-black"
          animate={
            mood === 'soft'
              ? { scaleY: 1, y: 0 }
              : mood === 'cheer'
                ? { scaleY: 1.6, y: -1 }
                : mood === 'focused'
                  ? { scaleY: 0.7, y: 0 }
                  : { scaleY: 1.2, y: -0.5, rotate: -8 }
          }
        />

        <AnimatePresence>
          {mood === 'cheer' ? (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#ffd76d] shadow-[0_0_10px_rgba(255,215,109,0.75)]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ delay: 0.08 }}
                className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-[#ffd76d] shadow-[0_0_10px_rgba(255,215,109,0.75)]"
              />
            </>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="absolute -bottom-1 left-1/2 h-4 w-4 -translate-x-1/2"
        animate={
          isHovering
            ? {
                y: -2,
                transition: {
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
            : {
                y: [0, 2, 0],
                transition: {
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                },
              }
        }
      >
        <div className="h-full w-full rotate-45 bg-white" />
      </motion.div>
    </div>
  )
}

function getMascotMood(index: number, hovering: boolean): MascotMood {
  if (!hovering) return 'soft'

  const moods: MascotMood[] = ['soft', 'cheer', 'focused', 'wink']
  return moods[index % moods.length] ?? 'soft'
}
