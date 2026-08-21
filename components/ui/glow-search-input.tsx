"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlowSearchInputProps {
  phrases?: string[]
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
  className?: string
}

export function GlowSearchInput({
  phrases = ["New search", "Search animation DNA", "Explore kinetic traits", "Prometheus UI"],
  typingSpeed = 90,
  deletingSpeed = 45,
  pauseDuration = 1800,
  className,
}: GlowSearchInputProps) {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [replayKey, setReplayKey] = useState(0)

  useEffect(() => {
    const currentPhrase = phrases[phraseIdx % phrases.length]

    let timer: NodeJS.Timeout

    if (!isDeleting && displayText.length < currentPhrase.length) {
      // Type next character
      timer = setTimeout(() => {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1))
      }, typingSpeed)
    } else if (!isDeleting && displayText.length === currentPhrase.length) {
      // Pause before deleting
      timer = setTimeout(() => {
        setIsDeleting(true)
      }, pauseDuration)
    } else if (isDeleting && displayText.length > 0) {
      // Delete previous character
      timer = setTimeout(() => {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1))
      }, deletingSpeed)
    } else if (isDeleting && displayText.length === 0) {
      // Move to next phrase
      setIsDeleting(false)
      setPhraseIdx((prev) => (prev + 1) % phrases.length)
    }

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, phraseIdx, phrases, typingSpeed, deletingSpeed, pauseDuration, replayKey])

  const handleReplay = () => {
    setDisplayText("")
    setIsDeleting(false)
    setPhraseIdx(0)
    setReplayKey((prev) => prev + 1)
  }

  return (
    <div
      onClick={handleReplay}
      className={cn(
        "relative flex items-center justify-center font-sans select-none bg-[#050508] p-12 rounded-2xl border border-white/10 shadow-2xl min-h-[300px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      <div key={replayKey} className="relative flex items-center p-4 px-6 bg-[#09090d] border border-white/15 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] min-w-[340px] max-w-[500px]">
        {/* Soft Radial Ambient Blue Glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.65, 0.35], scaleX: [0.95, 1.1, 0.95] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-4 top-2 bottom-2 w-20 bg-blue-500/30 filter blur-xl rounded-lg pointer-events-none"
        />

        {/* Animated Blue Pulse Caret Cursor Bar */}
        <motion.div
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="w-[3px] h-7 bg-blue-500 rounded-full shadow-[0_0_12px_#3b82f6] mr-2.5 relative z-10 shrink-0"
        />

        {/* Active Typewriter Text */}
        <span className="text-2xl sm:text-3xl font-medium text-gray-100 tracking-tight relative z-10 min-h-[40px] flex items-center">
          {displayText}
        </span>
      </div>
    </div>
  )
}
