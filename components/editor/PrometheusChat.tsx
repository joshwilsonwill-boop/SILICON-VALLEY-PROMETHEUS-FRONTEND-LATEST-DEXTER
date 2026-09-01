'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowDown, ArrowUp, Brain, ChevronDown, LoaderCircle, Mic, Volume2, X } from 'lucide-react'

import { useAuth } from '@/components/auth/auth-provider'
import { useAIChat, type AIChatContextProvider, type AIChatFrameReference, type CarouselItem } from '@/hooks/use-ai-chat'
import type { ChatMediaItem, ChatMediaJob } from '@/lib/prometheus-assistant/chat-media'
import { useProfile } from '@/hooks/use-profile'
import { PROPOSE_NOT_APPLIED_MESSAGE, type EditorActionDraft } from '@/lib/editor-actions'
import { getChatGreeting } from '@/lib/user/display-name'
import { cn } from '@/lib/utils'
import { useVoiceInput } from '@/hooks/use-voice-input'

import { AIChatHistoryButton } from './ai-chat-history-button'
import { ChatCarousel } from './chat-carousel'
import { ElegistChatGreeting } from './elegist-chat-greeting'
import { ChatSuggestions } from './ai-chat-suggestions'
import { PrometheusChatHistoryDrawer } from './prometheus-chat-history-drawer'
import { PrometheusChatMarkdown } from './prometheus-chat-markdown'
import { PrometheusChatActivity } from './prometheus-chat-activity'
import { PrometheusChatContextBrief } from './prometheus-chat-context-brief'
import { PrometheusChatLoadingSkeleton } from './prometheus-chat-loading-skeleton'
import { PrometheusChatMedia } from './prometheus-chat-media'
import { VoiceWaveform } from './voice-waveform'

