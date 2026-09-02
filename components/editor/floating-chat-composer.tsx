'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  X,
  ImageIcon,
  Film,
  Sparkles,
  ArrowUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { useFrameTargeting } from '@/hooks/use-frame-targeting'
import { parseFrameReference } from '@/lib/editorial-frame/parse-frame-reference'
import { EditorialComposerFrameAssist } from '@/components/editor/editorial-composer-frame-assist'
import { FrameComposerDraftMirror } from '@/components/editor/frame-composer-draft-mirror'
import { chamberSpring } from '@/lib/chamber-motion'
import type {
  FrameAssistSubmission,
  FrameSuggestion,
  QueuedPreviewRevisionState
} from '@/lib/editorial-frame/types'

const CHAT_COMPOSER_FONT_STYLE = {
  fontFamily: '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif',
} satisfies React.CSSProperties

const CHAT_PLACEHOLDER_LINES = [
  'Sketch the next pass with a more cinematic rhythm...',
  'Carve the opener into something sharper and calmer...',
  'Let the pacing breathe, then land the hook earlier...',
  'Shape the visual beat so the tension rises cleaner...',
  'Push the framing toward something colder and bolder...',
  'Refine the cut until the emotional turn feels earned...',
  'Tune the motion so the whole pass feels more alive...',
] as const

function EyeOrb({
  target,
  reduceMotion,
}: {
  target?: { x: number; y: number } | null
  reduceMotion?: boolean
}) {
  return (
    <div
      className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.96)_48%,rgba(196,206,224,0.9)_100%)] shadow-[0_8px_20px_-14px_rgba(255,255,255,0.52),inset_0_1px_0_rgba(255,255,255,0.82)]"
    >
      <div
        className="absolute h-2.5 w-2.5 rounded-full bg-[#0b0e14] shadow-[0_0_10px_rgba(0,0,0,0.28)] transition-transform duration-300"
      />
    </div>
  )
}

function TypingEyes({
  target,
  reduceMotion = false,
}: {
  target?: { x: number; y: number } | null
  reduceMotion?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <EyeOrb target={target} reduceMotion={reduceMotion} />
      <EyeOrb target={target} reduceMotion={reduceMotion} />
    </div>
  )
}

export interface FloatingChatComposerProps {
  projectId: string
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (submission: FrameAssistSubmission) => void | Promise<void>
  onStop: () => void
  loading: boolean
  isOpen: boolean
  onOpenChange: (nextOpen: boolean) => void
  onOpenCommandOverlay?: () => void
  queuedPreviewRevision?: QueuedPreviewRevisionState | null
  onClearQueuedPreview?: () => void
}

