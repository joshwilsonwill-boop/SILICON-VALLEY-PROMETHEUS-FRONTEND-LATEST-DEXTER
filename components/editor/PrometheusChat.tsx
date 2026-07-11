'use client'

import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUp, ImageIcon, PanelLeft, Video, X } from 'lucide-react'

import { cn } from '@/lib/utils'

const PROMETHEUS_LOGO_SRC = '/branding/prometheus-logo-no-bg.png'
const PROMETHEUS_ORIGINAL_LOGO_ASSET = 'prometheus original logo.png'

export type PrometheusChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
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
    pills: [
      { id: 'demo-pill-01', label: 'Opening pass' },
      { id: 'demo-pill-02', label: 'Pacing notes' },
    ],
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
  actions = defaultActions,
  historyItems = defaultHistoryItems,
  title = 'Current Chat',
  thinking = false,
  draft,
  onDraftChange,
  onAttachImage,
  onAttachVideo,
  onClose,
  className,
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
}) {
  const reduceMotion = Boolean(useReducedMotion())
  const [internalDraft, setInternalDraft] = React.useState('')
  const [historyExpanded, setHistoryExpanded] = React.useState(false)
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false)
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null)
  const latestMessageRef = React.useRef<HTMLDivElement | null>(null)
  const pinnedToBottomRef = React.useRef(true)
  const composedDraft = draft ?? internalDraft
  const hasDraft = composedDraft.trim().length > 0
  const showingThinking = thinking || messages.some((message) => message.status === 'thinking')
  const lastMessage = messages[messages.length - 1]
  const latestAssistantMessageId = React.useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index]
      if (message?.role === 'assistant' && message.status !== 'thinking' && message.content.trim().length > 0) {
        return message.id
      }
    }
    return null
  }, [messages])

  const setDraft = React.useCallback(
    (value: string) => {
      if (onDraftChange) {
        onDraftChange(value)
        return
      }
      setInternalDraft(value)
    },
    [onDraftChange],
  )

  const scrollToLatest = React.useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const viewport = scrollViewportRef.current
      if (!viewport) return

      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: reduceMotion ? 'auto' : behavior,
      })
      pinnedToBottomRef.current = true
      setShowJumpToLatest(false)
    },
    [reduceMotion],
  )

  const handleThreadScroll = React.useCallback(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    const isPinned = distanceFromBottom < 112
    pinnedToBottomRef.current = isPinned
    setShowJumpToLatest(!isPinned && messages.length > 0)
  }, [messages.length])

  React.useEffect(() => {
    if (!messages.length && !showingThinking) return

    const rafId = window.requestAnimationFrame(() => {
      if (pinnedToBottomRef.current || lastMessage?.role === 'user') {
        scrollToLatest(reduceMotion ? 'auto' : 'smooth')
        return
      }

      setShowJumpToLatest(true)
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [lastMessage?.content, lastMessage?.id, lastMessage?.role, messages.length, reduceMotion, scrollToLatest, showingThinking])

  React.useEffect(() => {
    const rafId = window.requestAnimationFrame(handleThreadScroll)
    return () => window.cancelAnimationFrame(rafId)
  }, [handleThreadScroll, historyExpanded])

  const handleSend = React.useCallback(async () => {
    const message = composedDraft.trim()
    if (!message) return

    if (!onDraftChange) setInternalDraft('')
    pinnedToBottomRef.current = true
    setShowJumpToLatest(false)
    await onSend(message)
  }, [composedDraft, onDraftChange, onSend])

  return (
    <section
      className={cn(
        'prometheus-luxury-chat relative flex min-h-[100dvh] w-full overflow-hidden bg-black font-sans text-[#E8E8E8]',
        className,
      )}
      aria-label="Prometheus chat"
    >
      <PrometheusChatStyles />
      <SpectraNoiseFallback />
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="group absolute right-4 top-4 z-40 grid size-10 place-items-center rounded-full border border-white/10 bg-black/35 text-white/52 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition-[border-color,background-color,color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label="Collapse editorial chat"
        >
          <X className="size-4 transition-transform duration-300 group-hover:rotate-90" strokeWidth={1.6} />
        </button>
      ) : null}
      <aside
        className="relative z-10 hidden shrink-0 overflow-hidden border-r border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] md:block"
        style={{
          width: historyExpanded ? 260 : 56,
          transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        aria-label="Chat history"
      >
        <button
          type="button"
          onClick={() => setHistoryExpanded((expanded) => !expanded)}
          className="mx-auto mt-6 flex h-9 w-9 items-center justify-center text-[#777] transition-colors duration-300 hover:text-[#CCC]"
          aria-label={historyExpanded ? 'Collapse chat history' : 'Expand chat history'}
        >
          <PanelLeft className="size-4" strokeWidth={1.5} />
        </button>
        <nav className="mt-8 space-y-1 px-4" aria-label="Previous chats">
          {historyItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'block w-full truncate py-2 text-left text-[13px] text-[#777] transition-colors duration-300 hover:text-[#CCC]',
                item.active && 'border-l border-[rgba(255,255,255,0.15)] pl-3 text-[#DDD]',
                !historyExpanded && 'opacity-0',
              )}
              tabIndex={historyExpanded ? 0 : -1}
            >
              <KineticText text={item.title} active={historyExpanded} />
            </button>
          ))}
        </nav>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <p className="pt-6 text-center text-xs font-normal uppercase tracking-[0.2em] text-[#555]">
          <KineticText text={title} active />
        </p>

        <div
          ref={scrollViewportRef}
          onScroll={handleThreadScroll}
          className="prometheus-luxury-scroll min-h-0 flex-1 overflow-y-auto px-8 pb-32 pt-12 md:px-24 lg:px-32"
        >
          {messages.length === 0 ? <EmptyChatWatermark /> : null}
          <div className="flex flex-col gap-6">
            {messages.map((message, index) => (
              <PrometheusMessageBubble
                key={message.id}
                message={message}
                index={index}
                isLatestAssistant={message.id === latestAssistantMessageId}
              />
            ))}
            <div ref={latestMessageRef} aria-hidden className="h-px w-full" />
          </div>
        </div>

        <AnimatePresence>
          {showJumpToLatest ? (
            <motion.button
              type="button"
              aria-label="Scroll to latest response"
              onClick={() => scrollToLatest('auto')}
              className="absolute bottom-[8.75rem] right-6 z-40 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/62 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/74 shadow-[0_18px_44px_-28px_rgba(0,0,0,0.98),0_0_28px_-22px_rgba(156,134,255,0.8)] backdrop-blur-2xl transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-white/24 hover:text-white md:right-12"
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96, filter: 'blur(8px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98, filter: 'blur(6px)' }}
              transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="relative grid size-6 place-items-center rounded-full bg-white/[0.07]">
                <ArrowDown className="size-3.5" />
                <span className="absolute inset-0 rounded-full border border-white/10" />
              </span>
              Latest
            </motion.button>
          ) : null}
        </AnimatePresence>

        {showingThinking ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex flex-col items-center gap-3">
              <LiquidMetalFallback size={48} />
              <span className="text-[11px] font-normal uppercase tracking-[0.15em] text-[#555]">Thinking...</span>
            </div>
          </motion.div>
        ) : null}

        <div className="fixed bottom-0 left-0 right-0 z-30 px-6 pb-6 pt-4">
          <div className="mx-auto max-w-3xl">
            <div className="prometheus-luxury-scroll flex gap-2 overflow-x-auto pb-3">
              {actions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.id}
                    type="button"
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-transparent px-4 py-1.5 text-[12px] font-normal text-[#666] transition-all duration-300 hover:border-[#333] hover:text-[#CCC]"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, filter: 'blur(8px)' }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: reduceMotion ? 0 : 0.26, delay: Math.min(index * 0.035, 0.18), ease: [0.22, 1, 0.36, 1] }}
                  >
                    {Icon ? <Icon className="size-3.5 text-[#555]" /> : null}
                    <KineticText text={action.label} active />
                  </motion.button>
                )
              })}
            </div>

            <form
              className="flex items-center gap-3 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.82)] px-6 py-3 backdrop-blur-[24px]"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSend()
              }}
            >
              <button
                type="button"
                onClick={onAttachImage}
                className="text-[#555] transition-colors hover:text-[#AAA]"
                aria-label="Attach image"
              >
                <ImageIcon className="size-5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={onAttachVideo}
                className="text-[#555] transition-colors hover:text-[#AAA]"
                aria-label="Attach video"
              >
                <Video className="size-5" strokeWidth={1.5} />
              </button>
              <input
                value={composedDraft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Prometheus..."
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] font-normal leading-6 text-[#DDD] outline-none placeholder:text-[#444]"
              />
              <button
                type="submit"
                disabled={!hasDraft}
                className={cn(
                  'text-[#777] transition-all hover:text-[#EEE] disabled:pointer-events-none disabled:opacity-0',
                  hasDraft ? 'opacity-100' : 'opacity-0',
                )}
                aria-label="Send message"
              >
                <ArrowUp className="size-6" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

function PrometheusMessageBubble({
  message,
  index,
  isLatestAssistant,
}: {
  message: PrometheusChatMessage
  index: number
  isLatestAssistant: boolean
}) {
  const isUser = message.role === 'user'
  const isThinking = message.status === 'thinking'

  return (
    <motion.article
      className={cn('flex flex-col', isUser ? 'items-end self-end' : 'items-start self-start')}
      initial={{ opacity: 0, y: isUser ? 8 : 12, filter: isUser ? 'blur(4px)' : 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: isUser ? 0.35 : 0.45, delay: !isUser && index > 0 ? 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          'max-w-[75%] px-5 py-3.5 text-[15px] font-normal leading-[1.5]',
          isUser
            ? 'max-w-[70%] rounded-[16px_16px_4px_16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-[#EAEAEA]'
            : 'rounded-[4px_16px_16px_16px] border-l border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] text-[#EAEAEA]',
        )}
      >
        {isThinking ? <PrometheusTypingOrbit /> : <StreamingResponseText content={message.content} active={!isUser && isLatestAssistant} />}
      </div>
      {message.pills?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.pills.map((pill, pillIndex) => (
            <motion.span
              key={pill.id}
              className="rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-4 py-1.5 text-[12px] font-normal text-[#999] transition-colors duration-300 hover:border-[#444] hover:text-[#DDD]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.08 + pillIndex * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <KineticText text={pill.label} active />
            </motion.span>
          ))}
        </div>
      ) : null}
    </motion.article>
  )
}

