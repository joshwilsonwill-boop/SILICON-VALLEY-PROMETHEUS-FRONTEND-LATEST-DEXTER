"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface NeonPulseStrokeProps {
  text?: string
  accentColor?: string
  secondaryColor?: string
  className?: string
}

export function NeonPulseStroke({
  text = "NEON PULSE",
  accentColor = "#06b6d4", // Electric Cyan
  secondaryColor = "#a855f7", // Vibrant Purple
  className,
}: NeonPulseStrokeProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans font-black text-5xl sm:text-6xl md:text-7xl tracking-wider text-transparent select-none bg-black p-12 rounded-2xl border border-white/10 shadow-2xl min-h-[260px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      {/* Background Radial Glow */}
      <motion.div
        key={`glow-${replayKey}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0.3, 0.7, 0.4], scale: [0.9, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-96 h-96 rounded-full blur-[120px] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, ${secondaryColor} 70%, transparent 100%)`,
        }}
      />

      {/* Main Text Layer */}
      <motion.div
        key={`text-${replayKey}`}
        initial={{ opacity: 0, scale: 0.92, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 text-center"
      >
        <span
          className="relative inline-block text-white drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]"
          style={{
            WebkitTextStroke: `1.5px ${accentColor}`,
            textShadow: `0 0 20px ${accentColor}, 0 0 40px ${secondaryColor}`,
          }}
        >
          {text}
        </span>

        {/* Pulsing Sparkle Particle Accents */}
        <motion.span
          animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-4 -right-6 text-xl text-cyan-300 drop-shadow-[0_0_10px_#06b6d4]"
        >
          ✦
        </motion.span>
        <motion.span
          animate={{ scale: [1.2, 0.7, 1.2], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-4 -left-6 text-lg text-purple-300 drop-shadow-[0_0_10px_#a855f7]"
        >
          ✦
        </motion.span>
      </motion.div>
    </div>
  )
}
