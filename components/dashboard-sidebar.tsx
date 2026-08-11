'use client'

import type { ComponentType } from 'react'
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronsLeft, ChevronsRight, LayoutDashboard } from 'lucide-react'

import { rememberCurrentPathForEditorReturn } from '@/lib/editor-navigation'
import { getMostRecentProject, PROJECTS_UPDATED_EVENT } from '@/lib/mock'
import { cn } from '@/lib/utils'
import { prometheusNavItems } from '@/lib/navigation'

interface MenuItem {
  key: string
  label: string
  href: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

interface BladeMetrics {
  top: number
  height: number
}

interface BladeNavGroupProps {
  items: MenuItem[]
  activeHref: string | null
  hoveredHref: string | null
  onHoverChange: (href: string | null) => void
  onRouteIntent: (href: string) => void
  collapsed: boolean
}

interface ActiveBladeProps {
  top: number
  height: number
  transition: { duration: number } | { type: 'spring'; stiffness: number; damping: number; mass: number }
}

interface NavItemProps extends Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'> {
  item: MenuItem
  isCurrent: boolean
  isSelected: boolean
  collapsed: boolean
}

const BASE_MENU_ITEMS: MenuItem[] = [
  { key: 'studio', label: 'Studio', href: '/studio', icon: LayoutDashboard },
  ...prometheusNavItems,
]

const ACTIVE_CUTOUT_COLOR = '#0f0b17'
const SIDEBAR_EXPANDED_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 72
const COLLAPSE_CONTENT_TRANSITION = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1] as const,
}
const BLADE_TRANSITION = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 34,
  mass: 0.84,
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [editorHref, setEditorHref] = useState(() => (pathname.startsWith('/editor/') ? pathname : '/editor'))

  useEffect(() => {
    const syncEditorHref = () => {
      const mostRecentProject = getMostRecentProject()
      setEditorHref(pathname.startsWith('/editor/') ? pathname : mostRecentProject ? `/editor/${mostRecentProject.id}` : '/editor')
    }

    syncEditorHref()

    window.addEventListener(PROJECTS_UPDATED_EVENT, syncEditorHref)
    window.addEventListener('storage', syncEditorHref)

    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, syncEditorHref)
      window.removeEventListener('storage', syncEditorHref)
    }
  }, [pathname])

  const menuItems = useMemo(
    () =>
      BASE_MENU_ITEMS.map((item) =>
        item.key === 'editor'
          ? {
              ...item,
              href: editorHref,
            }
          : item,
      ),
    [editorHref],
  )

  const activeHref = useMemo(() => {
    return menuItems.find((item) => isPathActive(pathname, item.href))?.href ?? null
  }, [menuItems, pathname])

  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        marginRight: 0,
      }}
      transition={{
        width: {
          duration: 0.34,
          ease: [0.22, 1, 0.36, 1],
          delay: collapsed ? 0.06 : 0,
        },
      }}
      className="relative isolate z-20 hidden h-screen shrink-0 pl-4 pr-0 py-5 lg:flex lg:flex-col transform-gpu"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(219,194,255,0.10)_0%,rgba(219,194,255,0.03)_28%,transparent_42%),radial-gradient(circle_at_100%_42%,rgba(126,94,210,0.16)_0%,rgba(126,94,210,0.07)_22%,transparent_40%),linear-gradient(180deg,rgba(22,16,34,0.90)_0%,rgba(15,10,25,0.95)_100%)] backdrop-blur-xl"
      />
      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => {
          setCollapsed((current) => !current)
          setHoveredHref(null)
        }}
        className="absolute right-[-17px] top-9 z-20 flex size-9 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(21,15,33,0.96)_0%,rgba(10,7,18,0.98)_100%)] text-white/72 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[transform,color,border-color] duration-200 hover:scale-[1.03] hover:border-white/18 hover:text-white/92"
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </button>

      <div className={cn('relative z-10 flex h-full flex-col', collapsed ? 'pr-2' : 'pr-4')}>
        <motion.div
          initial={false}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          className={cn(
            'overflow-hidden transform-gpu',
            collapsed ? 'px-0 py-0' : 'px-5 py-4',
          )}
        >
          <AnimatePresence initial={false} mode="wait">
            {collapsed ? (
              <motion.div
                key="sidebar-brand-collapsed"
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={COLLAPSE_CONTENT_TRANSITION}
                className="flex justify-center px-0 py-4"
              >
                <Image
                  src="/branding/prometheus-logo-no-bg.png"
                  alt="Prometheus"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </motion.div>
            ) : (
              <motion.div
                key="sidebar-brand-expanded"
                initial={{ opacity: 0, y: 6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.985 }}
                transition={COLLAPSE_CONTENT_TRANSITION}
              >
                <div className="flex items-center">
                  <Image 
                    src="/branding/prometheus-logo-no-bg.png" 
                    alt="Prometheus" 
                    width={20} 
                    height={20} 
                    className="size-5 object-contain"
                  />
                  <p className="text-[11px] font-bold uppercase tracking-[0.36em] text-white/92 ml-1" style={{ fontFamily: 'var(--font-mono), ui-sans-serif, system-ui, sans-serif' }}>
                    rometheus
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto py-5">
          <nav className={cn('space-y-4', collapsed && 'space-y-3')} onMouseLeave={() => setHoveredHref(null)}>
            <BladeNavGroup
              items={menuItems}
              activeHref={activeHref}
              hoveredHref={hoveredHref}
              onHoverChange={setHoveredHref}
              onRouteIntent={(href) => {
                void router.prefetch(href)
              }}
              collapsed={collapsed}
            />
          </nav>
        </div>

      </div>
    </motion.aside>
  )
}