function StreamingResponseText({ content, active }: { content: string; active: boolean }) {
  const reduceMotion = Boolean(useReducedMotion())
  const tokens = React.useMemo(() => content.split(/(\s+)/).filter(Boolean), [content])
  const [visibleTokenCount, setVisibleTokenCount] = React.useState(active && !reduceMotion ? 0 : tokens.length)
  const isStreaming = active && !reduceMotion && visibleTokenCount < tokens.length

  React.useEffect(() => {
    if (!active || reduceMotion || tokens.length === 0) {
      setVisibleTokenCount(tokens.length)
      return
    }

    let visible = 0
    let timeoutId: number | null = null
    setVisibleTokenCount(0)

    const step = () => {
      visible = Math.min(tokens.length, visible + (tokens.length > 140 ? 4 : 2))
      setVisibleTokenCount(visible)
      if (visible < tokens.length) {
        timeoutId = window.setTimeout(step, tokens.length > 140 ? 14 : 24)
      }
    }

    timeoutId = window.setTimeout(step, 90)

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [active, content, reduceMotion, tokens.length])

  return (
    <p className="prometheus-response-gradient-text whitespace-pre-wrap">
      {tokens.slice(0, visibleTokenCount).map((token, tokenIndex) => (
        <motion.span
          key={`${tokenIndex}-${token}`}
          initial={active && !reduceMotion ? { opacity: 0, y: 3, filter: 'blur(5px)' } : false}
          animate={active && !reduceMotion ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {token}
        </motion.span>
      ))}
      {isStreaming ? <StreamingPulseDot /> : null}
    </p>
  )
}

function StreamingPulseDot() {
  return (
    <span className="prometheus-streaming-orbit ml-1 inline-grid size-4 translate-y-[2px] place-items-center" aria-hidden>
      <span />
    </span>
  )
}

function PrometheusTypingOrbit() {
  return (
    <span className="prometheus-typing-orbit inline-flex items-center gap-2" aria-label="Thinking">
      <span className="prometheus-typing-orbit__dot" />
      <span className="prometheus-typing-orbit__track">
        <span />
      </span>
    </span>
  )
}

function KineticText({ text, active }: { text: string; active: boolean }) {
  const reduceMotion = Boolean(useReducedMotion())
  const words = React.useMemo(() => text.split(' '), [text])

  if (reduceMotion || !active) return <>{text}</>

  return (
    <span className="inline-flex flex-wrap items-center gap-x-[0.35em] gap-y-0">
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.34, delay: Math.min(index * 0.035, 0.28), ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

function SpectraNoiseFallback() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-100"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-black" />
      <div className="prometheus-luxury-gradient-field absolute inset-[-24%]" />
      <div className="prometheus-spectra-noise absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_34%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.68)_100%)]" />
    </div>
  )
}

function LiquidMetalFallback({ size = 48 }: { size?: number }) {
  return (
    <div
      className="prometheus-liquid-metal relative overflow-hidden rounded-[12px]"
      style={{ height: size, width: size }}
      aria-label={`Liquid metal Prometheus logo fallback for ${PROMETHEUS_ORIGINAL_LOGO_ASSET}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PROMETHEUS_LOGO_SRC}
        alt=""
        className="h-full w-full object-contain opacity-95 [filter:grayscale(1)_contrast(1.35)_brightness(1.55)]"
        draggable={false}
      />
      <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_18%,rgba(255,255,255,0.72)_44%,rgba(180,180,180,0.18)_58%,rgba(255,255,255,0)_78%)] mix-blend-screen" />
    </div>
  )
}

function EmptyChatWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 grid select-none place-items-center text-[40vh] font-normal leading-none text-white/[0.03]">
      P
    </div>
  )
}

function PrometheusChatStyles() {
  return (
    <style>{`
      .prometheus-luxury-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.08) transparent;
      }

      .prometheus-luxury-scroll::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      .prometheus-luxury-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .prometheus-luxury-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.08);
        border-radius: 4px;
      }

      .prometheus-response-gradient-text {
        color: rgba(238, 238, 238, 0.92);
        background-image: linear-gradient(110deg, rgba(255,255,255,0.72) 0%, rgba(214,255,247,0.96) 18%, rgba(255,255,255,0.82) 38%, rgba(178,189,255,0.94) 58%, rgba(255,255,255,0.72) 100%);
        background-size: 260% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        animation: prometheusTextGradientPass 7s ease-in-out infinite;
      }

      .prometheus-spectra-noise {
        background-image:
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.035) 0 1px, transparent 1.2px),
          radial-gradient(circle at 50% 50%, rgba(148,120,255,0.025) 0 1px, transparent 1.2px);
        background-size: 6px 6px, 10px 10px;
        mask-image: radial-gradient(circle at 50% 42%, black 0%, rgba(0,0,0,0.74) 44%, transparent 86%);
        animation: prometheusNoiseDrift 8s steps(10) infinite;
      }

      .prometheus-luxury-gradient-field {
        background:
          radial-gradient(circle at 18% 26%, rgba(103,79,255,0.2) 0%, rgba(103,79,255,0) 28%),
          radial-gradient(circle at 78% 18%, rgba(74,144,255,0.18) 0%, rgba(74,144,255,0) 30%),
          radial-gradient(circle at 62% 80%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 32%),
          linear-gradient(135deg, #020204 0%, #090713 42%, #000 100%);
        background-size: 120% 120%, 110% 110%, 140% 140%, 100% 100%;
        filter: saturate(1.12);
        opacity: 0.82;
        animation: prometheusGradientDrift 14s cubic-bezier(0.45, 0, 0.2, 1) infinite alternate;
      }

      .prometheus-liquid-metal img {
        animation: prometheusLiquidRipple 4.8s ease-in-out infinite;
      }

      .prometheus-liquid-metal span {
        animation: prometheusMetalSweep 3.6s ease-in-out infinite;
      }

      .prometheus-streaming-orbit {
        position: relative;
      }

      .prometheus-streaming-orbit::before {
        content: '';
        position: absolute;
        inset: 2px;
        border-radius: 9999px;
        border: 1px solid rgba(214,255,247,0.34);
        animation: prometheusOrbitRing 1.05s ease-in-out infinite;
      }

      .prometheus-streaming-orbit > span {
        width: 5px;
        height: 5px;
        border-radius: 9999px;
        background: rgba(214,255,247,0.9);
        box-shadow: 0 0 16px rgba(156,134,255,0.62);
        animation: prometheusStreamingDot 0.95s cubic-bezier(0.45, 0, 0.2, 1) infinite;
      }

      .prometheus-typing-orbit__dot {
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: rgba(214,255,247,0.78);
        box-shadow: 0 0 22px rgba(156,134,255,0.55);
        animation: prometheusTypingPulse 1.1s ease-in-out infinite;
      }

      .prometheus-typing-orbit__track {
        position: relative;
        width: 36px;
        height: 16px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.025);
        overflow: hidden;
      }

      .prometheus-typing-orbit__track > span {
        position: absolute;
        top: 50%;
        left: 3px;
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: rgba(255,255,255,0.8);
        transform: translate3d(0,-50%,0);
        animation: prometheusTypingTravel 1.25s cubic-bezier(0.45, 0, 0.2, 1) infinite;
      }

      @keyframes prometheusTextGradientPass {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      @keyframes prometheusNoiseDrift {
        0% { transform: translate3d(0, 0, 0); opacity: 0.42; }
        25% { transform: translate3d(-0.8%, 0.8%, 0); opacity: 0.56; }
        50% { transform: translate3d(0.8%, -0.8%, 0); opacity: 0.48; }
        75% { transform: translate3d(0.4%, 1.2%, 0); opacity: 0.58; }
        100% { transform: translate3d(0, 0, 0); opacity: 0.42; }
      }

      @keyframes prometheusGradientDrift {
        0% { transform: translate3d(-2%, -1%, 0) scale(1); background-position: 0% 40%, 80% 20%, 50% 100%, 0 0; }
        45% { transform: translate3d(1.5%, 1%, 0) scale(1.035); background-position: 38% 24%, 60% 48%, 42% 72%, 0 0; }
        100% { transform: translate3d(2%, -1.5%, 0) scale(1.06); background-position: 70% 56%, 24% 24%, 64% 40%, 0 0; }
      }

      @keyframes prometheusLiquidRipple {
        0%, 100% { transform: scale(0.98) skewX(0deg); filter: grayscale(1) contrast(1.35) brightness(1.55) blur(0px); }
        40% { transform: scale(1.04) skewX(-4deg); filter: grayscale(1) contrast(1.55) brightness(1.9) blur(0.2px); }
        70% { transform: scale(1.01) skewX(3deg); filter: grayscale(1) contrast(1.2) brightness(1.45) blur(0px); }
      }

      @keyframes prometheusMetalSweep {
        0%, 100% { transform: translateX(-120%); opacity: 0.2; }
        50% { transform: translateX(120%); opacity: 0.86; }
      }

      @keyframes prometheusOrbitRing {
        0%, 100% { opacity: 0.28; transform: scale(0.86); }
        50% { opacity: 0.72; transform: scale(1.08); }
      }

      @keyframes prometheusStreamingDot {
        0%, 100% { transform: translate3d(-2px, 1px, 0) scale(0.86); opacity: 0.56; }
        50% { transform: translate3d(3px, -2px, 0) scale(1.08); opacity: 1; }
      }

      @keyframes prometheusTypingPulse {
        0%, 100% { transform: scale(0.86); opacity: 0.48; }
        50% { transform: scale(1.14); opacity: 1; }
      }

      @keyframes prometheusTypingTravel {
        0%, 100% { transform: translate3d(0,-50%,0) scale(0.8); opacity: 0.5; }
        50% { transform: translate3d(22px,-50%,0) scale(1); opacity: 1; }
      }
    `}</style>
  )
}

const defaultActions: PrometheusChatAction[] = [
  { id: 'generate-code', label: 'Generate Code' },
  { id: 'launch-app', label: 'Launch App' },
  { id: 'ui-components', label: 'UI Components' },
  { id: 'theme-ideas', label: 'Theme Ideas' },
  { id: 'image-assets', label: 'Image Assets' },
]

const defaultHistoryItems: PrometheusChatHistoryItem[] = [
  { id: 'current', title: 'Current edit pass', active: true },
  { id: 'creative-workflow', title: 'Creative workflow notes' },
  { id: 'system-overview', title: 'System overview' },
]
