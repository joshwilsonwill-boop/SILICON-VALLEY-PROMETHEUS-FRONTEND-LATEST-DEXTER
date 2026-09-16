'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Eye, EyeOff, Sparkles, X, Volume2, Radio, ArrowUp, Power } from 'lucide-react'
import { Liquid } from 'liquid-gooey'

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

      {/* Shared Glass Distortion SVG Filter for liquid-crystal-card */}
      <svg className="pointer-events-none absolute -left-[9999px] -top-[9999px] size-0 overflow-hidden" aria-hidden="true">
        <defs>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035 0.035" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Expanded Cinematic Island Dock (liquid-crystal-card glassmorphism treatment) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-crystal-card pointer-events-auto relative mt-2.5 flex w-full max-w-[420px] flex-col justify-between rounded-[14px] p-5 text-white isolate shadow-[0px_0px_24px_-6px_rgba(0,240,255,0.35)]"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
          >
            {/* Header / Identity */}
            <div className="relative z-10 flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-cyan-400/80 bg-white/10 shadow-[0_0_14px_rgba(0,240,255,0.4)]">
                  <Sparkles className="size-4 text-cyan-300 animate-pulse" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                    <span className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      isActive ? "bg-cyan-400" : "bg-zinc-500"
                    )} />
                    <span className={cn(
                      "relative inline-flex size-2.5 rounded-full",
                      isSpeaking ? "bg-cyan-400" : isListening ? "bg-blue-400" : isActive ? "bg-emerald-400" : "bg-zinc-500"
                    )} />
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="m-0 text-sm font-semibold tracking-wide text-white">Prometheus Jarvis</p>
                  <p className="m-0 text-xs text-cyan-200/70 font-mono tracking-wider">Autonomous Video AI</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-colors",
                    isActive ? "text-cyan-300 bg-cyan-500/15" : "text-white/40 bg-white/5"
                  )}
                  title={isActive ? "Jarvis Connected" : "Jarvis Standby"}
                >
                  <Radio className={cn("size-3.5", isActive && "animate-pulse")} />
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="grid size-7 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Minimize into filament"
                  title="Minimize into filament"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Live Subtitle / Neural Channel */}
            <div className="relative z-10 mt-3 text-center">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-[8px] text-left">
                {latestTranscript ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-white/90">
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
                  <p className="text-cyan-200/70 text-xs italic">Listening... Speak freely or trigger autonomous commands.</p>
                ) : companion.status === 'connecting' ? (
                  <p className="text-cyan-200/70 text-xs italic">Connecting to Gemini Multimodal Live API...</p>
                ) : (
                  <div>
                    <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-cyan-300">Autonomous Neural Core</h4>
                    <p className="m-0 mt-1 text-[11px] text-white/60">
                      Filament synchronized with editor. Ready for voice & autonomous commands.
                    </p>
                  </div>
                )}
              </div>

              {/* Text channel: type to Jarvis when speaking is not an option */}
              {isActive && (
                <form
                  className="mt-2.5 flex items-center gap-1.5"
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
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white/90 outline-none backdrop-blur-md transition-colors placeholder:text-white/30 focus:border-cyan-400/50"
                  />
                  <button
                    type="submit"
                    disabled={!textDraft.trim()}
                    aria-label="Send message to Jarvis"
                    className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-400 text-black transition-transform active:scale-95 hover:bg-cyan-300 disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" strokeWidth={2.4} />
                  </button>
                </form>
              )}
            </div>

            {/* Liquid Gooey Morphing Action Bar */}
            <div className="relative z-10 mt-4 border-t border-white/10 pt-3 flex flex-col items-center justify-center">
              <Liquid
                blur={5}
                contrast={18}
                fill="rgba(255,255,255,0.08)"
                shadow="0 4px 14px rgba(0,0,0,0.45)"
                className="relative flex items-center justify-center gap-3 py-1"
              >
                {/* 1. Mute / Unmute */}
                <Liquid.Item x={isExpanded ? -80 : 0} y={0} transition="bouncy">
                  <button
                    type="button"
                    onClick={companion.toggleMute}
                    data-action="filament-mute-mic"
                    data-autonomous-target="filament-mic"
                    title={companion.isMuted ? "Unmute microphone" : "Mute microphone"}
                    aria-label={companion.isMuted ? "Unmute microphone" : "Mute microphone"}
                    className={cn(
                      "round-btn flex size-9 items-center justify-center rounded-full border transition-all active:scale-95 shadow-md",
                      companion.isMuted
                        ? "border-rose-400/50 bg-rose-500/25 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                        : "border-white/20 bg-white/10 text-white/90 hover:bg-white/20 hover:text-white"
                    )}
                  >
                    {companion.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </button>
                </Liquid.Item>

                {/* 2. Vision Stream */}
                <Liquid.Item x={isExpanded ? -40 : 0} y={0} transition="bouncy" delay={30}>
                  <button
                    type="button"
                    onClick={companion.toggleVision}
                    title={companion.isVisionActive ? "Vision stream active (Click to pause)" : "Vision stream off (Click to enable)"}
                    aria-label={companion.isVisionActive ? "Vision stream active" : "Vision stream off"}
                    className={cn(
                      "round-btn flex size-9 items-center justify-center rounded-full border transition-all active:scale-95 shadow-md",
                      companion.isVisionActive
                        ? "border-cyan-400/60 bg-cyan-500/25 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                        : "border-white/20 bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                    )}
                  >
                    {companion.isVisionActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                </Liquid.Item>

                {/* 3. Autonomous Takeover ("take a wire") */}
                <Liquid.Item x={0} y={isExpanded ? -3 : 0} transition="bouncy" delay={60}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(bridge.isTakeoverEnabled)}
                    onClick={() => {
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
                    title={
                      bridge.isTakeoverEnabled
                        ? "Agent Takeover active (Click to release)"
                        : "Autonomous Takeover (Click to let Jarvis take control)"
                    }
                    aria-label={bridge.isTakeoverEnabled ? "Agent Takeover active" : "Autonomous Takeover"}
                    className={cn(
                      "round-btn relative flex size-10 items-center justify-center rounded-full border transition-all active:scale-95 shadow-lg",
                      bridge.isTakeoverEnabled
                        ? "border-amber-400/80 bg-amber-400/25 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.6)]"
                        : "border-cyan-400/40 bg-white/10 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20"
                    )}
                  >
                    <Sparkles className={cn("size-4", bridge.isTakeoverEnabled && "animate-spin")} style={{ animationDuration: '4s' }} />
                    {bridge.isTakeoverEnabled && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-amber-400" />
                      </span>
                    )}
                  </button>
                </Liquid.Item>

                {/* 4. Editor Neural Link ("digital link") */}
                <Liquid.Item x={isExpanded ? 40 : 0} y={0} transition="bouncy" delay={90}>
                  <div
                    title={isEditorLinked ? "Editor linked to Jarvis" : "Editor idle (open a project to link)"}
                    aria-label={isEditorLinked ? "Editor linked" : "Editor idle"}
                    className={cn(
                      "round-btn flex size-9 items-center justify-center rounded-full border transition-all shadow-md",
                      isEditorLinked
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)]"
                        : "border-white/20 bg-white/10 text-white/40"
                    )}
                  >
                    <Radio className={cn("size-4", isEditorLinked && "animate-pulse")} />
                  </div>
                </Liquid.Item>

                {/* 5. Connect / Disconnect Power */}
                <Liquid.Item x={isExpanded ? 80 : 0} y={0} transition="bouncy" delay={120}>
                  <button
                    type="button"
                    onClick={
                      companion.status === 'disconnected' || companion.status === 'error'
                        ? companion.connect
                        : companion.disconnect
                    }
                    title={
                      companion.status === 'disconnected' || companion.status === 'error'
                        ? "Connect to Gemini Live Neural Companion"
                        : "Disconnect Session"
                    }
                    aria-label={
                      companion.status === 'disconnected' || companion.status === 'error'
                        ? "Connect Jarvis"
                        : "Disconnect Jarvis"
                    }
                    className={cn(
                      "round-btn flex size-9 items-center justify-center rounded-full border transition-all active:scale-95 shadow-md",
                      companion.status === 'disconnected' || companion.status === 'error'
                        ? "border-cyan-400 bg-cyan-400/30 text-cyan-200 hover:bg-cyan-400 hover:text-black shadow-[0_0_14px_rgba(0,240,255,0.4)]"
                        : "border-white/20 bg-white/10 text-white/80 hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-300"
                    )}
                  >
                    <Power className="size-4" />
                  </button>
                </Liquid.Item>
              </Liquid>

              <p className="mt-2.5 text-center text-[10px] tracking-wide text-white/45" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                Tip: Press ESC or move mouse quickly to exit autonomous takeover anytime.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