export function FloatingChatComposer({
  projectId,
  draft,
  onDraftChange,
  onSubmit,
  onStop,
  loading,
  isOpen,
  onOpenChange,
  onOpenCommandOverlay,
  queuedPreviewRevision,
  onClearQueuedPreview,
}: FloatingChatComposerProps) {
  const reduceMotion = useStableReducedMotion()
  const composerId = React.useId()
  const hasDraft = draft.trim().length > 0
  const composerInputRef = React.useRef<HTMLInputElement | null>(null)
  const [isHandleHovered, setIsHandleHovered] = React.useState(false)
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0)
  const [placeholderText, setPlaceholderText] = React.useState('')
  const [placeholderPhase, setPlaceholderPhase] = React.useState<'typing' | 'holding' | 'deleting'>('typing')
  const [caretIndex, setCaretIndex] = React.useState(0)
  const [pendingSelectionRange, setPendingSelectionRange] = React.useState<{ start: number; end: number } | null>(null)
  const [suppressedAssistKey, setSuppressedAssistKey] = React.useState<string | null>(null)
  const [draftScrollLeft, setDraftScrollLeft] = React.useState(0)
  const frameAssist = useFrameTargeting({ projectId, draft, caretIndex })
  const draftMirrorAnalysis = React.useMemo(() => parseFrameReference(draft, draft.length), [draft])
  const frameAssistKey = React.useMemo(() => {
    if (!frameAssist.analysis.referenceText) return null
    return `${caretIndex}:${frameAssist.analysis.referenceStartIndex ?? 'na'}:${frameAssist.analysis.referenceEndIndex ?? 'na'}:${frameAssist.analysis.referenceText}`
  }, [
    caretIndex,
    frameAssist.analysis.referenceEndIndex,
    frameAssist.analysis.referenceStartIndex,
    frameAssist.analysis.referenceText,
  ])
  const isFrameAssistSuppressed = suppressedAssistKey !== null && suppressedAssistKey === frameAssistKey
  const isFrameAssistExpanded = Boolean(frameAssist.previewRegion || queuedPreviewRevision)
  const queuedPreviewRawText = queuedPreviewRevision?.request.rawText ?? null

  React.useEffect(() => {
    if (!isOpen) return

    const rafId = window.requestAnimationFrame(() => {
      composerInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen || hasDraft) return

    const currentLine = CHAT_PLACEHOLDER_LINES[placeholderIndex]
    let timeoutId: number | null = null

    if (placeholderPhase === 'typing') {
      if (placeholderText.length < currentLine.length) {
        timeoutId = window.setTimeout(() => {
          setPlaceholderText(currentLine.slice(0, placeholderText.length + 1))
        }, 55)
      } else {
        timeoutId = window.setTimeout(() => {
          setPlaceholderPhase('holding')
        }, 1200)
      }
    } else if (placeholderPhase === 'holding') {
      timeoutId = window.setTimeout(() => {
        setPlaceholderPhase('deleting')
      }, 450)
    } else if (placeholderText.length > 0) {
      timeoutId = window.setTimeout(() => {
        setPlaceholderText(currentLine.slice(0, placeholderText.length - 1))
      }, 28)
    } else {
      timeoutId = window.setTimeout(() => {
        setPlaceholderIndex((current) => (current + 1) % CHAT_PLACEHOLDER_LINES.length)
        setPlaceholderPhase('typing')
      }, 220)
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [hasDraft, isOpen, placeholderIndex, placeholderPhase, placeholderText])

  React.useEffect(() => {
    if (!hasDraft) {
      setDraftScrollLeft(0)
    }
  }, [hasDraft])

  React.useEffect(() => {
    if (suppressedAssistKey && suppressedAssistKey !== frameAssistKey) {
      setSuppressedAssistKey(null)
    }
  }, [frameAssistKey, suppressedAssistKey])

  React.useEffect(() => {
    const nextSelection = pendingSelectionRange
    if (!nextSelection) return

    const input = composerInputRef.current
    if (!input) return

    const rafId = window.requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(nextSelection.start, nextSelection.end)
      setPendingSelectionRange(null)
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [pendingSelectionRange])

  const handleFrameAssistRetarget = React.useCallback(() => {
    setSuppressedAssistKey(null)
    const input = composerInputRef.current
    if (input && frameAssist.analysis.referenceStartIndex !== null && frameAssist.analysis.referenceEndIndex !== null) {
      input.focus()
      input.setSelectionRange(frameAssist.analysis.referenceStartIndex, frameAssist.analysis.referenceEndIndex)
      setCaretIndex(frameAssist.analysis.referenceStartIndex)
      return
    }

    if (queuedPreviewRawText) {
      const restoredDraft = queuedPreviewRawText
      const restoredAnalysis = parseFrameReference(restoredDraft, restoredDraft.length)
      onDraftChange(restoredDraft)
      const nextCaretIndex = restoredAnalysis.referenceEndIndex ?? restoredDraft.length
      setCaretIndex(nextCaretIndex)
      setPendingSelectionRange({
        start: restoredAnalysis.referenceStartIndex ?? nextCaretIndex,
        end: nextCaretIndex,
      })
      return
    }

    composerInputRef.current?.focus()
  }, [
    frameAssist.analysis.referenceEndIndex,
    frameAssist.analysis.referenceStartIndex,
    onDraftChange,
    queuedPreviewRawText,
  ])

  const handleFrameAssistClear = React.useCallback(() => {
    const nextDraft = frameAssist.clearFrameTarget()
    onDraftChange(nextDraft)
    setCaretIndex(nextDraft.length)
    setPendingSelectionRange({ start: nextDraft.length, end: nextDraft.length })
    setSuppressedAssistKey(null)
    onClearQueuedPreview?.()
  }, [frameAssist, onClearQueuedPreview, onDraftChange])

  const handleFrameAssistSelect = React.useCallback(
    (suggestion: FrameSuggestion) => {
      const next = frameAssist.confirmSuggestion(suggestion)
      const nextAnalysis = parseFrameReference(next.nextDraft, next.nextCaretIndex)
      onDraftChange(next.nextDraft)
      setCaretIndex(next.nextCaretIndex)
      setPendingSelectionRange({ start: next.nextCaretIndex, end: next.nextCaretIndex })
      setSuppressedAssistKey(
        nextAnalysis.referenceText
          ? `${next.nextCaretIndex}:${nextAnalysis.referenceStartIndex ?? 'na'}:${nextAnalysis.referenceEndIndex ?? 'na'}:${nextAnalysis.referenceText}`
          : null,
      )
    },
    [frameAssist, onDraftChange],
  )

  const activeFrameSuggestion =
    frameAssist.suggestions.length > 0
      ? frameAssist.suggestions[
          frameAssist.clampSuggestionIndex(frameAssist.activeSuggestionIndex >= 0 ? frameAssist.activeSuggestionIndex : 0)
        ] ?? frameAssist.suggestions[0]
      : null

  const handleComposerSubmit = React.useCallback(async () => {
    const nextValue = draft.trim()
    if (!nextValue) return

    const revisionRequest = frameAssist.buildRevisionRequest()
    if (revisionRequest.frameTarget) {
      frameAssist.recordRecentTarget(revisionRequest)
    }

    await onSubmit({
      rawText: nextValue,
      analysis: frameAssist.analysis,
      revisionRequest,
    })
  }, [draft, frameAssist, onSubmit])

  const handleComposerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const hasVisibleSuggestions = frameAssist.isPopoverOpen && !isFrameAssistSuppressed && frameAssist.suggestions.length > 0

      if (event.key === 'Escape' && hasVisibleSuggestions) {
        event.preventDefault()
        if (frameAssistKey) {
          setSuppressedAssistKey(frameAssistKey)
        }
        return
      }

      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && hasVisibleSuggestions) {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 1 : -1
        frameAssist.setActiveSuggestionIndex((current) =>
          frameAssist.clampSuggestionIndex((current < 0 ? 0 : current) + delta),
        )
        return
      }

      if (event.key === 'Enter') {
        if (hasVisibleSuggestions && activeFrameSuggestion) {
          event.preventDefault()
          handleFrameAssistSelect(activeFrameSuggestion)
          return
        }

        if (!hasDraft) return
        event.preventDefault()
        void handleComposerSubmit()
      }
    },
    [
      activeFrameSuggestion,
      frameAssist,
      frameAssistKey,
      handleComposerSubmit,
      handleFrameAssistSelect,
      hasDraft,
      isFrameAssistSuppressed,
    ],
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center overflow-visible">
      <motion.div
        className={cn(
          'pointer-events-auto relative origin-bottom overflow-visible bg-[linear-gradient(135deg,rgba(146,163,255,0.34)_0%,rgba(127,242,212,0.26)_38%,rgba(255,255,255,0.16)_68%,rgba(140,113,255,0.3)_100%)] p-[1px] transition-[height,width,border-radius,box-shadow] duration-300',
          isOpen
            ? isFrameAssistExpanded
              ? 'h-[188px] w-[min(38rem,calc(100vw-3rem))] rounded-[30px]'
              : 'h-[128px] w-[min(38rem,calc(100vw-3rem))] rounded-[30px]'
            : isHandleHovered
              ? 'h-[74px] w-[min(20rem,calc(100vw-4rem))] rounded-[28px]'
              : 'h-14 w-14 rounded-full',
        )}
        style={CHAT_COMPOSER_FONT_STYLE}
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: 1,
                y: isOpen ? 0 : isHandleHovered ? -8 : 0,
                boxShadow: isOpen
                  ? '0 30px 56px -28px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04)'
                  : isHandleHovered
                    ? '0 24px 42px -28px rgba(0,0,0,0.86), 0 0 42px -24px rgba(127,242,212,0.48)'
                    : '0 14px 28px -24px rgba(0,0,0,0.86)',
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                type: 'spring',
                stiffness: 260,
                damping: 28,
                mass: 0.86,
              }
        }
        onMouseEnter={() => {
          if (!isOpen) setIsHandleHovered(true)
        }}
        onMouseLeave={() => {
          if (!isOpen) setIsHandleHovered(false)
        }}
      >
        {!isOpen ? (
          <button
            type="button"
            aria-label="Open chat composer"
            onClick={() => onOpenChange(true)}
            className="absolute inset-0 z-20 cursor-pointer"
          />
        ) : null}

        <div className="relative h-full w-full overflow-visible rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_34%),radial-gradient(circle_at_24%_120%,rgba(127,242,212,0.18)_0%,rgba(127,242,212,0)_42%),linear-gradient(180deg,rgba(18,18,24,0.98)_0%,rgba(8,8,12,0.98)_100%)] backdrop-blur-[30px]">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 bottom-2 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(127,242,212,0.72)_48%,rgba(255,255,255,0)_100%)]"
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: isOpen || isHandleHovered ? [0.26, 0.78, 0.34] : 0.22,
                    x: isOpen || isHandleHovered ? ['-10%', '10%', '-4%'] : '0%',
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 3.4,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }
            }
          />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10" />

          <AnimatePresence initial={false} mode="wait">
            {isOpen ? (
              <motion.div
                key="open-composer"
                className="relative flex h-full flex-col px-4 py-3"
                initial={reduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(10px)' }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 8, filter: 'blur(6px)' }}
                transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/38">
                    <motion.span
                      aria-hidden
                      className="size-1.5 rounded-full bg-[#7ff2d4]"
                      animate={reduceMotion ? undefined : { opacity: [0.44, 1, 0.44], scale: [0.92, 1.12, 0.92] }}
                      transition={{ duration: 2.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                    />
                    Editor Relay
                  </div>

                  <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
                    <TypingEyes reduceMotion={reduceMotion} />
                  </div>

                  <motion.button
                    type="button"
                    aria-label={hasDraft ? 'Collapse chat composer' : 'Close chat composer'}
                    onClick={() => onOpenChange(false)}
                    className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/54 transition-colors hover:text-white/82"
                    whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  >
                    <X className="size-3" />
                  </motion.button>
                </div>

                <EditorialComposerFrameAssist
                  suggestions={frameAssist.suggestions}
                  activeSuggestionIndex={frameAssist.activeSuggestionIndex}
                  isPopoverOpen={frameAssist.isPopoverOpen && !isFrameAssistSuppressed}
                  previewRegion={frameAssist.previewRegion}
                  queuedPreviewRevision={queuedPreviewRevision}
                  validationNote={frameAssist.analysis.validationNote}
                  onMoveActiveSuggestion={(delta) => {
                    frameAssist.setActiveSuggestionIndex((current) =>
                      frameAssist.clampSuggestionIndex((current < 0 ? 0 : current) + delta),
                    )
                  }}
                  onSelectSuggestion={handleFrameAssistSelect}
                  onDismissSuggestions={() => {
                    if (frameAssistKey) {
                      setSuppressedAssistKey(frameAssistKey)
                    }
                  }}
                  onClearFrameTarget={handleFrameAssistClear}
                  onRetargetFrameTarget={handleFrameAssistRetarget}
                  className="relative z-30 mt-2"
                />

                <div className="relative mt-2 flex-1 overflow-visible">
                  {!hasDraft ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
                      <div
                        className="flex items-center whitespace-nowrap text-[20px] italic leading-[1.35] tracking-[0.01em] text-white/40"
                        style={{
                          fontFamily: 'var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", serif',
                        }}
                      >
                        <span>{placeholderText}</span>
                        <motion.span
                          aria-hidden
                          className="ml-1 inline-block h-6 w-px bg-white/42"
                          animate={reduceMotion ? undefined : { opacity: [0.15, 0.9, 0.15] }}
                          transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {hasDraft ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
                      <FrameComposerDraftMirror
                        draft={draft}
                        analysis={draftMirrorAnalysis}
                        scrollLeft={draftScrollLeft}
                      />
                    </div>
                  ) : null}
                  <input
                    type="text"
                    id={composerId}
                    ref={composerInputRef}
                    value={draft}
                    onChange={(event) => {
                      onDraftChange(event.target.value)
                      setCaretIndex(event.target.selectionStart ?? event.target.value.length)
                      setDraftScrollLeft(event.currentTarget.scrollLeft)
                    }}
                    onClick={(event) => {
                      setCaretIndex(event.currentTarget.selectionStart ?? event.currentTarget.value.length)
                    }}
                    onScroll={(event) => {
                      setDraftScrollLeft(event.currentTarget.scrollLeft)
                    }}
                    onKeyUp={(event) => {
                      setCaretIndex(event.currentTarget.selectionStart ?? event.currentTarget.value.length)
                    }}
                    onSelect={(event) => {
                      setCaretIndex(event.currentTarget.selectionStart ?? event.currentTarget.value.length)
                    }}
                    onKeyDown={handleComposerKeyDown}
                    placeholder=""
                    className={cn(
                      'relative z-10 h-full w-full overflow-hidden bg-transparent px-0 py-0 text-[20px] italic leading-[1.35] tracking-[0.01em] text-transparent outline-none',
                    )}
                    style={{
                      fontFamily: 'var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", serif',
                      caretColor: 'rgba(255,255,255,0.78)',
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-white/36">
                    <motion.button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:text-white/76"
                      whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    >
                      <ImageIcon className="size-2.5" />
                    </motion.button>
                    <motion.button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:text-white/76"
                      whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    >
                      <Film className="size-2.5" />
                    </motion.button>

                    <div className="mx-0.5 h-3 w-px bg-white/10" />

                    <motion.button
                      type="button"
                      onClick={() => onOpenCommandOverlay?.()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#7ff2d4]/20 bg-[#7ff2d4]/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#7ff2d4] transition-colors hover:bg-[#7ff2d4]/10"
                      whileHover={reduceMotion ? undefined : { y: -0.5, scale: 1.02 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    >
                      <Sparkles className="size-2.5" />
                      Creative Direction
                    </motion.button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={loading ? onStop : () => void handleComposerSubmit()}
                    disabled={!loading && !hasDraft}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#bebec7] p-0 text-[#101014] shadow-[0_18px_32px_-24px_rgba(255,255,255,0.92)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                    whileHover={reduceMotion ? undefined : { y: -1, scale: 1.04 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  >
                    {loading ? <div className="h-3 w-3 rounded-[2px] bg-current" /> : <ArrowUp className="size-4" />}
                  </motion.button>
                </div>
              </motion.div>
            ) : isHandleHovered ? (
              <motion.div
                key="closed-composer-expanded"
                className="relative flex h-full w-full items-start justify-center px-4 pt-3"
                initial={reduceMotion ? false : { opacity: 0.92 }}
                animate={reduceMotion ? undefined : { opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0.92 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              >
                <div className="relative flex w-full items-center gap-3">
                  <div className="mt-0.5 h-1 w-6 shrink-0 rounded-full bg-white/58" />
                  <motion.div
                    className="flex min-w-0 items-center gap-2"
                    animate={reduceMotion ? undefined : { opacity: isHandleHovered ? 1 : 0.92, x: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
                  >
                    <MessageSquare className="size-4 shrink-0 text-white/72" />
                    <span className="truncate text-sm text-white/72">Open chat</span>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {isHandleHovered ? (
                    <>
                      <motion.span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[#7ff2d4]/28"
                        initial={{ opacity: 0.42, scale: 0.92 }}
                        animate={{ opacity: 0, scale: 1.16 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, ease: 'easeOut', repeat: Number.POSITIVE_INFINITY }}
                      />
                      <motion.span
                        aria-hidden
                        className="pointer-events-none absolute -inset-x-5 -inset-y-4 rounded-[999px] bg-[radial-gradient(circle_at_center,rgba(127,242,212,0.22)_0%,rgba(127,242,212,0)_58%)] blur-2xl"
                        initial={{ opacity: 0.34 }}
                        animate={{ opacity: [0.24, 0.54, 0.26] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.9, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
                      />
                    </>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="closed-composer-icon"
                className="relative grid h-full w-full place-items-center"
                initial={reduceMotion ? false : { opacity: 0.92, scale: 0.96 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0.92, scale: 0.96 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.08)_24%,rgba(255,255,255,0)_70%)] blur-md"
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          opacity: [0.58, 0.9, 0.62],
                          scale: [0.98, 1.03, 0.98],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-[2px] rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,20,0.98)_0%,rgba(8,8,12,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-[6px] rounded-full border border-[#7ff2d4]/18"
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          opacity: [0.52, 0.88, 0.58],
                        }
                  }
                  transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-[10px] rounded-full bg-[radial-gradient(circle_at_32%_24%,rgba(127,242,212,0.18)_0%,rgba(127,242,212,0)_68%)]"
                />
                <MessageSquare className="relative size-4 text-white/78 drop-shadow-[0_0_16px_rgba(255,255,255,0.16)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
