'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Bot, HelpCircle, Lightbulb, Loader2, Mail, Sparkles, X } from 'lucide-react'

const helpActions = [
  { icon: Bot, label: 'Ask Prometheus', detail: 'Learn how to use the editorial assistant', href: '/docs#assistant' },
  { icon: BookOpen, label: 'Production guides', detail: 'Read the core Studio workflows', href: '/docs#editing' },
  { icon: Sparkles, label: 'Onboarding', detail: 'Follow the first-project walkthrough', href: '/docs#getting-started' },
  { icon: Mail, label: 'Contact support', detail: 'Find support contact details', href: '/contact' },
  { icon: Lightbulb, label: 'Request a feature', detail: 'Share a workflow request with the team', href: '/contact#feature-request' },
  { icon: BookOpen, label: 'Visit docs', detail: 'Open the complete production handbook', href: '/docs' },
]

export function GlobalHelpLauncher() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [openedPath, setOpenedPath] = React.useState(pathname)
  const [pendingLabel, setPendingLabel] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const launcherRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const visible = isOpen && openedPath === pathname

  const close = React.useCallback(() => {
    setIsOpen(false)
    launcherRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!visible) return
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [visible, close])

  if (/^\/(?:login|signup|verify|forgot-password|reset-password)(?:\/|$)/.test(pathname) || pathname.startsWith('/editor/')) return null

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[90] sm:right-5">
      {visible ? (
        <div ref={panelRef} id="prometheus-help-panel" role="dialog" aria-modal="false" aria-label="Prometheus help" className="mb-3 w-[min(23rem,calc(100vw-2rem))] rounded-lg border border-white/15 bg-[var(--theme-background)] p-3 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-3">
            <h2 className="text-lg text-white">Prometheus help</h2>
            <button type="button" onClick={close} aria-label="Close help" className="grid size-11 place-items-center text-white"><X className="size-5" /></button>
          </div>
          <div className="space-y-2">
            {helpActions.map(({ icon: Icon, label, detail, href }) => (
              <button key={label} type="button" disabled={isPending} onClick={() => {
                setPendingLabel(label)
                startTransition(() => router.push(href))
              }} className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-left text-white hover:bg-white/10 disabled:opacity-60">
                {isPending && pendingLabel === label ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" aria-hidden="true" />}
                <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-white/65">{detail}</span></span>
              </button>
            ))}
          </div>
          {isPending ? <p role="status" className="mt-3 text-sm text-[var(--theme-accent)]">Opening {pendingLabel}?</p> : null}
        </div>
      ) : null}
      <button ref={launcherRef} type="button" onClick={() => { setOpenedPath(pathname); setIsOpen(!visible) }} aria-expanded={visible} aria-controls="prometheus-help-panel" aria-label={visible ? 'Close Prometheus help' : 'Open Prometheus help'} className="grid size-12 place-items-center rounded-lg bg-[var(--theme-accent)] text-black shadow-xl">
        {visible ? <X className="size-5" /> : <HelpCircle className="size-5" />}
      </button>
    </div>
  )
}
