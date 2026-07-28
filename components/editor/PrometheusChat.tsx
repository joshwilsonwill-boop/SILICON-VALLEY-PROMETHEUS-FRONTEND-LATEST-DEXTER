'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { useAIChat } from '@/hooks/use-ai-chat'
import { useProfile } from '@/hooks/use-profile'
import { getChatGreeting } from '@/lib/user/display-name'
import { cn } from '@/lib/utils'

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
}

export type PrometheusChatAction = {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
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
}: {
  messages: PrometheusChatMessage[]
  onSend: (message: string) => void | Promise<void>
  actions?: PrometheusChatAction[]
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
}) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const persistentChat = useAIChat({ projectId, enabled: Boolean(projectId) })
  const [internalDraft, setInternalDraft] = React.useState('')
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false)
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null)
  const pinnedToBottomRef = React.useRef(true)

  const persistedMessages = React.useMemo<PrometheusChatMessage[]>(
    () => persistentChat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      isComplete: message.isComplete,
    })),
    [persistentChat.messages],
  )
  const renderedMessages = projectId ? persistedMessages : messages
  const composedDraft = projectId ? persistentChat.draft : draft ?? internalDraft
  const hasDraft = composedDraft.trim().length > 0
  const showingThinking = projectId
    ? persistentChat.isAwaitingResponse
    : thinking || renderedMessages.some((message) => message.status === 'thinking')
  const lastMessage = renderedMessages[renderedMessages.length - 1]

  const setDraft = React.useCallback(
    (value: string) => {
      if (projectId) {
        persistentChat.setDraft(value)
        return
      }
      if (onDraftChange) {
        onDraftChange(value)
        return
      }
      setInternalDraft(value)
    },
    [onDraftChange, persistentChat, projectId],
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

    if (projectId) {
      await persistentChat.sendMessage(message)
      return
    }

    if (!onDraftChange) setInternalDraft('')
    await onSend(message)
  }, [composedDraft, onDraftChange, onSend, persistentChat, projectId])

  return (
    <section
      className={cn(
        'relative flex min-h-[100dvh] w-full overflow-hidden bg-black font-sans text-white',
        className,
      )}
      aria-label="Prometheus chat"
    >
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
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-36 pt-10 md:px-10"
        >
          {renderedMessages.length === 0 && !showingThinking ? (
            <EmptyChatGreeting greeting={getChatGreeting(session?.user, profile)} />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-8 md:py-12">
              {renderedMessages.map((message) => (
                <PrometheusMessageBubble
                  key={message.id}
                  message={message}
                  onStreamingComplete={() => {
                    if (projectId) persistentChat.completeAssistantMessage(message.id)
                  }}
                  onStreamingProgress={() => {
                    if (pinnedToBottomRef.current) scrollToLatest('auto')
                  }}
                />
              ))}
              {showingThinking ? (
                <p className="text-sm text-white/38" role="status">Thinking…</p>
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

        <div className="absolute inset-x-0 bottom-0 z-20 bg-black px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 md:px-10 md:pb-7">
          <form
            className="mx-auto flex min-h-14 w-full max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-black px-5 py-3 transition-colors focus-within:border-white/22"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSend()
            }}
          >
            <input
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
    </section>
  )
}

function PrometheusMessageBubble({
  message,
  onStreamingComplete,
  onStreamingProgress,
}: {
  message: PrometheusChatMessage
  onStreamingComplete: () => void
  onStreamingProgress: () => void
}) {
  const isUser = message.role === 'user'
  const isThinking = message.status === 'thinking'

  if (isThinking) {
    return <p className="text-sm text-white/38" role="status">Thinking…</p>
  }

  return (
    <article className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] whitespace-pre-wrap text-[15px] leading-7 md:max-w-[74%]',
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
            isComplete={message.isComplete ?? true}
            onComplete={onStreamingComplete}
            onProgress={onStreamingProgress}
          />
        )}
      </div>
    </article>
  )
}

function EmptyChatGreeting({ greeting }: { greeting: string }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 pb-24 text-center">
      <h1
        className="max-w-4xl text-balance text-[clamp(2.25rem,5.2vw,5.75rem)] font-normal leading-[0.95] tracking-[-0.035em] text-white/92"
        style={{ fontFamily: 'var(--font-elegist), Georgia, serif' }}
      >
        {greeting}
      </h1>
    </div>
  )
}