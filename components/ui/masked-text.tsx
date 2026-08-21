"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CinematicMaskedTextProps {
  text?: string
  imageUrl?: string
  className?: string
  sweepDuration?: number
}

export function CinematicMaskedText({
  text = "STUNNING",
  imageUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80",
  className,
  sweepDuration = 18,
}: CinematicMaskedTextProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center font-sans text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter select-none overflow-hidden", className)}>
      {/* Full Word Mask with Ultra-Slow Cinematic Viewport Sweep */}
      <motion.span
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: sweepDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "220% 220%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "brightness(1.15) contrast(1.1)",
        }}
        className="relative z-10 block"
      >
        {text}
      </motion.span>
    </div>
  )
}
