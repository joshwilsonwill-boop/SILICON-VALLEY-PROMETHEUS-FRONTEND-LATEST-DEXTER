'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Eye, EyeOff, Sparkles, X, Volume2, Radio, ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useVoiceCompanion } from '@/hooks/use-voice-companion'
import {
  getVoiceCompanionBridge,
  subscribeVoiceCompanionBridge,
} from '@/lib/voice-companion/bridge'

export interface JarvisTopNavFilamentProps {
  className?: string
}

export function JarvisTopNavFilament({ className }: JarvisTopNavFilamentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [textDraft, setTextDraft] = useState('')
  const svgRef = useRef<SVGSVGElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const glowPathRef = useRef<SVGPathElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  const companion = useVoiceCompanion()

  const bridge = useSyncExternalStore(
    subscribeVoiceCompanionBridge,
    getVoiceCompanionBridge,
    getVoiceCompanionBridge,
  )
  const isEditorLinked = Boolean(bridge.contextProvider || bridge.onApplyActions)

  // Track latest reactive values in refs for zero-react-render RAF animation loop
  const companionRef = useRef(companion)
  const isHoveredRef = useRef(isHovered)
  useEffect(() => {
    companionRef.current = companion
    isHoveredRef.current = isHovered
  })

  const isActive = companion.status !== 'disconnected' && companion.status !== 'error'
  const isSpeaking = companion.status === 'speaking'
  const isListening = companion.status === 'listening'
  const isInterrupted = companion.status === 'interrupted'

  // Single mount-only high-performance RAF loop (zero React re-renders)
  useEffect(() => {
    let active = true

    const loop = () => {
      if (!active) return

      if (pathRef.current) {
        const comp = companionRef.current
        const userVol = comp.getUserVolume()
        const asstVol = comp.getAssistantVolume()
        const status = comp.status
        const hovered = isHoveredRef.current

        const width = 200
        const height = 32
        const midY = height / 2
        const numPoints = 48

        let baseAmplitude = 0.6
        let freq1 = 0.04
        let freq2 = 0.08
        let speed = 0.03

        if (status === 'speaking') {
          baseAmplitude = 6 + asstVol * 14
          speed = 0.16
          freq1 = 0.05
          freq2 = 0.11
        } else if (status === 'listening') {
          baseAmplitude = 3 + userVol * 12
          speed = 0.1
          freq1 = 0.045
          freq2 = 0.09
        } else if (status === 'interrupted') {
          baseAmplitude = 8
          speed = 0.25
        } else if (status === 'connecting') {
          baseAmplitude = 2.5
          speed = 0.08
        } else if (hovered) {
          baseAmplitude = 2
          speed = 0.07
        } else {
          baseAmplitude = 0.6
          speed = 0.03
        }

        phaseRef.current += speed

        let d = `M 0 ${midY}`
        for (let i = 0; i <= numPoints; i++) {
          const x = (i / numPoints) * width
          const envelope = Math.sin((Math.PI * i) / numPoints)
          const yOffset =
            (Math.sin(x * freq1 + phaseRef.current) * 0.7 +
              Math.sin(x * freq2 - phaseRef.current * 1.3) * 0.3) *
            baseAmplitude *
            envelope

          const y = midY + yOffset
          d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
        }

        pathRef.current.setAttribute('d', d)
        if (glowPathRef.current) {
          glowPathRef.current.setAttribute('d', d)
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    animFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [])

  const handleToggleCompanion = () => {
    if (companion.status === 'disconnected') {
      companion.connect()
      setIsExpanded(true)
    } else {
      setIsExpanded((prev) => !prev)
    }
  }

  const latestTranscript = companion.transcripts[companion.transcripts.length - 1]

  return (
    <div
      className={cn(
        'pointer-events-none fixed top-0 left-0 right-0 z-50 flex flex-col items-center',
        className
      )}
    >
      {/* The Core Kinetic Filament (Top Center) */}
      <div
        className="group pointer-events-auto relative mt-0 flex cursor-pointer flex-col items-center focus:outline-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleToggleCompanion}
        role="button"
        tabIndex={0}
        aria-label="Jarvis Voice & Vision Neural Filament"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggleCompanion()
          }
        }}
      >
        {/* Ambient Top Glow Diffuser */}
        <div
          className={cn(
            'pointer-events-none absolute -top-8 h-16 w-64 rounded-full blur-2xl transition-all duration-700',
            isSpeaking
              ? 'bg-cyan-400/35 scale-125'
              : isListening
              ? 'bg-blue-500/25 scale-110'
              : isInterrupted
              ? 'bg-amber-400/30'
              : isHovered
              ? 'bg-cyan-500/20 scale-105'
              : 'bg-blue-600/10'
          )}
        />

        {/* SVG Living Motion Graphic Line */}
        <div className="relative flex h-8 w-52 items-center justify-center overflow-visible">
          <svg
            ref={svgRef}
            viewBox="0 0 200 32"
            className="h-full w-full overflow-visible drop-shadow-[0_1px_6px_rgba(0,240,255,0.45)]"
          >
            <defs>
              <linearGradient id="jarvisLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.2" />
                <stop offset="25%" stopColor="#00f0ff" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
              </linearGradient>
              <filter id="jarvisNeonGlow" x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing Bloom Underlayer */}
            <path
              ref={glowPathRef}
              d="M 0 16 L 200 16"
              fill="none"
              stroke="url(#jarvisLineGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              className="opacity-45 blur-[2px]"
            />

            {/* Sharp High-Precision Core Filament */}
            <path
              ref={pathRef}
              d="M 0 16 L 200 16"
              fill="none"
              stroke="url(#jarvisLineGrad)"
              strokeWidth="2.2"
              strokeLinecap="round"
              filter="url(#jarvisNeonGlow)"
            />
          </svg>
        </div>

        {/* Floating Minimalist Status Capsule (Shown on hover or when communicating) */}
        <AnimatePresence>
          {(isHovered || isActive) && !isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.94 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute top-7 flex items-center gap-1.5 rounded-full border border-white/12 bg-black/80 px-2.5 py-0.5 text-[10px] tracking-wide text-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md whitespace-nowrap"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  isSpeaking
                    ? 'bg-cyan-400 animate-pulse'
                    : isListening
                    ? 'bg-blue-400'
                    : isInterrupted
                    ? 'bg-amber-400'
                    : companion.status === 'error'
                    ? 'bg-rose-400'
                    : 'bg-emerald-400'
                )}
              />
              <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                {isSpeaking
                  ? 'Jarvis Speaking'
                  : isListening
                  ? 'Listening'
                  : isInterrupted
                  ? 'Interrupted'
                  : companion.status === 'connecting'
                  ? 'Linking...'
                  : companion.status === 'error'
                  ? 'Connection Error'
                  : 'Jarvis Voice'}
              </span>
              <span className="text-white/30">•</span>
              <span className="text-[9px] text-white/50">Click to expand</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded Cinematic Island Dock (Drops down from the filament) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative mt-2 flex w-80 md:w-96 flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/85 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-2xl"
          >
            {/* Header / State */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Jarvis Companion
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Minimize into filament"
                  title="Minimize into filament"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Live Subtitle / Transcript Ticker */}
            <div className="mt-3 min-h-[44px] rounded-xl bg-white/[0.04] p-2.5 text-xs text-white/90 border border-white/5">
              {latestTranscript ? (
                <p className="line-clamp-2 leading-relaxed">
                  <span className={cn('font-semibold mr-1.5', latestTranscript.role === 'user' ? 'text-blue-300' : 'text-cyan-300')}>
                    {latestTranscript.role === 'user' ? 'You:' : 'Jarvis:'}
                  </span>
                  {latestTranscript.text}
                </p>
              ) : companion.status === 'error' ? (
                <p className="text-rose-300 text-[11px] leading-relaxed">
                  {companion.error || 'Connection failed. Verify GEMINI_API_KEY.'}
                </p>
              ) : companion.status === 'listening' ? (
                <p className="text-white/40 italic">Listening... Speak freely or interrupt anytime.</p>
              ) : companion.status === 'connecting' ? (
                <p className="text-white/40 italic">Connecting to Gemini Multimodal Live API...</p>
              ) : (
                <p className="text-white/40 italic">Filament synchronized with editor.</p>
              )}
            </div>

            {/* Text channel: type to Jarvis when speaking is not an option */}
            {isActive && (
              <form
                className="mt-2 flex items-center gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  const message = textDraft.trim()
                  if (!message) return
                  companion.sendTextMessage(message)
                  setTextDraft('')
                }}
              >
                <input
                  value={textDraft}
                  onChange={(event) => setTextDraft(event.target.value)}
                  placeholder={isEditorLinked ? 'Message Jarvis (editor linked)…' : 'Message Jarvis…'}
                  aria-label="Type a message to Jarvis"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white/90 outline-none transition-colors placeholder:text-white/30 focus:border-cyan-400/40"
                />
                <button
                  type="submit"
                  disabled={!textDraft.trim()}
                  aria-label="Send message to Jarvis"
                  className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-400/90 text-black transition-opacity hover:bg-cyan-300 disabled:opacity-25"
                >
                  <ArrowUp className="size-3.5" strokeWidth={2.2} />
                </button>
              </form>
            )}

            {/* Action Bar */}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={companion.toggleMute}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    companion.isMuted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  )}
                >
                  {companion.isMuted ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                  <span>{companion.isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={companion.toggleVision}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    companion.isVisionActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  )}
                >
                  {companion.isVisionActive ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  <span>Vision {companion.isVisionActive ? 'On' : 'Off'}</span>
                </button>

                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium tracking-wide',
                    isEditorLinked
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 bg-white/[0.04] text-white/40',
                  )}
                  title={isEditorLinked ? 'Jarvis is wired to the open editor' : 'Open a project editor to enable timeline control'}
                >
                  <Radio className="size-3" />
                  {isEditorLinked ? 'Editor linked' : 'Editor idle'}
                </span>
              </div>

              {companion.status === 'disconnected' || companion.status === 'error' ? (
                <button
                  type="button"
                  onClick={companion.connect}
                  className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-black transition-all hover:bg-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                >
                  Connect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={companion.disconnect}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                >
                  Disconnect
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
