'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Sparkles, X, ArrowUp, Power } from 'lucide-react'
import { Dock, DockItem, DockLabel, DockIcon } from '@/components/ui/dock'

import { cn } from '@/lib/utils'
import { useVoiceCompanion } from '@/hooks/use-voice-companion'
import {
  getVoiceCompanionBridge,
  subscribeVoiceCompanionBridge,
} from '@/lib/voice-companion/bridge'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'

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
        aria-label="Jarvis Voice Neural Filament"
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

      {/* The filament remains expressive; the expanded dock is intentionally quiet. */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative mt-2.5 flex w-[calc(100%_-_24px)] max-w-[448px] flex-col overflow-hidden rounded-[9px] border border-white/[0.14] bg-[#080a0d] p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.07)]"
          >
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/20" />

            {/* Compact identity leaves the exchange as the visual focus. */}
            <div className="relative flex items-center justify-between border-b border-white/[0.09] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="relative grid size-9 shrink-0 place-items-center rounded-[7px] border border-cyan-300/25 bg-cyan-300/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Sparkles className="size-4 text-cyan-200" strokeWidth={1.5} />
                  <span className={cn(
                    'absolute -bottom-1 -right-1 size-2 rounded-full border-2 border-[#080a0d]',
                    isSpeaking ? 'bg-cyan-300' : isListening ? 'bg-sky-300' : isActive ? 'bg-emerald-300' : 'bg-zinc-600'
                  )} />
                </div>
                <div className="flex flex-col">
                  <p className="m-0 text-[13px] font-medium tracking-[0.01em] text-white/95">Prometheus Jarvis</p>
                  <p className="m-0 mt-0.5 text-[10px] tracking-[0.08em] text-white/40">VIDEO INTELLIGENCE</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="grid size-8 place-items-center rounded-[6px] text-white/45 transition-colors duration-300 hover:bg-white/[0.08] hover:text-white"
                  aria-label="Minimize into filament"
                  title="Minimize into filament"
                >
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* The active exchange is open and editorial, not another glass card. */}
            <div className="mt-4">
              <div className="border-l border-cyan-300/55 pl-3.5 text-left">
                {latestTranscript ? (
                  <p className="line-clamp-2 text-[13px] leading-5 text-white/85">
                    <span className={cn('mr-1.5 text-[10px] font-medium tracking-[0.08em]', latestTranscript.role === 'user' ? 'text-sky-200/80' : 'text-cyan-200/80')}>
                      {latestTranscript.role === 'user' ? 'You:' : 'Jarvis:'}
                    </span>
                    {latestTranscript.text}
                  </p>
                ) : companion.status === 'error' ? (
                  <p className="text-[12px] leading-relaxed text-rose-200/90">
                    {companion.error || 'Connection failed. Verify GEMINI_API_KEY.'}
                  </p>
                ) : companion.status === 'listening' ? (
                  <p className="text-[13px] leading-5 text-white/70">Listening. Speak freely or direct Jarvis.</p>
                ) : companion.status === 'connecting' ? (
                  <p className="text-[13px] leading-5 text-white/70">Establishing the live connection.</p>
                ) : (
                  <div>
                    <p className="m-0 text-[13px] leading-5 text-white/70">
                      {isEditorLinked ? 'Connected to the active edit.' : 'Ready when you are.'}
                    </p>
                  </div>
                )}
              </div>

              {/* A sober command line provides a second input modality without competing with voice. */}
              {isActive && (
                <form
                  className="mt-4 flex items-center gap-2 border border-white/[0.13] bg-black/30 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors duration-300 focus-within:border-cyan-300/45"
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
                    placeholder={isEditorLinked ? 'Instruct Jarvis (editor linked)…' : 'Message Jarvis…'}
                    aria-label="Type an instruction to Jarvis"
                    className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[13px] text-white/90 outline-none placeholder:text-white/30"
                  />
                  <button
                    type="submit"
                    disabled={!textDraft.trim()}
                    aria-label="Send message to Jarvis"
                    className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-cyan-200 text-[#061014] transition-all duration-300 hover:bg-cyan-100 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                  >
                    <ArrowUp className="size-3.5" strokeWidth={1.8} />
                  </button>
                </form>
              )}
            </div>

            <div className="relative mt-4 border-t border-white/[0.09] pt-3">
              <Dock
                magnification={52}
                distance={90}
                panelHeight={46}
                className="gap-2.5 rounded-full border-white/10 bg-white/[0.035] px-2.5 shadow-none"
              >
                {/* 1. Voice (Mute / Unmute) */}
                <DockItem
                  onClick={companion.toggleMute}
                  data-action="filament-mute-mic"
                  data-autonomous-target="filament-mic"
                  title={companion.isMuted ? "Unmute microphone" : "Mute microphone"}
                  aria-label={companion.isMuted ? "Unmute microphone" : "Mute microphone"}
                  className={cn(
                    "cursor-pointer border transition-colors duration-200",
                    companion.isMuted
                      ? "border-rose-300/50 bg-rose-400/10 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
                      : "border-white/15 bg-white/[0.055] text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <DockLabel>{companion.isMuted ? "Unmute Voice" : "Mute Voice"}</DockLabel>
                  <DockIcon>
                    {companion.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </DockIcon>
                </DockItem>

                {/* Jarvis editing control remains available when an editor is linked. */}
                <DockItem
                  role="switch"
                  aria-checked={Boolean(bridge.isTakeoverEnabled)}
                  tabIndex={isEditorLinked ? 0 : -1}
                  onClick={() => {
                    if (!isEditorLinked) return
                    if (bridge.onToggleTakeover) {
                      bridge.onToggleTakeover()
                    } else {
                      if (!bridge.isTakeoverEnabled) {
                        autonomousCoordinator.executeAutonomousTakeover('Motion')
                      } else {
                        autonomousCoordinator.endTakeover()
                      }
                    }
                  }}
                  title={isEditorLinked ? (bridge.isTakeoverEnabled ? 'Stop Jarvis editing' : 'Allow Jarvis to edit') : 'Open a project to enable Jarvis editing'}
                  aria-label={isEditorLinked ? (bridge.isTakeoverEnabled ? 'Stop Jarvis editing' : 'Allow Jarvis to edit') : 'Jarvis editing unavailable'}
                  className={cn(
                    "cursor-pointer border transition-colors duration-200",
                    !isEditorLinked
                      ? "cursor-not-allowed border-white/10 bg-white/[0.025] text-white/35"
                      : bridge.isTakeoverEnabled
                      ? "border-amber-300/65 bg-amber-300/10 text-amber-200 shadow-[0_0_12px_rgba(252,211,77,0.3)]"
                      : "border-cyan-300/35 bg-cyan-300/[0.055] text-cyan-200 hover:border-cyan-300/65 hover:bg-cyan-300/10"
                  )}
                >
                  <DockLabel>{isEditorLinked ? (bridge.isTakeoverEnabled ? 'Stop editing' : 'Allow Jarvis to edit') : 'Open a project to edit'}</DockLabel>
                  <DockIcon className="relative">
                    <Sparkles className={cn("size-4", bridge.isTakeoverEnabled && "animate-spin")} style={{ animationDuration: '4s' }} />
                    {bridge.isTakeoverEnabled && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                      </span>
                    )}
                  </DockIcon>
                </DockItem>

                {/* Power Off / Connect */}
                <DockItem
                  onClick={
                    companion.status === 'disconnected' || companion.status === 'error'
                      ? companion.connect
                      : companion.disconnect
                  }
                  title={
                    companion.status === 'disconnected' || companion.status === 'error'
                      ? "Connect to Gemini Live Neural Companion"
                      : "Power Off (Disconnect Session)"
                  }
                  aria-label={
                    companion.status === 'disconnected' || companion.status === 'error'
                      ? "Connect Jarvis"
                      : "Power Off Jarvis"
                  }
                  className={cn(
                    "cursor-pointer border transition-colors duration-200",
                    companion.status === 'disconnected' || companion.status === 'error'
                      ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-200 hover:text-[#061014]"
                      : "border-white/15 bg-white/[0.055] text-white/70 hover:border-rose-300/50 hover:bg-rose-300/10 hover:text-rose-200"
                  )}
                >
                  <DockLabel>
                    {companion.status === 'disconnected' || companion.status === 'error'
                      ? "Connect Power"
                      : "Power Off"}
                  </DockLabel>
                  <DockIcon>
                    <Power className="size-4" />
                  </DockIcon>
                </DockItem>
              </Dock>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