export type PrometheusChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isComplete?: boolean
  status?: 'ready' | 'thinking'
  thoughts?: string[]
  pills?: Array<{
    id: string
    label: string
  }>
  frames?: AIChatFrameReference[]
  toolCalls?: unknown[]
  actionDrafts?: EditorActionDraft[]
  carousel?: CarouselItem[]
  suggestions?: string[]
  media?: ChatMediaItem[]
  jobs?: ChatMediaJob[]
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
  const [voiceMode, setVoiceMode] = React.useState(false)
  const [speakingMessageId, setSpeakingMessageId] = React.useState<string | null>(null)
  const [actionOutcomes, setActionOutcomes] = React.useState<Record<string, 'applied' | 'dismissed'>>({})
  const historyButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null)
  const pinnedToBottomRef = React.useRef(true)
  const spokenMessageIdsRef = React.useRef(new Set<string>())

  const persistedMessages = React.useMemo<PrometheusChatMessage[]>(
    () => persistentChat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      isComplete: message.isComplete,
      thoughts: message.thoughts,
      frames: message.frames,
      toolCalls: message.toolCalls,
      actionDrafts: message.actionDrafts,
      carousel: message.carousel,
      suggestions: message.suggestions,
      media: message.media,
      jobs: message.jobs,
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
    ? Boolean(persistentChat.isSending || persistentChat.isAwaitingResponse || persistentChat.streamStatus)
    : thinking || renderedMessages.some((message) => message.status === 'thinking')
  const lastMessage = renderedMessages[renderedMessages.length - 1]
  const videoContext = persistentChat.videoContext
  const isVideoContextLoading = persistentChat.isVideoContextLoading
  const videoPresent = videoContext?.status === 'video' || Boolean(videoContext?.video)

  const stopSpokenReply = React.useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeakingMessageId(null)
  }, [])

  const latestSpeakableMessage = React.useMemo(
    () => [...renderedMessages].reverse().find((message) =>
      message.role === 'assistant' && (message.isComplete ?? true) && message.content.trim().length > 0,
    ) ?? null,
    [renderedMessages],
  )

  React.useEffect(() => {
    if (!voiceMode || !latestSpeakableMessage || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (spokenMessageIdsRef.current.has(latestSpeakableMessage.id)) return

    spokenMessageIdsRef.current.add(latestSpeakableMessage.id)
    const utterance = new SpeechSynthesisUtterance(latestSpeakableMessage.content)
    utterance.rate = 1.02
    utterance.pitch = 1
    utterance.onstart = () => setSpeakingMessageId(latestSpeakableMessage.id)
    utterance.onend = () => setSpeakingMessageId(null)
    utterance.onerror = () => setSpeakingMessageId(null)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [latestSpeakableMessage, voiceMode])

  React.useEffect(() => stopSpokenReply, [stopSpokenReply])

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

  const voice = useVoiceInput({
    onTranscript: (text) => {
      const prefix = composedDraft.trim() ? `${composedDraft.trim()} ` : ''
      setDraft(`${prefix}${text}`)
      inputRef.current?.focus()
    },
  })

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

  const suggestionsHidden = usesPersistentChat
    ? persistentChat.isSending || persistentChat.isAwaitingResponse
    : thinking

  const handleSuggestionSelect = React.useCallback(
    (suggestion: string) => {
      if (turnSuggestions?.includes(suggestion)) {
        void persistentChat.sendMessage(suggestion)
        return
      }
      setDraft(suggestion)
      inputRef.current?.focus()
    },
    [persistentChat, setDraft, turnSuggestions],
  )

  const scrollToLatest = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    viewport.scrollTo({ top: viewport.scrollHeight, behavior })
    pinnedToBottomRef.current = true
    setShowJumpToLatest(false)
  }, [])

  const handleCarouselSelect = React.useCallback(
    (item: CarouselItem) => {
      const message = item.payload?.message?.trim()
      if (!message) return
      pinnedToBottomRef.current = true
      setShowJumpToLatest(false)
      void persistentChat.sendMessage(message)
    },
    [persistentChat],
  )
  const handleMediaSelect = React.useCallback((item: ChatMediaItem) => {
    const time = typeof item.seconds === 'number' ? ` at ${item.seconds.toFixed(2)}s` : ''
    setDraft(`Edit the selected ${item.kind}${time}: ${item.title ?? item.id}`)
    inputRef.current?.focus()
  }, [setDraft])

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
      if (pinnedToBottomRef.current || lastMessage?.role === 'user') {
        scrollToLatest('auto')
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [lastMessage?.content, lastMessage?.id, lastMessage?.role, renderedMessages.length, scrollToLatest, showingThinking])

  const handleSend = React.useCallback(async () => {
    const message = composedDraft.trim()
    if (!message) return

    pinnedToBottomRef.current = true
    setShowJumpToLatest(false)
    stopSpokenReply()

    if (usesPersistentChat) {
      await persistentChat.sendMessage(message)
      return
    }

    if (!onDraftChange) setInternalDraft('')
    await onSend(message)
  }, [composedDraft, onDraftChange, onSend, persistentChat, stopSpokenReply, usesPersistentChat])

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
          {videoContext ? (
            <div className="mb-4 flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/30">
              {isVideoContextLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 animate-pulse rounded-full bg-white/40" />
                  Retrieving video metadata
                </span>
              ) : videoPresent ? (
                <span className="inline-flex items-center gap-2 truncate">
                  <span className="size-1.5 shrink-0 rounded-full bg-[#7ff2d4]/80" />
                  <span className="truncate">
                    {videoContext.video?.filename || 'Video loaded'}
                    {videoContext.video?.durationMs
                      ? ` · ${Math.floor(videoContext.video.durationMs / 60000)}:${String(Math.floor((videoContext.video.durationMs % 60000) / 1000)).padStart(2, '0')}`
                      : ''}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-white/20" />
                  No source video yet
                </span>
              )}
            </div>
          ) : null}
          {renderedMessages.length === 0 && !showingThinking ? (
            <div className="flex min-h-full items-center justify-center px-4 pb-24 text-center">
              {videoPresent ? (
                <PrometheusChatContextBrief
                  context={videoContext}
                  onPrompt={handleSuggestionSelect}
                  className="max-w-xl"
                />
              ) : (
                <ElegistChatGreeting
                  greeting={getChatGreeting(session?.user, profile)}
                  className="max-w-[52rem] text-balance text-[clamp(2.4rem,4.8vw,5.2rem)] font-normal leading-[0.9] tracking-normal text-white/92 [overflow-wrap:anywhere]"
                />
              )}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 py-8 md:py-12">
              {renderedMessages.map((message) => (
                <PrometheusMessageBubble
                  key={message.id}
                  message={message}
                  live={usesPersistentChat}
                  isLatestAssistant={message.id === latestSpeakableMessage?.id}
                  onPrompt={handleSuggestionSelect}
                  actionOutcome={actionOutcomes[message.id]}
                  onApplyActions={onApplyActions ? handleApplyActions : undefined}
                  onDismissActions={handleDismissActions}
                  onSeekToSec={onSeekToSec}
                  onCarouselSelect={handleCarouselSelect}
                  onMediaSelect={handleMediaSelect}
                  carouselDisabled={persistentChat.isSending || persistentChat.isAwaitingResponse}
                  onStreamingComplete={() => {
                    if (usesPersistentChat) persistentChat.completeAssistantMessage(message.id)
                  }}
                  onStreamingProgress={() => {
                    if (pinnedToBottomRef.current) scrollToLatest('auto')
                  }}
                />
              ))}
              <PrometheusChatActivity
                entries={persistentChat.streamActivity}
                active={showingThinking}
                intent={persistentChat.streamIntent}
                thoughts={lastMessage?.role === 'assistant' ? lastMessage.thoughts : []}
              />
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
          <ChatSuggestions
            workspaceTab={workspaceTab}
            suggestions={turnSuggestions}
            hasProject={Boolean(projectId)}
            lastMessageRole={lastMessage?.role}
            isVisible={!suggestionsHidden}
            onSelect={handleSuggestionSelect}
            layout="responsive"
            className={cn(
              "relative z-10 mx-auto -mb-6 w-full max-w-3xl pb-7",
              suggestionsHidden && "invisible pointer-events-none",
            )}
          />
          <form
            className="relative z-20 mx-auto flex min-h-14 w-full max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-black px-5 py-3 transition-colors focus-within:border-white/22"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSend()
            }}
          >
            {voice.state === 'recording' ? (
              <VoiceWaveform
                getLevel={voice.getLevel}
                inputRef={inputRef}
                onStop={() => voice.stop()}
              />
            ) : (
              <>
                <input
                  ref={inputRef}
                  value={composedDraft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask Prometheus…"
                  aria-label="Message Prometheus"
                  className="min-w-0 flex-1 border-none bg-transparent text-[15px] leading-6 text-white/88 outline-none placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (voice.state === 'transcribing') {
                      voice.stop()
                    } else {
                      stopSpokenReply()
                      void voice.start()
                    }
                  }}
                  disabled={persistentChat.isSending || persistentChat.isAwaitingResponse}
                  aria-label="Record voice input"
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20',
                  )}
                >
                  {voice.state === 'transcribing' ? (
                    <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Mic className="size-4" strokeWidth={1.5} />
                  )}
                </button>
                <button
                  type="button"
                  data-chat-voice-mode
                  aria-label={voiceMode ? 'Disable spoken replies' : 'Enable spoken replies'}
                  aria-pressed={voiceMode}
                  onClick={() => {
                    if (voiceMode) stopSpokenReply()
                    setVoiceMode((current) => !current)
                  }}
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20',
                    voiceMode || speakingMessageId ? 'bg-[#7ff2d4]/10 text-[#bffef0]' : 'text-white/45',
                  )}
                >
                  <Volume2 className="size-4" strokeWidth={1.5} />
                </button>
                <button
                  type="submit"
                  disabled={!hasDraft}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-20"
                  aria-label="Send message"
                >
                  <ArrowUp className="size-5" strokeWidth={1.5} />
                </button>
              </>
            )}
          </form>
          {voice.error ? (
            <p className="mx-auto mt-2 w-full max-w-3xl text-xs text-red-300/80" role="alert">
              {voice.error}
            </p>
          ) : null}
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

