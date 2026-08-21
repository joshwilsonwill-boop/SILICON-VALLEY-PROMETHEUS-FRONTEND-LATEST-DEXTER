"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StrokeSparkleTextProps {
  text?: string
  className?: string
}

export function StrokeSparkleText({
  text = "21st.dev",
  className,
}: StrokeSparkleTextProps) {
  const [isSolid, setIsSolid] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsSolid(true)}
      onMouseLeave={() => setIsSolid(false)}
      className={cn(
        "relative flex items-center justify-center font-sans font-extrabold text-5xl sm:text-6xl md:text-7xl tracking-tight text-white select-none bg-black p-10 rounded-2xl border border-white/10 shadow-2xl w-full cursor-pointer overflow-hidden min-h-[220px]",
        className
      )}
    >
      {/* State 1: Vector Stroke Outline & Sparkling Trace Star */}
      <div className="relative flex items-center justify-center">
        <span
          className={cn(
            "transition-all duration-700 ease-out",
            isSolid
              ? "opacity-0 scale-95 filter blur-md"
              : "opacity-100 scale-100 filter blur-0"
          )}
          style={{
            WebkitTextStroke: "1.5px #ffffff",
            color: "transparent",
          }}
        >
          {text}
        </span>

        {/* Tracing Star Sparkle Accent */}
        {!isSolid && (
          <motion.span
            animate={{
              x: [-120, 120],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute text-white text-xl drop-shadow-[0_0_12px_#ffffff] pointer-events-none"
          >
            ✦
          </motion.span>
        )}

        {/* State 2: Solid White Blur-Up Reveal */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-white transition-all duration-700 ease-out",
            isSolid
              ? "opacity-100 scale-100 filter blur-0"
              : "opacity-0 scale-105 filter blur-lg pointer-events-none"
          )}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
