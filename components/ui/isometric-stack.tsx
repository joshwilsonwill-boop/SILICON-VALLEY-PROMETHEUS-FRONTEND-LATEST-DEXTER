"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface IsometricStackProps {
  words?: string[]
  className?: string
  wordClassName?: string
}

export function IsometricStack({
  words = ["INFINITE", "PROGRESS", "INNOVATION", "FUTURE", "DREAMS", "ACHIEVEMENT"],
  className,
  wordClassName,
}: IsometricStackProps) {
  return (
    <div className={cn("relative w-full h-full min-h-[320px] bg-[#58585c] flex items-center justify-center overflow-hidden perspective-[1200px]", className)}>
      {/* 3D Tilted Perspective Container */}
      <div
        className="transform-gpu flex flex-col items-center justify-center space-y-1 sm:space-y-2 select-none"
        style={{
          transform: "rotateX(38deg) rotateZ(-28deg) skewX(12deg)",
        }}
      >
        {words.map((word, index) => (
          <motion.div
            key={`${word}-${index}`}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.8,
              delay: index * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={cn(
              "font-black text-4xl sm:text-5xl md:text-6xl tracking-tighter text-black drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-105",
              wordClassName
            )}
          >
            {word}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
