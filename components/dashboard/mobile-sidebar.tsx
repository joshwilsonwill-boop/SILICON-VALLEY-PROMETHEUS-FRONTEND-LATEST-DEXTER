'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ChevronLeft, Edit3, Folder, Home, LogOut, Monitor, Plus, Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useSwipeClose } from '@/hooks/use-swipe-close'
import { GlassSphereAvatar } from '@/components/ui/glass-sphere-avatar'
import { LiquidGlassButton } from '@/components/ui/liquid-glass-button'
import { UserProfilePopup } from '@/components/ui/user-profile-popup'
import { MobileNavItem } from './mobile-nav-item'

export interface DashboardMobileSidebarProps {
  userName?: string | null
  userEmail?: string | null
  userAvatar?: string | null
  studioHref?: string
  profileHref?: string
  onNewProject?: () => void
  onLogout?: () => void | Promise<void>
  className?: string
}

const CLOSE_ANIMATION_MS = 300

function isPathActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function dispatchDashboardEvent(name: string) {
  window.dispatchEvent(new CustomEvent(name))
}

export function DashboardMobileSidebar({
  userName,
  userEmail,
  userAvatar,
  studioHref = '/',
  profileHref = '/settings/profile',
  onNewProject,
  onLogout,
  className,
}: DashboardMobileSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const drawerRef = useSwipeClose<HTMLElement>({ onClose: () => closeSidebar() })
  const overlayRef = React.useRef<HTMLButtonElement | null>(null)
  const hamburgerRef = React.useRef<HTMLButtonElement | null>(null)
  const openRef = React.useRef(false)
  const closeTimerRef = React.useRef<number | null>(null)
  const { lockBodyScroll, unlockBodyScroll } = useBodyScrollLock(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [isUserPopupOpen, setIsUserPopupOpen] = React.useState(false)

  const displayName = userName?.trim() || 'Account'
  const displayEmail = userEmail?.trim() || 'Signed in'
  const avatarLabel = (displayName || displayEmail).trim().charAt(0).toUpperCase() || 'P'

  const applyOpenState = React.useCallback(
    (open: boolean) => {
      openRef.current = open
      setIsOpen(open)

      const drawer = drawerRef.current
      if (drawer) {
        drawer.classList.toggle('translate-x-0', open)
        drawer.classList.toggle('-translate-x-full', !open)
        drawer.setAttribute('aria-hidden', String(!open))
        drawer.dataset.sidebarState = open ? 'open' : 'closed'
      }

      const overlay = overlayRef.current
      if (overlay) {
        overlay.classList.toggle('pointer-events-auto', open)
        overlay.classList.toggle('opacity-100', open)
        overlay.classList.toggle('pointer-events-none', !open)
        overlay.classList.toggle('opacity-0', !open)
        overlay.setAttribute('aria-hidden', String(!open))
      }

      const hamburger = hamburgerRef.current
      if (hamburger) {
        hamburger.dataset.menuState = open ? 'open' : 'closed'
        hamburger.setAttribute('aria-expanded', String(open))
        hamburger.setAttribute('aria-label', open ? 'Close mobile navigation' : 'Open mobile navigation')
      }

      if (open) lockBodyScroll()
      else unlockBodyScroll()
    },
    [drawerRef, lockBodyScroll, unlockBodyScroll]
  )

  const openSidebar = React.useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    applyOpenState(true)
    window.requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>('button, a')?.focus()
    })
  }, [applyOpenState, drawerRef])

  const closeSidebar = React.useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    applyOpenState(false)
  }, [applyOpenState])

  const closeThen = React.useCallback(
    (next: () => void) => {
      closeSidebar()
      closeTimerRef.current = window.setTimeout(next, CLOSE_ANIMATION_MS)
    },
    [closeSidebar]
  )

  const navigateTo = React.useCallback(
    (href: string) => {
      closeThen(() => router.push(href))
    },
    [closeThen, router]
  )

  const handleNewProject = React.useCallback(() => {
    closeThen(() => {
      if (onNewProject) onNewProject()
      else dispatchDashboardEvent('prometheus:dashboard:new-project')
    })
  }, [closeThen, onNewProject])

  const handleLogout = React.useCallback(() => {
    closeThen(async () => {
      if (onLogout) {
        await onLogout()
        return
      }

      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
      router.push('/login')
    })
  }, [closeThen, onLogout, router])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!openRef.current || event.key !== 'Escape') return
      event.preventDefault()
      closeSidebar()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
      unlockBodyScroll()
    }
  }, [closeSidebar, unlockBodyScroll])

  return (
    <div className={cn('md:hidden', className)}>
      <LiquidGlassButton ref={hamburgerRef} isOpen={isOpen} onClick={() => (openRef.current ? closeSidebar() : openSidebar())} aria-label={isOpen ? 'Close mobile navigation' : 'Open mobile navigation'} aria-expanded={isOpen} className="fixed left-4 top-4 z-50 md:hidden" />

      <button
        ref={overlayRef}
        type="button"
        tabIndex={-1}
        aria-label="Close mobile navigation overlay"
        aria-hidden="true"
        onClick={closeSidebar}
        className="pointer-events-none fixed inset-0 z-40 opacity-0 outline-none transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <aside
        ref={drawerRef}
        aria-label="Mobile dashboard navigation"
        aria-hidden="true"
        data-sidebar-state="closed"
        className="fixed inset-y-0 left-0 z-[45] flex w-[50vw] min-w-[280px] max-w-[320px] -translate-x-full flex-col overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.4)] transition-[transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none"
        style={{
          backgroundColor: 'rgba(8, 8, 12, 0.92)',
          backdropFilter: 'blur(32px) saturate(150%)',
          WebkitBackdropFilter: 'blur(32px) saturate(150%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <header className="flex min-h-16 items-center gap-3 px-3 pt-4">
          <button
            type="button"
            role="button"
            aria-label="Close mobile navigation"
            onClick={closeSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-accent-cyan"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-[-0.02em] text-white">Prometheus</p>
            <p className="truncate text-xs text-white/42">Creative navigation</p>
          </div>
        </header>

        <nav
          aria-label="Mobile dashboard sections"
          className="mt-4 min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="space-y-1 px-3">
            <MobileNavItem label="Dashboard" icon={Home} active={isPathActive(pathname, '/dashboard')} onSelect={() => navigateTo('/dashboard')} />
            <MobileNavItem label="Projects" icon={Folder} active={isPathActive(pathname, '/projects')} onSelect={() => navigateTo('/projects')} />
            <MobileNavItem label="Studio" icon={Monitor} active={isPathActive(pathname, studioHref)} onSelect={() => navigateTo(studioHref)} />
            <MobileNavItem label="Editor" icon={Edit3} active={isPathActive(pathname, '/editor')} onSelect={() => navigateTo('/editor')} />
            <MobileNavItem label="Analytics" icon={BarChart3} active={isPathActive(pathname, '/analytics')} onSelect={() => navigateTo('/analytics')} />
          </div>

          <div className="my-3 border-t border-white/[0.06]" />

          <div className="space-y-1 px-3">
            <MobileNavItem label="Settings" icon={Settings} active={isPathActive(pathname, '/settings')} onSelect={() => navigateTo('/settings')} />
            <MobileNavItem label="New Project" icon={Plus} onSelect={handleNewProject} />
            <MobileNavItem label="Profile" icon={User} active={isPathActive(pathname, profileHref)} onSelect={() => navigateTo(profileHref)} />
          </div>
        </nav>

        <footer className="border-t border-white/[0.06] p-3">
          <button type="button" onClick={() => { closeSidebar(); window.setTimeout(() => setIsUserPopupOpen(true), CLOSE_ANIMATION_MS) }} className="mb-3 flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.06]">
            <GlassSphereAvatar src={userAvatar} alt={displayName} fallback={avatarLabel} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/86">{displayName}</p>
              <p className="truncate text-xs text-white/42">{displayEmail}</p>
            </div>
          </button>
          <MobileNavItem label="Logout" icon={LogOut} destructive onSelect={handleLogout} />
        </footer>
      </aside>
      <UserProfilePopup isOpen={isUserPopupOpen} onClose={() => setIsUserPopupOpen(false)} onLogout={handleLogout} user={{ avatar: userAvatar, email: displayEmail, name: displayName, plan: 'Free' }} />
    </div>
  )
}
