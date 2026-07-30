'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowDown, ArrowUp, X } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { useAIChat, type AIChatContextProvider, type AIChatFrameReference, type CarouselItem } from '@/hooks/use-ai-chat'
import { useProfile } from '@/hooks/use-profile'
import { PROPOSE_NOT_APPLIED_MESSAGE, type EditorActionDraft } from '@/lib/editor-actions'
import { getChatGreeting } from '@/lib/user/display-name'
import { cn } from '@/lib/utils'
import { CinematicTextReveal } from '@/components/ui/cinematic-text-reveal'

import { AIChatHistoryButton } from './ai-chat-history-button'
import { ChatSuggestions } from './ai-chat-suggestions'
import { PrometheusChatHistoryDrawer } from './prometheus-chat-history-drawer'
import { AIChatStreamingText } from './ai-chat-streaming-text'

export type PrometheusChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isComplete?: boolean
  status?: 'ready' | 'thinking'
  pills?: Array<{
    id: string
    label: string
  }>
  frames?: AIChatFrameReference[]
  toolCalls?: unknown[]
  actionDrafts?: EditorActionDraft[]
  carousel?: CarouselItem[]
  suggestions?: string[]
}

export type PrometheusChatHistoryItem = {
  id: string
  title: string
  active?: boolean
}

export const demoMessages: PrometheusChatMessage[] = [
  {
    id: 'demo-user',
    role: 'user',
    content: 'Tighten the opening and make the pacing feel more editorial.',
  },
  {
    id: 'demo-assistant',
    role: 'assistant',
    content:
      'Start with the strongest visual beat, hold one clean breath, then move into the proof point. Keep the transition quiet and let the frame carry the authority.',
  },
]

export const demoThinkingMessages: PrometheusChatMessage[] = [
  ...demoMessages,
  {
    id: 'demo-thinking',
    role: 'assistant',
    content: '',
    status: 'thinking',
  },
]