const PrometheusMessageBubble = React.memo(function PrometheusMessageBubble({
  message,
  live,
  actionOutcome,
  isLatestAssistant = false,
  onPrompt,
  onApplyActions,
  onDismissActions,
  onSeekToSec,
  onCarouselSelect,
  onMediaSelect,
  carouselDisabled = false,
  onStreamingComplete,
  onStreamingProgress,
}: {
  message: PrometheusChatMessage
  live: boolean
  isLatestAssistant?: boolean
  onPrompt?: (text: string) => void
  actionOutcome?: 'applied' | 'dismissed'
  onApplyActions?: (drafts: EditorActionDraft[], messageId: string) => void
  onDismissActions?: (messageId: string) => void
  onSeekToSec?: (seconds: number) => void
  onCarouselSelect?: (item: CarouselItem) => void
  onMediaSelect?: (item: ChatMediaItem) => void
  carouselDisabled?: boolean
  onStreamingComplete: () => void
  onStreamingProgress: () => void
}) {
  const isUser = message.role === 'user'
  const isThinking = message.status === 'thinking'
  const [showThoughts, setShowThoughts] = React.useState(false)

  if (isThinking) {
    return <PrometheusChatLoadingSkeleton className="max-w-[18rem] py-2" />
  }

  const drafts = message.actionDrafts ?? []
  const actionableDrafts = drafts.filter((draft) => draft.kind !== 'propose')
  const proposeDrafts = drafts.filter((draft) => draft.kind === 'propose')
  const messageComplete = message.isComplete ?? true
  const showDraftPanel = !isUser && messageComplete && drafts.length > 0 && !actionOutcome
  const frames = isUser ? [] : (message.frames ?? []).filter((frame) => frame.thumbnailUrl)

  const thoughts = message.thoughts ?? []
  const showThoughtsResolved = message.isComplete === false ? true : showThoughts

  return (
    <article className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[82%] flex-col gap-3 md:max-w-[74%]', isUser ? 'items-end' : 'items-start')}>
        {!isUser && thoughts.length > 0 ? (
          <div className="flex w-full flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={() => setShowThoughts((prev) => !prev)}
              aria-expanded={showThoughtsResolved}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/60 transition-all hover:border-amber-500/30 hover:text-amber-300"
            >
              <Brain className={cn('size-3 text-amber-400/80', message.isComplete === false && 'animate-pulse')} />
              <span>{thoughts.length} thinking {thoughts.length === 1 ? 'step' : 'steps'}</span>
              <ChevronDown className={cn('size-3 transition-transform duration-200', showThoughtsResolved && 'rotate-180')} />
            </button>
            {showThoughtsResolved ? (
              <div className="w-full space-y-1.5 border-l border-amber-500/20 py-1 pl-3 font-mono text-xs text-white/50">
                {thoughts.map((thought, idx) => (
                  <div key={`thought-${idx}-${thought.slice(0, 10)}`} className="leading-snug">
                    <span className="mr-1.5 text-amber-400/40">{idx + 1}.</span>
                    {thought}
                  </div>
                ))}
                {message.isComplete === false ? (
                  <div className="flex items-center gap-1.5 text-amber-400/50">
                    <span className="size-1.5 animate-pulse rounded-full bg-amber-400/60" />
                    Thinking…
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            'text-[15px] leading-7',
            isUser
              ? 'whitespace-pre-wrap rounded-2xl rounded-br-md border border-white/10 bg-white/[0.055] px-5 py-3.5 text-white/90'
              : 'text-white/78',
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <PrometheusChatMarkdown
              content={message.content}
              isComplete={messageComplete}
              onComplete={onStreamingComplete}
              onProgress={onStreamingProgress}
            />
          )}
        </div>

        {!isUser && message.carousel ? (
          <ChatCarousel
            items={message.carousel}
            disabled={carouselDisabled}
            onSelect={(item) => onCarouselSelect?.(item)}
          />
        ) : null}
        {!isUser ? (
          <PrometheusChatMedia
            media={message.media}
            jobs={message.jobs}
            onSelect={onMediaSelect}
          />
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

        {!isUser && isLatestAssistant && messageComplete && onPrompt ? (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onPrompt('Continue the plan from where you stopped. Complete the full breakdown.')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/50 transition-all hover:border-[#7ff2d4]/30 hover:bg-[#7ff2d4]/[0.04] hover:text-[#7ff2d4]"
            >
              <span>Continue plan</span>
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
})
