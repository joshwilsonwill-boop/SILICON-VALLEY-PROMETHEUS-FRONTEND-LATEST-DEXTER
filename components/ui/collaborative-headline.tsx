"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface CollaborativeHeadlineProps {
  word1?: string
  word2?: string
  color1?: string
  color2?: string
  className?: string
}

export function CollaborativeHeadline({
  word1 = "Design",
  word2 = "together",
  color1 = "#f97316", // Orange cursor pointer
  color2 = "#2563eb", // Blue cursor pointer
  className,
}: CollaborativeHeadlineProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans font-bold text-5xl sm:text-6xl md:text-7xl tracking-tight text-white select-none bg-black p-12 rounded-2xl border border-white/10 shadow-2xl min-h-[260px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      {/* Background Warm Orange Light Leak Glow */}
      <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-orange-600/30 rounded-full blur-[100px] pointer-events-none" />

      <div key={replayKey} className="relative flex items-center gap-5 z-10">
        {/* Word 1: Independent Kinetic Entrance */}
        <motion.div
          initial={{ opacity: 0, x: -40, filter: "blur(10px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative group"
        >
          {/* Animated Figma Selection Box (Expands to cover Word 1) */}
          <motion.div
            initial={{ scaleX: 0, scaleY: 0.2, opacity: 0 }}
            animate={{ scaleX: 1, scaleY: 1, opacity: 1 }}
            transition={{
              duration: 0.7,
              delay: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute -inset-2.5 border-2 border-blue-400 rounded-sm pointer-events-none shadow-[0_0_16px_rgba(96,165,250,0.5)] origin-center"
          >
            {/* 4 Corner Anchor Handles with Spring Pop-In */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 400 }}
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 rounded-sm"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.95, type: "spring", stiffness: 400 }}
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 rounded-sm"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.0, type: "spring", stiffness: 400 }}
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 rounded-sm"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.05, type: "spring", stiffness: 400 }}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 rounded-sm"
            />
          </motion.div>

          <span className="relative z-10 px-1 text-white">{word1}</span>

          {/* Cursor Pointer 1 (No text badge) */}
          <motion.div
            initial={{ opacity: 0, x: -60, y: 60 }}
            animate={{
              opacity: 1,
              x: [-60, 0, 4, 0],
              y: [60, 0, -4, 0],
            }}
            transition={{
              duration: 1.2,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute -bottom-7 -left-3 z-20 pointer-events-none"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={color1}
              className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Word 2: Independent Kinetic Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <span className="text-neutral-200">{word2}</span>

          {/* Cursor Pointer 2 (No text badge) */}
          <motion.div
            initial={{ opacity: 0, x: 60, y: 60 }}
            animate={{
              opacity: 1,
              x: [60, 0, -4, 0],
              y: [60, 0, 4, 0],
            }}
            transition={{
              duration: 1.3,
              delay: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute -bottom-7 left-2 z-20 pointer-events-none"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={color2}
              className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
