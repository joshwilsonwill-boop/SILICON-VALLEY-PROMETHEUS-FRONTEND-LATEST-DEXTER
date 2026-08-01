'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowUp,
  BookOpen,
  Bot,
  Film,
  FolderKanban,
  HelpCircle,
  Lightbulb,
  Mail,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

import { useAIChat } from '@/hooks/use-ai-chat'
import { getLastEditorialChamberPath, requestEditorialChatOpen } from '@/lib/editorial-chat-navigation'
import { cn } from '@/lib/utils'
import { openCinematicOnboarding } from '@/components/onboarding/cinematic-onboarding'

type HelpView = 'menu' | 'ask' | 'guides'

const AUTH_ROUTE_REGEX = /^\/(?:login|signup|verify|forgot-password|reset-password)(?:\/|$)/

const guides = [
  {
    icon: Upload,
    title: 'Start a project',
    detail: 'Upload source footage, then define the edit you want Prometheus to shape.',
    href: '/projects',
  },
  {
    icon: Film,
    title: 'Shape an edit',
    detail: 'Use the editor to refine pacing, captions, music, and visual direction.',
    href: '/projects',
  },
  {
    icon: FolderKanban,
    title: 'Manage source media',
    detail: 'Keep footage, references, and production assets ready in the library.',
    href: '/assets',
  },
]

function currentWorkspaceLabel(pathname: string) {
  if (pathname.startsWith('/editor')) return 'the editor'
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/assets')) return 'the asset library'
  if (pathname.startsWith('/analytics')) return 'analytics'
  if (pathname.startsWith('/exports')) return 'exports'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'Prometheus Studio'
}

