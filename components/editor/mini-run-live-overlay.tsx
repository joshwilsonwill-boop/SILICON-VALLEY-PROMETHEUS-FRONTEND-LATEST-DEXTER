'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scissors, Check, X, Sparkles, Loader2 } from 'lucide-react'
import {
  useMiniRunDraftStore,
  type DraftChunk,
  type DraftWord,
  type DraftTypography,
} from '@/lib/editor/mini-run-draft-store'
import { dispatchMiniRunFromProject } from '@/lib/api/mini-run-console'
import { toast } from 'sonner'

export interface MiniRunLiveOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  projectId?: string | null
  sourceAssetId?: string | null
}

export function MiniRunLiveOverlay({ videoRef, projectId, sourceAssetId }: MiniRunLiveOverlayProps) {
  const chunks = useMiniRunDraftStore((s) => s.chunks)
  const isDirty = useMiniRunDraftStore((s) => s.isDirty)
  const status = useMiniRunDraftStore((s) => s.status)
  const updateWordText = useMiniRunDraftStore((s) => s.updateWordText)
  const toggleWordCut = useMiniRunDraftStore((s) => s.toggleWordCut)
  const updateChunkTypography = useMiniRunDraftStore((s) => s.updateChunkTypography)
  const getDraftManifest = useMiniRunDraftStore((s) => s.getDraftManifest)
  const setStatus = useMiniRunDraftStore((s) => s.setStatus)

  const [currentTimeMs, setCurrentTimeMs] = React.useState(0)
  const [editingWord, setEditingWord] = React.useState<{
    chunkIndex: number
    wordIndex: number
    text: string
  } | null>(null)
  const [isBaking, setIsBaking] = React.useState(false)

  // Track playback time at 60fps for crisp kinetic subtitle synchronization
  React.useEffect(() => {
    let animId: number
    const syncTime = () => {
      const vid = videoRef.current
      if (vid && !vid.paused) {
        const ms = Math.round(vid.currentTime * 1000)
        setCurrentTimeMs(ms)

        // Non-destructive virtual jump-cut skipping
        if (chunks.length > 0) {
          for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
            const chunk = chunks[cIdx]
            if (ms >= chunk.startMs && ms <= chunk.endMs) {
              for (let wIdx = 0; wIdx < chunk.words.length; wIdx++) {
                const word = chunk.words[wIdx]
                if (word.cut && ms >= word.startMs && ms < word.endMs) {
                  // Find the next non-cut word start or chunk end
                  let targetSec = (word.endMs + 10) / 1000
                  for (let nextW = wIdx + 1; nextW < chunk.words.length; nextW++) {
                    if (!chunk.words[nextW].cut) {
                      targetSec = chunk.words[nextW].startSec || chunk.words[nextW].startMs / 1000
                      break
                    }
                  }
                  if (targetSec > vid.currentTime && targetSec < vid.duration) {
                    vid.currentTime = targetSec
                  }
                  break
                }
              }
              break
            }
          }
        }
      }
      animId = requestAnimationFrame(syncTime)
    }

    animId = requestAnimationFrame(syncTime)
    return () => cancelAnimationFrame(animId)
  }, [chunks, videoRef])

  // Also listen to explicit video seek/timeupdate events
  React.useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onTimeUpdate = () => setCurrentTimeMs(Math.round(vid.currentTime * 1000))
    vid.addEventListener('timeupdate', onTimeUpdate)
    vid.addEventListener('seeked', onTimeUpdate)
    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate)
      vid.removeEventListener('seeked', onTimeUpdate)
    }
  }, [videoRef])

  // If there are no planned chunks loaded, do not render overlay
  if (chunks.length === 0) return null

  // Find active chunk
  let activeChunk: DraftChunk | null = null
  let activeChunkIdx = -1
  for (let i = 0; i < chunks.length; i++) {
    if (currentTimeMs >= chunks[i].startMs && currentTimeMs <= chunks[i].endMs) {
      activeChunk = chunks[i]
      activeChunkIdx = i
      break
    }
  }

  const handleBakeFinal = async () => {
    if (!projectId || !sourceAssetId) {
      toast.error('Project ID and Source Asset ID are required to bake final video.')
      return
    }

    try {
      setIsBaking(true)
      setStatus('rendering')
      const draftManifest = getDraftManifest()

      toast.info('Dispatching deterministic cloud render with your draft manifest...')
      const result = await dispatchMiniRunFromProject({
        projectId,
        sourceAssetId,
        draftManifest,
      })

      toast.success(`Cloud render started! Job ID: ${result.jobId.slice(0, 8)}`)
      setStatus('rendered')
    } catch (err) {
      console.error('[MiniRunLiveOverlay] Bake failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to dispatch final render.')
      setStatus('error')
    } finally {
      setIsBaking(false)
    }
  }

  const typography: DraftTypography = activeChunk?.typography || {}
  const positionYPercent = typography.positionY !== undefined ? typography.positionY * 100 : 75

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between overflow-hidden">
      {/* Top Banner: Mode Indicator & Cloud Bake Trigger */}
      <div className="pointer-events-auto flex items-center justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide uppercase">
            Mini-Run Live Preview
          </span>
          {isDirty && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">
              User Modified
            </span>
          )}
        </div>

        <button
          onClick={handleBakeFinal}
          disabled={isBaking}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent-cyan to-blue-500 px-3 py-1 text-xs font-semibold text-black shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
        >
          {isBaking ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Baking on Modal...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 fill-current" />
              <span>Bake Final Video</span>
            </>
          )}
        </button>
      </div>

      {/* Center/Lower: Kinetic Live Typography Overlay */}
      <div
        className="pointer-events-auto absolute inset-x-0 flex justify-center px-4 transition-all duration-150"
        style={{ top: `${positionYPercent}%`, transform: 'translateY(-50%)' }}
      >
        <AnimatePresence mode="wait">
          {activeChunk && (
            <motion.div
              key={activeChunk.chunkIndex}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center select-none"
              style={{
                fontFamily: typography.fontFamily || 'system-ui, sans-serif',
                fontSize: typography.fontSize ? `${typography.fontSize * 0.45}px` : '28px',
                fontWeight: typography.fontWeight || 800,
                color: typography.textColor || '#FFFFFF',
                textShadow: typography.shadow || '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                WebkitTextStroke: typography.strokeWidth ? `${typography.strokeWidth}px ${typography.strokeColor || '#000000'}` : undefined,
              }}
            >
              {activeChunk.words.map((word: DraftWord, wIdx: number) => {
                const isWordActive =
                  currentTimeMs >= word.startMs && currentTimeMs <= word.endMs
                const isCut = Boolean(word.cut)

                return (
                  <span
                    key={`${activeChunk.chunkIndex}-${wIdx}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingWord({
                        chunkIndex: activeChunkIdx,
                        wordIndex: wIdx,
                        text: word.text,
                      })
                    }}
                    title="Click to edit or cut word"
                    className={`cursor-pointer rounded px-1 py-0.5 transition-all duration-75 relative group ${
                      isCut
                        ? 'line-through text-red-400 opacity-40 hover:opacity-80'
                        : isWordActive
                        ? 'scale-110 text-yellow-300 drop-shadow-[0_0_12px_rgba(234,179,8,0.8)]'
                        : 'hover:scale-105 hover:bg-white/10'
                    }`}
                  >
                    {word.text}
                  </span>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Word Quick Edit / Cut Modal Popover */}
      <AnimatePresence>
        {editingWord && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto absolute inset-x-4 bottom-20 z-40 mx-auto max-w-sm rounded-xl border border-white/20 bg-neutral-900/95 p-3 shadow-2xl backdrop-blur-xl text-white"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-semibold text-neutral-300">Edit Word / Phrase</span>
              <button
                onClick={() => setEditingWord(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={editingWord.text}
                onChange={(e) => setEditingWord({ ...editingWord, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateWordText(editingWord.chunkIndex, editingWord.wordIndex, editingWord.text)
                    setEditingWord(null)
                  }
                }}
                className="flex-1 rounded bg-black/60 border border-white/20 px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-accent-cyan"
                autoFocus
              />
              <button
                onClick={() => {
                  updateWordText(editingWord.chunkIndex, editingWord.wordIndex, editingWord.text)
                  setEditingWord(null)
                }}
                className="flex items-center justify-center rounded bg-accent-cyan px-2.5 py-1.5 text-black hover:brightness-110"
              >
                <Check className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  toggleWordCut(editingWord.chunkIndex, editingWord.wordIndex)
                  setEditingWord(null)
                }}
                className="flex items-center gap-1.5 rounded bg-red-500/20 px-2 py-1 text-red-300 hover:bg-red-500/30 transition-colors"
              >
                <Scissors className="size-3.5" />
                <span>Toggle Cut (Skip during playback)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Spacer */}
      <div className="h-4" />
    </div>
  )
}
