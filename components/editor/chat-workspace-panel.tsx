'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  ArrowUp,
  MessageSquare,
  Volume2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildRevealVariants } from '@/lib/motion'
import {
  chatEntriesStorageKey,
  removeChatEntry,
  isMusicIntent,
  isGenericMusicRequest,
  isEditIntent,
  buildAssistantReply,
  buildMusicReply,
  buildEditAssistantReply,
  selectEditStyleTemplate,
  extractGroqStreamText,
  sanitizeAssistantReply,
  safeJsonParse
} from '@/lib/editor-handlers'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import type {
  MusicVideoContext,
  StyleTemplate,
  CreativeMetadata
} from '@/lib/types'

import { StagedMusicRail } from '@/components/editor/staged-music-rail'
import { MusicSpotlightOrb } from '@/components/editor/music-spotlight-orb'
import { InlineLoadingAnimation } from '@/components/loading-animation'

export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: any
}

export interface ChatWorkspacePanelProps {
  projectId: string
  projectTitle: string
  initialPrompt: string
  initialSources: string[]
  videoContext: MusicVideoContext
  composerPortalTarget: HTMLElement | null
  musicSpotlightPortalTarget: HTMLElement | null
  initialEditorState: any
  onEditRequest: (request: { prompt: string; styleTemplate: StyleTemplate; metadata?: CreativeMetadata }) => void
  onSave: (editorState: any) => Promise<void>
  stagedTracks: any[]
  musicPreviewVolume: number
  activePreviewTrack: any
  previewPlaying: boolean
  onMusicVolumeChange: (volume: number) => void
  onRemoveTrack: (stagedId: string) => void
  onClearAll: () => void
  onPreviewToggle: (track: any) => void
  onStageTrack: (track: any) => void
}

export const ChatWorkspacePanel = React.memo(function ChatWorkspacePanel({
  projectId,
  projectTitle,
  initialPrompt,
  initialSources,
  videoContext,
  composerPortalTarget,
  musicSpotlightPortalTarget,
  initialEditorState,
  onEditRequest,
  onSave,
  stagedTracks,
  musicPreviewVolume,
  activePreviewTrack,
  previewPlaying,
  onMusicVolumeChange,
  onRemoveTrack,
  onClearAll,
  onPreviewToggle,
  onStageTrack,
}: ChatWorkspacePanelProps) {
  const [entries, setEntries] = React.useState<ChatEntry[]>([])
  const [draft, setDraft] = React.useState('')
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [isTyping, setIsTyping] = React.useState(false)
  const [isStagingEdit, setIsStagingEdit] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const draftInputRef = React.useRef<HTMLTextAreaElement | null>(null)

  // Load from storage
  React.useEffect(() => {
    const saved = readLocalStorageJSON<ChatEntry[]>(chatEntriesStorageKey(projectId))
    if (Array.isArray(saved)) {
      setEntries(saved)
    } else {
      setEntries([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to the chamber. How can I help you shape "${projectTitle}"?`,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [projectId, projectTitle])

  // Sync to storage
  React.useEffect(() => {
    writeLocalStorageJSON(chatEntriesStorageKey(projectId), entries)
  }, [projectId, entries])

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [entries, scrollToBottom])

  const handleSendMessage = React.useCallback(async () => {
    const text = draft.trim()
    if (!text || isTyping) return

    const userEntry: ChatEntry = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setEntries((prev) => [...prev, userEntry])
    setDraft('')
    setIsTyping(true)

    // Simulate AI logic
    setTimeout(() => {
      let reply = ''
      if (isMusicIntent(text)) {
        reply = buildMusicReply({ projectTitle, videoContext, input: text })
      } else if (isEditIntent(text)) {
        const styleTemplate = selectEditStyleTemplate(text, videoContext)
        reply = buildEditAssistantReply({ projectTitle, styleTemplate, input: text })

        // Trigger edit request
        onEditRequest({ prompt: text, styleTemplate })
      } else {
        reply = buildAssistantReply({ projectTitle, originalPrompt: initialPrompt, sourceCount: initialSources.length, input: text })
      }

      const assistantEntry: ChatEntry = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }

      setEntries((prev) => [...prev, assistantEntry])
      setIsTyping(false)
    }, 1200)
  }, [draft, isTyping, projectTitle, videoContext, initialPrompt, initialSources, onEditRequest])

  const handleClearChat = React.useCallback(() => {
    setEntries([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Welcome back. How shall we refine "${projectTitle}"?`,
        timestamp: new Date().toISOString(),
      },
    ])
    toast.success('Chat cleared')
  }, [projectTitle])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="premium-scroll-mask flex-1 overflow-y-auto overscroll-contain px-4 py-6"
      >
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                variants={buildRevealVariants({ distance: 8, blur: 4, duration: 0.22 })}
                initial="hidden"
                animate="visible"
                className={cn(
                  'flex w-full flex-col gap-2',
                  entry.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-relaxed',
                    entry.role === 'user'
                      ? 'bg-[#267dff] text-white shadow-[0_8px_20px_-8px_rgba(38,125,255,0.4)]'
                      : 'border border-white/8 bg-white/[0.03] text-white/88'
                  )}
                >
                  {entry.content}
                </div>
                <span className="px-2 text-[10px] text-white/24">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-2"
            >
              <InlineLoadingAnimation size={40} label="Generating assistant response" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/8 p-4">
        {stagedTracks.length > 0 && (
          <motion.div
            variants={buildRevealVariants({ delay: 0.22, distance: 12, blur: 8, duration: 0.28 })}
            initial="hidden"
            whileInView="visible"
            className="mb-4"
          >
            <StagedMusicRail
              projectTitle={projectTitle}
              preference={{ mood: 'cinematic', energy: 'medium', sourcePlatform: 'online' }}
              stagedTracks={stagedTracks}
              musicVolumePercent={Math.round(musicPreviewVolume * 100)}
              onMusicVolumeChange={onMusicVolumeChange}
              onRemoveTrack={onRemoveTrack}
              onClearAll={onClearAll}
            />
          </motion.div>
        )}
        <div className="relative">
          <textarea
            ref={draftInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSendMessage()
              }
            }}
            placeholder="Describe an edit or ask for music..."
            className="w-full resize-none rounded-[22px] border border-white/12 bg-white/[0.02] py-3 pl-4 pr-12 text-sm text-white placeholder:text-white/24 outline-none transition-colors focus:border-white/20"
            rows={1}
          />
          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!draft.trim() || isTyping}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white text-black transition-transform hover:scale-[1.05] active:scale-[0.95] disabled:opacity-20 disabled:hover:scale-100"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handleClearChat}
            className="text-[11px] text-white/24 hover:text-white/40 transition-colors"
          >
            Clear session
          </button>
          <div className="flex items-center gap-3">
             <span className="text-[10px] text-white/16">⌘ + Enter to send</span>
          </div>
        </div>
      </div>

      {musicSpotlightPortalTarget && stagedTracks.length > 0
        ? createPortal(
            <AnimatePresence mode="wait" initial={false}>
              <MusicSpotlightOrb
                key={stagedTracks[0].recommendation.id}
                recommendation={stagedTracks[0].recommendation}
                status={
                  activePreviewTrack?.id === stagedTracks[0].recommendation.id
                    ? previewPlaying
                      ? 'previewing'
                      : 'previewing'
                    : 'staged'
                }
                onDismiss={() => {}}
              />
            </AnimatePresence>,
            musicSpotlightPortalTarget,
          )
        : null}
    </div>
  )
})
