"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GeometricCrosshairTextProps {
  topWord?: string
  bottomWord?: string
  className?: string
}

export function GeometricCrosshairText({
  topWord = "geometric",
  bottomWord = "fonts",
  className,
}: GeometricCrosshairTextProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans select-none bg-black p-12 rounded-2xl border border-white/10 shadow-2xl min-h-[320px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      <div key={replayKey} className="relative flex flex-col items-start leading-none">
        
        {/* Precision Grid Line Overlays */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.35 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute -left-16 -right-16 bottom-10 h-[1px] bg-white/40 pointer-events-none"
        />
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 0.35 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
          className="absolute -top-16 -bottom-16 left-6 w-[1px] bg-white/40 pointer-events-none"
        />

        {/* Optical Lens Flare Starburst Highlight at Crosshair Intersection */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.8] }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
          className="absolute left-6 bottom-10 -translate-x-1/2 translate-y-1/2 w-8 h-8 pointer-events-none z-20"
        >
          {/* Radial Glow Aura */}
          <div className="absolute inset-0 bg-white rounded-full blur-md opacity-80" />
          {/* Star Flare Rays */}
          <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-white shadow-[0_0_8px_#ffffff]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-white shadow-[0_0_8px_#ffffff]" />
        </motion.div>

        {/* Bottom Red Blueprint Focus Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="absolute -bottom-5 left-0 w-36 h-[4px] bg-gradient-to-r from-red-600 via-red-500 to-transparent shadow-[0_0_12px_#ef4444]"
        />

        {/* Top Word: geometric (Grayed gradient blend) */}
        <motion.span
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-neutral-400 leading-none -mb-3 bg-gradient-to-r from-neutral-100 via-neutral-400 to-neutral-700 bg-clip-text text-transparent"
        >
          {topWord}
        </motion.span>

        {/* Bottom Word: fonts (Bold White Metallic Chrome Hero) */}
        <motion.span
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter leading-none bg-gradient-to-b from-white via-neutral-200 to-neutral-600 bg-clip-text text-transparent drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]"
        >
          {bottomWord}
        </motion.span>
      </div>
    </div>
  )
}
