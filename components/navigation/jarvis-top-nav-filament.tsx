'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Eye, EyeOff, Sparkles, X, Volume2, Radio } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useVoiceCompanion } from '@/hooks/use-voice-companion'

export interface JarvisTopNavFilamentProps {
  className?: string
}

export function JarvisTopNavFilament({ className }: JarvisTopNavFilamentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const glowPathRef = useRef<SVGPathElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  const companion = useVoiceCompanion()

  const isActive = companion.status !== 'disconnected' && companion.status !== 'error'
  const isSpeaking = companion.status === 'speaking'
  const isListening = companion.status === 'listening'
  const isInterrupted = companion.status === 'interrupted'

  // Procedural dynamic wave calculation
  // Computes a multi-harmonic liquid sine wave that pins to 0 at both endpoints
  const renderWave = useCallback(() => {
    if (!pathRef.current) return

    const width = 200
    const height = 32
    const midY = height / 2
    const numPoints = 64

    // Dynamic amplitude based on companion state & audio volume
    let baseAmplitude = 0
    let freq1 = 0.04
    let freq2 = 0.08
    let speed = 0.06

    if (isSpeaking) {
      baseAmplitude = 6 + companion.assistantVolume * 14
      speed = 0.16
      freq1 = 0.05
      freq2 = 0.11
    } else if (isListening) {
      baseAmplitude = 3 + companion.userVolume * 12
      speed = 0.1
      freq1 = 0.045
      freq2 = 0.09
    } else if (isInterrupted) {
      baseAmplitude = 8
      speed = 0.25
    } else if (companion.status === 'connecting') {
      baseAmplitude = 2.5
      speed = 0.08
    } else if (isHovered) {
      baseAmplitude = 2
      speed = 0.07
    } else {
      // Idle: ultra-fine subtle shimmer
      baseAmplitude = 0.6
      speed = 0.03
    }

    phaseRef.current += speed

    let d = `M 0 ${midY}`
    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * width
      // Sine envelope so the ends taper gracefully to exactly midY (0 displacement)
      const envelope = Math.sin((Math.PI * i) / numPoints)
      const yOffset =
        (Math.sin(x * freq1 + phaseRef.current) * 0.7 +
          Math.sin(x * freq2 - phaseRef.current * 1.3) * 0.3) *
        baseAmplitude *
        envelope

      const y = midY + yOffset
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
    }

    pathRef.current.setAttribute('d', d)
    if (glowPathRef.current) {
      glowPathRef.current.setAttribute('d', d)
    }

    animFrameIdRef.current = requestAnimationFrame(renderWave)
  }, [
    companion.assistantVolume,
    companion.status,
    companion.userVolume,
    isHovered,
    isInterrupted,
    isListening,
    isSpeaking,
  ])

  useEffect(() => {
    animFrameIdRef.current = requestAnimationFrame(renderWave)
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [renderWave])

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

            {/* Live Visual Context Pill */}
            <div className="my-2.5 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/70 border border-white/[0.06]">
              <span className="flex items-center gap-1.5">
                <Radio className={cn('size-3', companion.isVisionActive ? 'text-cyan-400' : 'text-white/30')} />
                {companion.isVisionActive ? 'Timeline Vision Active' : 'Vision Paused'}
              </span>
              <span className="font-mono text-[10px] text-white/40">Voice: {companion.selectedVoice}</span>
            </div>

            {/* Dynamic Spoken Transcript Box */}
            <div className="min-h-[42px] max-h-16 overflow-y-auto rounded-lg bg-black/40 p-2 text-center text-xs leading-relaxed text-white/80 border border-white/5">
              {latestTranscript ? (
                <p>
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
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'bg-white/10 text-white/50 hover:bg-white/15'
                  )}
                  title="Toggle video preview vision sync"
                >
                  {companion.isVisionActive ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  <span>Eye</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {companion.status !== 'disconnected' ? (
                  <button
                    type="button"
                    onClick={() => {
                      companion.disconnect()
                      setIsExpanded(false)
                    }}
                    className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/25 transition-colors border border-rose-500/20"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => companion.connect()}
                    className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