export function PrometheusChat({
  messages,
  onSend,
  thinking = false,
  draft,
  onDraftChange,
  onClose,
  className,
  projectId = null,
  contextProvider,
  onApplyActions,
  onSeekToSec,
  workspaceTab = null,
}: {
  messages: PrometheusChatMessage[]
  onSend: (message: string) => void | Promise<void>
  historyItems?: PrometheusChatHistoryItem[]
  title?: string
  thinking?: boolean
  draft?: string
  onDraftChange?: (value: string) => void
  onAttachImage?: () => void
  onAttachVideo?: () => void
  onClose?: () => void
  className?: string
  projectId?: string | null
  contextProvider?: AIChatContextProvider
  onApplyActions?: (drafts: EditorActionDraft[], messageId: string) => void
  onSeekToSec?: (seconds: number) => void
  workspaceTab?: string | null
}) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const persistentChat = useAIChat({ projectId, enabled: true, contextProvider })
  const [internalDraft, setInternalDraft] = React.useState('')
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [actionOutcomes, setActionOutcomes] = React.useState<Record<string, 'applied' | 'dismissed'>>({})
  const historyButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null)
  const pinnedToBottomRef = React.useRef(true)

  const persistedMessages = React.useMemo<PrometheusChatMessage[]>(
    () => persistentChat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      isComplete: message.isComplete,
      frames: message.frames,
      toolCalls: message.toolCalls,
      actionDrafts: message.actionDrafts,
      carousel: message.carousel,
      suggestions: message.suggestions,
    })),
    [persistentChat.messages],
  )

  const handleApplyActions = React.useCallback(
    (drafts: EditorActionDraft[], messageId: string) => {
      onApplyActions?.(drafts, messageId)
      setActionOutcomes((current) => ({ ...current, [messageId]: 'applied' }))
    },
    [onApplyActions],
  )

  const handleDismissActions = React.useCallback((messageId: string) => {
    setActionOutcomes((current) => ({ ...current, [messageId]: 'dismissed' }))
  }, [])
  const usesPersistentChat = true
  const renderedMessages = usesPersistentChat ? persistedMessages : messages
  const composedDraft = usesPersistentChat ? persistentChat.draft : draft ?? internalDraft
  const hasDraft = composedDraft.trim().length > 0
  const showingThinking = usesPersistentChat
    ? Boolean(persistentChat.isAwaitingResponse || persistentChat.streamStatus)
    : thinking || renderedMessages.some((message) => message.status === 'thinking')
  const lastMessage = renderedMessages[renderedMessages.length - 1]

  const setDraft = React.useCallback(
    (value: string) => {
      if (usesPersistentChat) {
        persistentChat.setDraft(value)
        return
      }
      if (onDraftChange) {
        onDraftChange(value)
        return
      }
      setInternalDraft(value)
    },
    [onDraftChange, persistentChat, usesPersistentChat],
  )

  // Stream-provided suggestions from the latest assistant turn override the
  // deterministic workspace-tab chips; older turns never leak forward.
  const turnSuggestions = React.useMemo(() => {
    for (let index = renderedMessages.length - 1; index >= 0; index -= 1) {
      const message = renderedMessages[index]
      if (message.role !== 'assistant') continue
      return message.suggestions && message.suggestions.length > 0 ? message.suggestions : undefined
    }
    return undefined
  }, [renderedMessages])

  const suggestionsHidden = usesPersistentChat ? persistentChat.isSending : thinking

  const handleSuggestionSelect = React.useCallback(
    (suggestion: string) => {
      setDraft(suggestion)
      inputRef.current?.focus()
    },
    [setDraft],
  )

  const handleCarouselSelect = React.useCallback(
    (item: CarouselItem) => {
      const text = item.message.trim()
      if (!text) return

      pinnedToBottomRef.current = true
      setShowJumpToLatest(false)

      if (usesPersistentChat) {
        void persistentChat.sendMessage(item.message)
        return
      }
      void onSend(text)
    },
    [onSend, persistentChat, usesPersistentChat],
  )

  const scrollToLatest = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    viewport.scrollTo({ top: viewport.scrollHeight, behavior })
    pinnedToBottomRef.current = true
    setShowJumpToLatest(false)
  }, [])

  const handleThreadScroll = React.useCallback(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    const isPinned = distanceFromBottom < 112
    pinnedToBottomRef.current = isPinned
    setShowJumpToLatest(!isPinned && renderedMessages.length > 0)
  }, [renderedMessages.length])

  React.useEffect(() => {
    if (!renderedMessages.length && !showingThinking) return

    const frame = window.requestAnimationFrame(() => {
      if (pinnedToBottomRef.current || lastMessage?.role === 'user') scrollToLatest('smooth')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [lastMessage?.content, lastMessage?.id, lastMessage?.role, renderedMessages.length, scrollToLatest, showingThinking])

  const handleSend = React.useCallback(async () => {
    const message = composedDraft.trim()
    if (!message) return

    pinnedToBottomRef.current = true
    setShowJumpToLatest(false)

    if (usesPersistentChat) {
      await persistentChat.sendMessage(message)
      return
    }

    if (!onDraftChange) setInternalDraft('')
    await onSend(message)
  }, [composedDraft, onDraftChange, onSend, persistentChat, usesPersistentChat])

  const closeHistory = React.useCallback(() => {
    setHistoryOpen(false)
    window.requestAnimationFrame(() => historyButtonRef.current?.focus())
  }, [])

  return (
    <section
      className={cn(
        'relative flex h-full min-h-0 w-full overflow-hidden bg-black font-sans text-white',
        className,
      )}
      aria-label="Prometheus chat"
    >
      <div className="absolute left-4 top-4 z-30">
        <AIChatHistoryButton
          buttonRef={historyButtonRef}
          open={historyOpen}
          onClick={() => setHistoryOpen((current) => !current)}
        />
      </div>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-30 grid size-10 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label="Collapse editorial chat"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      ) : null}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          ref={scrollViewportRef}
          onScroll={handleThreadScroll}
          data-lenis-prevent
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 pt-20 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] md:px-10"
        >
          {persistentChat.historyLoadError ? (
            <div
              className="mx-auto mb-6 flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2 text-xs text-red-300/80"
              role="alert"
            >
              <span>{persistentChat.historyLoadError}</span>
              <button
                type="button"
                onClick={persistentChat.retryLoadSession}
                className="shrink-0 text-white/45 transition-colors hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : null}
          {renderedMessages.length === 0 && !showingThinking ? (
            <EmptyChatGreeting greeting={getChatGreeting(session?.user, profile)} />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-8 md:py-12">
              {renderedMessages.map((message) => (
                <PrometheusMessageBubble
                  key={message.id}
                  message={message}
                  live={usesPersistentChat}
                  actionOutcome={actionOutcomes[message.id]}
                  onApplyActions={onApplyActions ? handleApplyActions : undefined}
                  onDismissActions={handleDismissActions}
                  onSeekToSec={onSeekToSec}
                  onCarouselSelect={handleCarouselSelect}
                  carouselDisabled={usesPersistentChat ? persistentChat.isSending : false}
                  onStreamingComplete={() => {
                    if (usesPersistentChat) persistentChat.completeAssistantMessage(message.id)
                  }}
                  onStreamingProgress={() => {
                    if (pinnedToBottomRef.current) scrollToLatest('auto')
                  }}
                />
              ))}
              {showingThinking ? (
                <p className="text-sm text-white/38" role="status">{persistentChat.streamStatus || 'Thinking…'}</p>
              ) : null}
            </div>
          )}
        </div>

        {showJumpToLatest ? (
          <button
            type="button"
            aria-label="Scroll to latest response"
            onClick={() => scrollToLatest('smooth')}
            className="absolute bottom-28 right-5 z-20 grid size-9 place-items-center rounded-full border border-white/10 bg-black text-white/60 transition-colors hover:border-white/20 hover:text-white md:right-10"
          >
            <ArrowDown className="size-4" />
          </button>
        ) : null}

        <div className="relative z-20 shrink-0 border-t border-white/[0.04] bg-black px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 md:px-10 md:pb-7">
          {persistentChat.error ? (
            <div className="mx-auto mb-2 flex w-full max-w-3xl items-center justify-between gap-3 text-xs text-red-300/80" role="alert">
              <span>{persistentChat.error}</span>
              <button type="button" onClick={persistentChat.clearError} className="shrink-0 text-white/45 hover:text-white">Dismiss</button>
            </div>
          ) : null}
          {persistentChat.saveState !== 'idle' ? (
            <p className="mx-auto mb-1 w-full max-w-3xl text-right text-[10px] uppercase tracking-[0.12em] text-white/28">
              {persistentChat.saveState === 'saving' ? 'Saving' : persistentChat.saveState === 'saved' ? 'Saved' : (
                <>
                  Not saved
                  <button
                    type="button"
                    onClick={() => void persistentChat.retryPersist()}
                    className="ml-2 normal-case tracking-normal underline underline-offset-2 transition-colors hover:text-white/60"
                  >
                    Retry
                  </button>
                </>
              )}
            </p>
          ) : null}
          {!suggestionsHidden ? (
            <ChatSuggestions
              workspaceTab={workspaceTab}
              suggestions={turnSuggestions}
              onSelect={handleSuggestionSelect}
              layout="row"
              className="mx-auto mb-3 w-full max-w-3xl"
            />
          ) : null}
          <form
            className="mx-auto flex min-h-14 w-full max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-black px-5 py-3 transition-colors focus-within:border-white/22"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSend()
            }}
          >
            <input
              ref={inputRef}
              value={composedDraft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask Prometheus..."
              aria-label="Message Prometheus"
              className="min-w-0 flex-1 border-none bg-transparent text-[15px] leading-6 text-white/88 outline-none placeholder:text-white/30"
            />
            <button
              type="submit"
              disabled={!hasDraft}
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20"
              aria-label="Send message"
            >
              <ArrowUp className="size-5" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
      <AnimatePresence>
        {historyOpen ? (
          <PrometheusChatHistoryDrawer
            currentSessionId={persistentChat.currentSessionId}
            isLoading={persistentChat.isHistoryLoading}
            sessions={persistentChat.sessions}
            onClose={closeHistory}
            onNewSession={() => {
              void persistentChat.createNewSession().then(() => setHistoryOpen(false))
            }}
            onSelectSession={persistentChat.selectSession}
            onDeleteSession={(sessionId) => void persistentChat.removeSession(sessionId)}
            onRenameSession={(sessionId, title) => void persistentChat.renameSession(sessionId, title)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  )
}

function PrometheusMessageBubble({
  message,
  live,
  actionOutcome,
  onApplyActions,
  onDismissActions,
  onSeekToSec,
  onStreamingComplete,
  onStreamingProgress,
  onCarouselSelect,
  carouselDisabled = false,
}: {
  message: PrometheusChatMessage
  live: boolean
  actionOutcome?: 'applied' | 'dismissed'
  onApplyActions?: (drafts: EditorActionDraft[], messageId: string) => void
  onDismissActions?: (messageId: string) => void
  onSeekToSec?: (seconds: number) => void
  onStreamingComplete: () => void
  onStreamingProgress: () => void
  onCarouselSelect?: (item: CarouselItem) => void
  carouselDisabled?: boolean
}) {
  const isUser = message.role === 'user'
  const isThinking = message.status === 'thinking'

  if (isThinking) {
    return <p className="text-sm text-white/38" role="status">Thinking…</p>
  }

  const drafts = message.actionDrafts ?? []
  const actionableDrafts = drafts.filter((draft) => draft.kind !== 'propose')
  const proposeDrafts = drafts.filter((draft) => draft.kind === 'propose')
  const messageComplete = message.isComplete ?? true
  const showDraftPanel = !isUser && messageComplete && drafts.length > 0 && !actionOutcome
  const frames = isUser ? [] : (message.frames ?? []).filter((frame) => frame.thumbnailUrl)

  return (
    <article className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[82%] flex-col gap-3 md:max-w-[74%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap text-[15px] leading-7',
            isUser
              ? 'rounded-2xl rounded-br-md border border-white/10 bg-white/[0.055] px-5 py-3.5 text-white/90'
              : 'text-white/78',
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <AIChatStreamingText
              text={message.content}
              isComplete={messageComplete}
              live={live}
              onComplete={onStreamingComplete}
              onProgress={onStreamingProgress}
            />
          )}
        </div>

        {!isUser && message.carousel?.length ? (
          <ul
            className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
            aria-label="Recommended options"
          >
            {message.carousel.map((item, index) => (
              <li key={`${item.title}-${index}`} className="shrink-0 snap-start">
                <button
                  type="button"
                  disabled={carouselDisabled}
                  onClick={() => onCarouselSelect?.(item)}
                  className="flex min-h-11 w-52 flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left transition-[background-color,border-color,color,transform] duration-[var(--dur-hover)] ease-[var(--ease-hover)] hover:border-white/18 hover:bg-white/[0.06] active:scale-[0.98] active:duration-[var(--dur-press)] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <span className="text-[13px] font-medium text-white/88">{item.title}</span>
                  {item.description ? (
                    <span className="text-[12px] leading-5 text-white/45">{item.description}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {frames.length ? (
          <ul className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {frames.map((frame) => {
              const caption =
                frame.timecode ||
                (typeof frame.seconds === 'number' ? `${Math.round(frame.seconds)}s` : frame.label)
              const thumb = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frame.thumbnailUrl ?? ''}
                    alt={frame.label}
                    loading="lazy"
                    className="h-16 w-28 rounded-lg border border-white/10 object-cover"
                  />
                  <span className="mt-1 block text-[11px] text-white/45">{caption}</span>
                </>
              )
              return (
                <li key={frame.id} className="shrink-0">
                  {typeof frame.seconds === 'number' && onSeekToSec ? (
                    <button
                      type="button"
                      onClick={() => onSeekToSec(frame.seconds as number)}
                      title={`Seek to ${caption}`}
                      className="block text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    >
                      {thumb}
                    </button>
                  ) : (
                    <span className="block">{thumb}</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}

        {showDraftPanel ? (
          <div className="flex max-w-full flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
            {proposeDrafts.map((draft, index) => (
              <p key={`propose-${index}`} className="text-[13px] leading-5 text-white/45">
                {draft.kind === 'propose' ? draft.description : ''} — {PROPOSE_NOT_APPLIED_MESSAGE}
              </p>
            ))}
            {actionableDrafts.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-white/60">
                  {actionableDrafts.map((draft) => draft.summary).join(' · ')}
                </span>
                {onApplyActions ? (
                  <button
                    type="button"
                    onClick={() => onApplyActions(actionableDrafts, message.id)}
                    className="rounded-full border border-white/15 px-3 py-1 text-[13px] text-white/85 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    Apply
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDismissActions?.(message.id)}
                  className="rounded-full px-3 py-1 text-[13px] text-white/40 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isUser && actionOutcome === 'applied' ? (
          <p className="text-[12px] text-white/35">Applied</p>
        ) : null}
      </div>
    </article>
  )
}

function EmptyChatGreeting({ greeting }: { greeting: string }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-24 text-center">
      <CinematicTextReveal
        as="h1"
        variant="measured"
        className="max-w-4xl text-balance font-display text-[clamp(2.25rem,5.2vw,5.75rem)] font-normal leading-[0.95] tracking-normal text-white/92"
      >
        {greeting}
      </CinematicTextReveal>
    </div>
  )
}