export function GlobalHelpLauncher() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [view, setView] = React.useState<HelpView>('menu')
  const [draft, setDraft] = React.useState('')
  const launcherRef = React.useRef<HTMLButtonElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const chat = useAIChat({ projectId: null, enabled: isOpen && view === 'ask' })

  const isEditorialChamber = pathname.startsWith('/editor/')
  const hideLauncher = AUTH_ROUTE_REGEX.test(pathname) || isEditorialChamber
  const workspaceLabel = currentWorkspaceLabel(pathname)
  const isSending = chat.isSending || chat.isAwaitingResponse

  const close = React.useCallback(() => {
    setIsOpen(false)
    setView('menu')
    window.requestAnimationFrame(() => launcherRef.current?.focus())
  }, [])

  React.useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, isOpen])

  React.useEffect(() => {
    if (isOpen && view === 'ask') {
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen, view])

  const openView = React.useCallback((nextView: HelpView) => {
    setIsOpen(true)
    setView(nextView)
  }, [])

  const openEditorialChat = React.useCallback(() => {
    const chamberPath = getLastEditorialChamberPath()

    requestEditorialChatOpen()
    close()

    if (!isEditorialChamber && chamberPath) {
      router.push(chamberPath)
      return
    }

    if (!isEditorialChamber && !chamberPath) {
      router.push('/projects')
    }
  }, [close, isEditorialChamber, router])

  const sendQuestion = React.useCallback(
    async (question?: string) => {
      const message = (question ?? draft).trim()
      if (!message || isSending) return
      setDraft('')
      await chat.sendMessage(`I am currently in ${workspaceLabel}. ${message}`)
    },
    [chat, draft, isSending, workspaceLabel],
  )

  if (hideLauncher) return null

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[90] font-sans sm:bottom-5 sm:right-5">
      {isOpen ? (
        <div
          ref={panelRef}
          id="prometheus-help-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Prometheus help"
          className="mb-3 w-[min(23rem,calc(100vw-2rem))] overflow-hidden border border-white/[0.12] bg-[#0a0a0d]/[0.98] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.92)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/80">
                <HelpCircle className="size-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">Prometheus help</p>
                <p className="truncate text-xs text-white/42">Context: {workspaceLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid size-8 shrink-0 place-items-center text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              aria-label="Close help"
            >
              <X className="size-4" />
            </button>
          </div>

          {view === 'menu' ? (
            <div className="space-y-2 p-3">
              <HelpAction icon={Bot} label="Ask Prometheus" detail="Open the editorial chamber chat" onClick={openEditorialChat} />
              <HelpAction icon={BookOpen} label="Production guides" detail="Learn the core studio workflows" onClick={() => openView('guides')} />
              <HelpAction icon={Sparkles} label="Onboarding" detail="Replay the guided Studio introduction" onClick={() => { close(); openCinematicOnboarding('studio') }} />
              <HelpAction
                icon={Mail}
                label="Contact support"
                detail="Talk to the Prometheus Studio team"
                onClick={() => {
                  window.location.assign('mailto:support@prometheusstudio.tech?subject=Prometheus%20Studio%20support')
                }}
              />
              <HelpAction
                icon={Lightbulb}
                label="Request a feature"
                detail="Tell us what would improve your workflow"
                onClick={() => {
                  window.location.assign('mailto:support@prometheusstudio.tech?subject=Prometheus%20Studio%20feature%20request')
                }}
              />
              <HelpAction
                icon={BookOpen}
                label="Visit docs"
                detail="Open the Prometheus Studio handbook"
                onClick={() => {
                  close()
                  router.push('/docs')
                }}
              />
            </div>
          ) : null}

          {view === 'guides' ? (
            <div className="p-3">
              <button
                type="button"
                onClick={() => setView('menu')}
                className="mb-2 text-xs text-white/45 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              >
                Back to help
              </button>
              <div className="space-y-2">
                {guides.map((guide) => {
                  const Icon = guide.icon
                  return (
                    <button
                      key={guide.title}
                      type="button"
                      onClick={() => {
                        close()
                        router.push(guide.href)
                      }}
                      className="flex w-full items-start gap-3 border border-white/[0.08] bg-white/[0.035] p-3 text-left transition-colors hover:border-white/[0.16] hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-white/65" strokeWidth={1.7} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white/88">{guide.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-white/45">{guide.detail}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  close()
                  router.push('/docs')
                }}
                className="mt-3 w-full border border-white/[0.12] py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              >
                Open full documentation
              </button>
            </div>
          ) : null}

          {view === 'ask' ? (
            <div className="flex max-h-[min(34rem,calc(100dvh-9rem))] min-h-[24rem] flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {chat.messages.length === 0 ? (
                  <div className="pt-4">
                    <p className="text-sm leading-6 text-white/68">What do you need to make, fix, or export?</p>
                    <div className="mt-4 flex flex-col items-start gap-2">
                      {['How do I start an edit?', 'Help me prepare an export', 'Where should I put source footage?'].map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => void sendQuestion(question)}
                          disabled={isSending}
                          className="border border-white/[0.11] bg-white/[0.035] px-3 py-2 text-left text-xs text-white/62 transition-colors hover:border-white/[0.2] hover:text-white disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chat.messages.map((message) => (
                    <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <p
                        className={cn(
                          'max-w-[88%] whitespace-pre-wrap text-sm leading-6',
                          message.role === 'user'
                            ? 'border border-white/[0.12] bg-white/[0.07] px-3 py-2 text-white/88'
                            : 'text-white/70',
                        )}
                      >
                        {message.content || (message.role === 'assistant' ? 'Prometheus is thinking...' : '')}
                      </p>
                    </div>
                  ))
                )}
                {chat.error ? <p className="text-xs leading-5 text-red-300/80">{chat.error}</p> : null}
              </div>
              <form
                className="flex items-center gap-2 border-t border-white/[0.08] p-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendQuestion()
                }}
              >
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about this workspace..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white/90 outline-none placeholder:text-white/32"
                  aria-label="Ask Prometheus"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  className="grid size-9 shrink-0 place-items-center border border-white/[0.13] text-white/78 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                  aria-label="Send question"
                >
                  <ArrowUp className="size-4" />
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="prometheus-help-panel"
        className="grid size-12 place-items-center rounded-full border border-white/[0.24] bg-white text-black shadow-[0_12px_34px_-12px_rgba(0,0,0,0.9)] transition-transform hover:scale-[1.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        aria-label={isOpen ? 'Close Prometheus help' : 'Open Prometheus help'}
      >
        {isOpen ? <X className="size-5" strokeWidth={1.8} /> : <HelpCircle className="size-5" strokeWidth={1.8} />}
      </button>
    </div>
  )
}

function HelpAction({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: typeof Bot
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border border-white/[0.09] bg-white/[0.035] px-3 py-3 text-left transition-colors hover:border-white/[0.17] hover:bg-white/[0.065] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
    >
      <Icon className="size-4 shrink-0 text-white/76" strokeWidth={1.7} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white/88">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-white/42">{detail}</span>
      </span>
    </button>
  )
}
