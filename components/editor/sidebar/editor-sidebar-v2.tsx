'use client'

import * as React from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, Download, Folder, Monitor, Music, PenLine, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarState } from '@/hooks/use-sidebar-state'
import { SidebarNavItem } from './sidebar-nav-item'
import { SidebarOverlay } from './sidebar-overlay'
import { SidebarToggle } from './sidebar-toggle'

type EditorPanelId = 'motion' | 'music'

export interface EditorSidebarV2Props {
  activeEditorPanel?: EditorPanelId | null
  defaultOpen?: boolean
  className?: string
  onOpenMotionPanel?: () => void
  onOpenMusicCatalog?: () => void
  onStartExport?: () => void
  onNewProject?: () => void
  onSidebarChange?: (open: boolean) => void
}

function dispatchEditorEvent(name: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name))
}

// Focus trap helper stays local so the sidebar can be dropped into the old editor without new deps.
function getFocusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
}

export function EditorSidebarV2({
  activeEditorPanel = null,
  defaultOpen = true,
  className,
  onOpenMotionPanel,
  onOpenMusicCatalog,
  onStartExport,
  onNewProject,
  onSidebarChange,
}: EditorSidebarV2Props) {
  const router = useRouter()
  const pathname = usePathname()
  const handleSidebarChange = React.useCallback(
    (open: boolean) => {
      onSidebarChange?.(open)
    },
    [onSidebarChange]
  )
  const { sidebarRef, backdropRef, toggleButtonRef, isSidebarOpenRef, closeSidebar, toggleSidebar } = useSidebarState({
    defaultOpen,
    onChange: handleSidebarChange,
  })

  // Route items use Next navigation. Editor-only actions use callbacks or custom events as a fallback.
  const goTo = React.useCallback(
    (href: string) => {
      router.push(href)
      closeSidebar()
    },
    [closeSidebar, router]
  )

  const handleMotion = React.useCallback(() => {
    if (onOpenMotionPanel) onOpenMotionPanel()
    else dispatchEditorEvent('prometheus:editor:open-motion-panel')
  }, [onOpenMotionPanel])

  const handleMusic = React.useCallback(() => {
    if (onOpenMusicCatalog) onOpenMusicCatalog()
    else dispatchEditorEvent('prometheus:editor:open-music-catalog')
  }, [onOpenMusicCatalog])

  const handleExport = React.useCallback(() => {
    if (onStartExport) onStartExport()
    else dispatchEditorEvent('prometheus:editor:start-export')
  }, [onStartExport])

  const handleNewProject = React.useCallback(() => {
    if (onNewProject) onNewProject()
    else dispatchEditorEvent('prometheus:editor:new-project')
  }, [onNewProject])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleSidebar()
        return
      }

      const sidebar = sidebarRef.current
      if (!sidebar || !isSidebarOpenRef.current) return

      if (event.key === 'Escape') {
        event.preventDefault()
        closeSidebar()
        toggleButtonRef.current?.focus()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(sidebar)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeSidebar, isSidebarOpenRef, sidebarRef, toggleButtonRef, toggleSidebar])

  return (
    <>
      <SidebarOverlay overlayRef={backdropRef} defaultOpen={defaultOpen} onClose={closeSidebar} />

      <aside
        id="editor-sidebar-v2"
        ref={sidebarRef}
        aria-label="Editor navigation"
        aria-hidden={false}
        data-sidebar-state={defaultOpen ? 'open' : 'closed'}
        className={cn(
          'group/editor-sidebar fixed inset-y-0 left-0 z-[60] flex w-[85vw] max-w-[360px] flex-col overflow-hidden font-sans text-text-primary shadow-[24px_0_80px_rgba(0,0,0,0.45)] md:w-[280px] lg:w-[72px] xl:w-[280px]',
          'will-change-[transform,width] transition-[transform,width] duration-[200ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          defaultOpen ? 'translate-x-0' : 'max-lg:-translate-x-full lg:translate-x-0',
          className
        )}
        style={{
          backgroundColor: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          ['--editor-sidebar-width' as string]: defaultOpen ? '280px' : '72px',
        }}
      >
        <div className="flex min-h-14 items-center gap-3 border-b border-white/[0.06] px-4 group-data-[sidebar-state=closed]/editor-sidebar:justify-center group-data-[sidebar-state=closed]/editor-sidebar:px-2">
          <div className="editor-sidebar-brand relative flex h-9 w-9 shrink-0 items-center justify-center" aria-label="Prometheus">
            <Image
              src="/branding/prometheus-logo-no-bg.png"
              alt=""
              width={36}
              height={36}
              className="editor-sidebar-brand__mark h-9 w-9 object-contain"
            />
            <span aria-hidden="true" className="editor-sidebar-brand__shader" />
          </div>
          <button
            type="button"
            role="button"
            aria-label="Create new project"
            onClick={handleNewProject}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent-cyan group-data-[sidebar-state=closed]/editor-sidebar:hidden lg:max-xl:hidden"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Editor sidebar"
          className="min-h-0 flex-1 overflow-y-auto py-3 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <SectionHeader label="Workspace" />
          <div className="space-y-1 px-2">
            <SidebarNavItem
              label="Projects"
              icon={Folder}
              active={pathname?.startsWith('/projects')}
              onSelect={() => goTo('/projects')}
              ariaLabel="Open projects dashboard"
            />
            <SidebarNavItem
              label="Studio"
              icon={Monitor}
              active={pathname?.startsWith('/studio')}
              onSelect={() => goTo('/studio')}
              ariaLabel="Open studio"
            />
            <SidebarNavItem
              label="Editor"
              icon={PenLine}
              active={pathname?.startsWith('/editor')}
              onSelect={() => goTo('/editor')}
              ariaLabel="Open editor"
            />
          </div>

          <div className="my-3 border-t border-white/[0.06]" />

          <SectionHeader label="Project" />
          <div className="space-y-1 px-2">
            <SidebarNavItem
              label="Motion"
              icon={Activity}
              active={activeEditorPanel === 'motion'}
              onSelect={handleMotion}
              ariaLabel="Open Motion panel"
            />
            <SidebarNavItem
              label="Music"
              icon={Music}
              active={activeEditorPanel === 'music'}
              onSelect={handleMusic}
              ariaLabel="Open Music catalog"
            />
            <SidebarNavItem
              label="Export"
              icon={Download}
              onSelect={handleExport}
              ariaLabel="Start export workflow"
            />
            <SidebarNavItem
              label="New Project"
              icon={Plus}
              onSelect={handleNewProject}
              ariaLabel="Create new project"
            />
          </div>
        </nav>

        <div className="border-t border-white/[0.06] p-2">
          <SectionHeader label="Account" />
          <SidebarNavItem
            label="Settings"
            icon={Settings}
            active={pathname?.startsWith('/settings')}
            onSelect={() => goTo('/settings')}
            ariaLabel="Open settings"
          />
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex justify-center">
            <SidebarToggle buttonRef={toggleButtonRef} onToggle={toggleSidebar} defaultExpanded={defaultOpen} />
          </div>
        </div>
      </aside>
    </>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-white/40 group-data-[sidebar-state=closed]/editor-sidebar:sr-only lg:max-xl:sr-only">
      {label}
    </div>
  )
}
