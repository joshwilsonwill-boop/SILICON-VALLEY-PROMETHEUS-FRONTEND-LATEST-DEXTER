'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Eye,
  EyeOff,
  Volume2,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Radio,
  RefreshCw,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  useVoiceCompanion,
  type UseVoiceCompanionOptions,
} from '@/hooks/use-voice-companion'

export interface VoiceCompanionHudProps extends UseVoiceCompanionOptions {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function VoiceCompanionHud({
  isOpen,
  onClose,
  contextProvider,
  onApplyActions,
  onSeek,
  onPlay,
  onPause,
  onMute,
  onUnmute,
  onTabChange,
  onFitModeChange,
  className,
}: VoiceCompanionHudProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  const companion = useVoiceCompanion({
    contextProvider,
    onApplyActions,
    onSeek,
    onPlay,
    onPause,
    onMute,
    onUnmute,
    onTabChange,
    onFitModeChange,
  })

  // Automatically connect when HUD opens, disconnect when closed
  React.useEffect(() => {
    if (isOpen && companion.status === 'disconnected') {
      companion.connect()
    } else if (!isOpen && companion.status !== 'disconnected') {
      companion.disconnect()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeVolume = companion.status === 'speaking' ? companion.assistantVolume : companion.userVolume
  const latestTranscript = companion.transcripts[companion.transcripts.length - 1]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(127,242,212,0.12)] backdrop-blur-2xl text-white transition-all duration-300',
          isMinimized ? 'w-72 p-3' : 'w-88 md:w-96 p-5',
          className
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5 items-center justify-center">
              {companion.status === 'listening' || companion.status === 'speaking' ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ff2d4] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#7ff2d4]" />
                </>
              ) : companion.status === 'connecting' ? (
                <span className="relative inline-flex size-2 rounded-full bg-amber-400 animate-pulse" />
              ) : companion.status === 'interrupted' ? (
                <span className="relative inline-flex size-2 rounded-full bg-amber-300" />
              ) : (
                <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide uppercase text-white/90 flex items-center gap-1.5">
                <Sparkles className="size-3 text-[#7ff2d4]" />
                Jarvis Companion
              </span>
              <span className="text-[10px] text-white/40">
                {companion.status === 'speaking'
                  ? 'Jarvis is speaking'
                  : companion.status === 'listening'
                  ? 'Listening (barge-in enabled)'
                  : companion.status === 'interrupted'
                  ? 'Interrupted — listening'
                  : companion.status === 'connecting'
                  ? 'Establishing neural link...'
                  : companion.status === 'error'
                  ? 'Connection notice'
                  : 'Ready'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              aria-label={isMinimized ? 'Maximize companion' : 'Minimize companion'}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              {isMinimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                companion.disconnect()
                onClose()
              }}
              aria-label="Close voice companion"
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        {!isMinimized && (
          <div className="flex flex-col items-center py-4 space-y-4">
            {/* Visualizer Orb */}
            <div className="relative flex size-28 items-center justify-center">
              {/* Outer audio dynamic glow */}
              <motion.div
                animate={{
                  scale: 1 + activeVolume * 0.8,
                  opacity: 0.15 + activeVolume * 0.45,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'absolute inset-0 rounded-full blur-xl',
                  companion.status === 'speaking'
                    ? 'bg-[#7ff2d4]'
                    : companion.status === 'interrupted'
                    ? 'bg-amber-300'
                    : 'bg-indigo-500'
                )}
              />

              {/* Concentric Audio Ring 1 */}
              <motion.div
                animate={{
                  scale: 1 + activeVolume * 0.5,
                  opacity: 0.3 + activeVolume * 0.4,
                }}
                className="absolute inset-1 rounded-full border border-white/20"
              />

              {/* Concentric Audio Ring 2 */}
              <motion.div
                animate={{
                  scale: 1 + activeVolume * 0.25,
                }}
                className="absolute inset-3 rounded-full border border-[#7ff2d4]/40"
              />

              {/* Core Cybernetic Orb */}
              <div
                className={cn(
                  'relative flex size-16 items-center justify-center rounded-full shadow-inner transition-colors duration-500',
                  companion.status === 'speaking'
                    ? 'bg-[radial-gradient(circle_at_35%_30%,#a7f3d0_0%,#34d399_40%,#065f46_100%)] shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                    : companion.status === 'interrupted'
                    ? 'bg-[radial-gradient(circle_at_35%_30%,#fde68a_0%,#f59e0b_50%,#78350f_100%)] shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : companion.isMuted
                    ? 'bg-[radial-gradient(circle_at_35%_30%,#fca5a5_0%,#ef4444_50%,#7f1d1d_100%)]'
                    : 'bg-[radial-gradient(circle_at_35%_30%,#c7d2fe_0%,#6366f1_40%,#312e81_100%)] shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                )}
              >
                {companion.status === 'speaking' ? (
                  <Volume2 className="size-6 text-white/90 animate-pulse" />
                ) : companion.isMuted ? (
                  <MicOff className="size-6 text-white/90" />
                ) : (
                  <Mic className="size-6 text-white/90" />
                )}
              </div>
            </div>

            {/* Live Context & Vision Status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-white/70">
              <span className="flex items-center gap-1.5">
                <Radio className={cn('size-3', companion.isVisionActive ? 'text-[#7ff2d4]' : 'text-white/30')} />
                {companion.isVisionActive ? 'Vision Synchronized' : 'Vision Paused'}
              </span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-[10px] text-white/50">
                Voice: {companion.selectedVoice}
              </span>
            </div>

            {/* Live Subtitle Strip */}
            <div className="w-full min-h-[44px] max-h-[60px] overflow-y-auto rounded-lg bg-white/[0.04] p-2 text-center text-xs text-white/80 leading-relaxed border border-white/[0.05]">
              {latestTranscript ? (
                <p>
                  <span className={cn('font-semibold mr-1.5', latestTranscript.role === 'user' ? 'text-indigo-300' : 'text-[#7ff2d4]')}>
                    {latestTranscript.role === 'user' ? 'You:' : 'Jarvis:'}
                  </span>
                  {latestTranscript.text}
                </p>
              ) : companion.status === 'listening' ? (
                <p className="text-white/40 italic">Speak freely... You can interrupt anytime.</p>
              ) : companion.status === 'connecting' ? (
                <p className="text-white/40 italic">Connecting to Gemini Multimodal Live API...</p>
              ) : companion.status === 'error' ? (
                <p className="text-rose-300">{companion.error || 'Connection failed. Check GEMINI_API_KEY.'}</p>
              ) : (
                <p className="text-white/40 italic">Companion active.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer Quick Controls */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={companion.toggleMute}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                companion.isMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              )}
            >
              {companion.isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              <span>{companion.isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              type="button"
              onClick={companion.toggleVision}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                companion.isVisionActive
                  ? 'bg-[#7ff2d4]/15 text-[#7ff2d4] border border-[#7ff2d4]/30'
                  : 'bg-white/10 text-white/50 hover:bg-white/15'
              )}
              title="Toggle timeline screen/canvas sync"
            >
              {companion.isVisionActive ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              <span>Eye</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {companion.status === 'error' && (
              <button
                type="button"
                onClick={() => companion.connect()}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white/80 hover:bg-white/20"
                title="Retry connection"
              >
                <RefreshCw className="size-3" />
                <span>Retry</span>
              </button>
            )}

            <select
              value={companion.selectedVoice}
              onChange={(e) => companion.setSelectedVoice(e.target.value)}
              className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/80 focus:outline-none border border-white/10"
              aria-label="Select Voice Persona"
            >
              <option value="Puck" className="bg-[#121212] text-white">Puck (Adaptive)</option>
              <option value="Aoede" className="bg-[#121212] text-white">Aoede (Warm)</option>
              <option value="Charon" className="bg-[#121212] text-white">Charon (Deep)</option>
              <option value="Fenrir" className="bg-[#121212] text-white">Fenrir (Assertive)</option>
              <option value="Kore" className="bg-[#121212] text-white">Kore (Smooth)</option>
            </select>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