function BladeNavGroup({ items, activeHref, hoveredHref, onHoverChange, onRouteIntent, collapsed }: BladeNavGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [metrics, setMetrics] = useState<Record<string, BladeMetrics>>({})
  const prefersReducedMotion = useReducedMotion()

  const transition = prefersReducedMotion ? { duration: 0 } : BLADE_TRANSITION
  const previewHref = hoveredHref && items.some((item) => item.href === hoveredHref) ? hoveredHref : null
  const routeHref = items.find((item) => item.href === activeHref)?.href ?? null
  const targetHref = previewHref ?? (!hoveredHref ? routeHref : null)
  const targetMetrics = targetHref ? metrics[targetHref] : null

  const measureItems = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const nextMetrics: Record<string, BladeMetrics> = {}
    const containerRect = container.getBoundingClientRect()

    for (const item of items) {
      const node = itemRefs.current[item.href]
      if (!node) continue
      const rect = node.getBoundingClientRect()
      nextMetrics[item.href] = {
        top: rect.top - containerRect.top,
        height: rect.height,
      }
    }

    setMetrics(nextMetrics)
  }, [items])

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(measureItems)

    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      measureItems()
    })

    observer.observe(container)

    for (const item of items) {
      const node = itemRefs.current[item.href]
      if (node) observer.observe(node)
    }

    window.addEventListener('resize', measureItems)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('resize', measureItems)
    }
  }, [items, measureItems])

  return (
    <div ref={containerRef} className={cn('relative overflow-visible pb-2', collapsed ? 'pl-0 pr-0' : 'pl-2 pr-0')}>
      {targetMetrics ? (
        <ActiveBlade top={targetMetrics.top} height={targetMetrics.height} transition={transition} />
      ) : null}

      <div className="relative z-10 space-y-1">
        {items.map((item) => {
          const isCurrent = item.href === routeHref
          const isSelected = item.href === targetHref

          return (
            <NavItem
              key={item.href}
              ref={(node) => {
                itemRefs.current[item.href] = node
              }}
              item={item}
              isCurrent={isCurrent}
              isSelected={isSelected}
              collapsed={collapsed}
              onMouseEnter={() => {
                onHoverChange(item.href)
                onRouteIntent(item.href)
              }}
              onFocus={() => {
                onHoverChange(item.href)
                onRouteIntent(item.href)
              }}
              onBlur={() => onHoverChange(null)}
              onClick={() => {
                if (item.key === 'editor') {
                  rememberCurrentPathForEditorReturn()
                }
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function ActiveBlade({ top, height, transition }: ActiveBladeProps) {
  return (
    <motion.div
      initial={false}
      animate={{ top, height }}
      transition={transition}
      className="pointer-events-none absolute left-2 right-[-4px] z-[1] overflow-visible rounded-l-[20px] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.95),0_12px_26px_-22px_rgba(83,61,142,0.54)]"
    >
      <div
        className="absolute inset-0 rounded-l-[20px] ring-1 ring-white/[0.05]"
        style={{ backgroundColor: ACTIVE_CUTOUT_COLOR }}
      />
      <div className="absolute inset-[1px] rounded-l-[19px] bg-[linear-gradient(180deg,rgba(19,15,29,0.98)_0%,rgba(10,8,16,0.98)_100%)]" />
      <div className="absolute inset-x-4 top-1.5 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
      <div
        className="absolute right-0 top-[-24px] h-6 w-6 rounded-br-[24px]"
        style={{ boxShadow: `8px 8px 0 8px ${ACTIVE_CUTOUT_COLOR}` }}
      >
        <div className="absolute inset-0 rounded-br-[24px] bg-transparent" />
      </div>
      <div
        className="absolute bottom-[-24px] right-0 h-6 w-6 rounded-tr-[24px]"
        style={{ boxShadow: `8px -8px 0 8px ${ACTIVE_CUTOUT_COLOR}` }}
      >
        <div className="absolute inset-0 rounded-tr-[24px] bg-transparent" />
      </div>
    </motion.div>
  )
}

const NavItem = forwardRef<HTMLAnchorElement, NavItemProps>(function NavItem(
  { item, isCurrent, isSelected, collapsed, className, onMouseEnter, onFocus, onBlur, ...props },
  ref,
) {
  const Icon = item.icon

  return (
      <Link
        ref={ref}
        href={item.href}
        prefetch={false}
        aria-current={isCurrent ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      className={cn(
        'group relative z-10 flex h-12 items-center rounded-[20px] text-sm font-medium transition-[color,transform,opacity,padding] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b132c]',
        collapsed ? 'justify-center px-0' : 'gap-3 px-4 pr-5',
        isSelected ? 'text-white/92' : 'text-white/66 hover:text-white/92',
        className,
      )}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onBlur={onBlur}
      {...props}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full border transition-[color,background-color,border-color,box-shadow] duration-300',
          isSelected
            ? 'border-white/10 bg-white/[0.05] text-white/86 shadow-none'
            : 'border-white/8 bg-white/[0.03] text-white/58 group-hover:border-white/14 group-hover:bg-white/[0.06] group-hover:text-white/82',
        )}
      >
        <Icon className={collapsed ? 'size-5' : 'size-[18px]'} strokeWidth={1.5} />
      </span>

      <AnimatePresence initial={false} mode="popLayout">
        {!collapsed ? (
          <motion.span
            key="nav-label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="truncate tracking-[0.01em]"
          >
            {item.label}
          </motion.span>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.span
            key="nav-dot"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'ml-auto size-1.5 rounded-full transition-[background-color,box-shadow] duration-300',
              isSelected || isCurrent ? 'bg-white/50 shadow-none' : 'bg-white/0 group-hover:bg-white/20',
            )}
          />
        ) : null}
      </AnimatePresence>
    </Link>
  )
})

function isPathActive(pathname: string, href: string) {
  if (href === '/studio') return pathname === '/' || pathname === '/studio'
  return pathname === href || pathname.startsWith(`${href}/`)
}
