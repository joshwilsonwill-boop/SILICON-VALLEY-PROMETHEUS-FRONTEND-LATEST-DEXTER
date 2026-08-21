"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface HybridCollaborativeSlotTextProps {
  word1?: string
  word2?: string
  subIndices?: number[]
  superIndices?: number[]
  color1?: string
  color2?: string
  className?: string
}

export function HybridCollaborativeSlotText({
  word1 = "motion",
  word2 = "primitives",
  subIndices = [1], // 'o' in motion
  superIndices = [1], // 'r' in primitives
  color1 = "#ea580c", // Orange pointer
  color2 = "#2563eb", // Blue pointer
  className,
}: HybridCollaborativeSlotTextProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex items-center justify-center font-sans font-medium text-4xl sm:text-5xl md:text-6xl tracking-tight text-neutral-900 select-none bg-white p-12 rounded-2xl border border-neutral-200 shadow-2xl min-h-[260px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      <div key={replayKey} className="relative flex items-center gap-4 z-10">
        {/* Word 1: Figma Bounding Box Frame + Motion Primitives Character Slot Bouncing */}
        <motion.div
          initial={{ opacity: 0, x: -30, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative px-2 py-1 flex items-center"
        >
          {/* Animated Figma Vector Bounding Box */}
          <motion.div
            initial={{ scaleX: 0, scaleY: 0.2, opacity: 0 }}
            animate={{ scaleX: 1, scaleY: 1, opacity: 1 }}
            transition={{
              duration: 0.7,
              delay: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute -inset-2 border-2 border-blue-400 rounded-sm pointer-events-none shadow-[0_0_14px_rgba(96,165,250,0.4)] origin-center"
          >
            {/* 4 Corner Anchor Handles */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.85, type: "spring", stiffness: 400 }}
              className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border border-blue-600 rounded-sm"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 400 }}
              className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border border-blue-600 rounded-sm"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.95, type: "spring", stiffness: 400 }}
              className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border border-blue-600 rounded-sm"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.0, type: "spring", stiffness: 400 }}
              className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border border-blue-600 rounded-sm"
            />
          </motion.div>

          {/* Word 1 Character Slot Bouncing */}
          {Array.from(word1).map((char, index) => {
            const isOffsetSub = subIndices.includes(index)
            return (
              <motion.span
                key={`w1-${char}-${index}`}
                animate={{
                  y: isHovered ? 0 : isOffsetSub ? [0, 8, 0] : [0, -3, 0],
                  scale: isHovered ? 1 : isOffsetSub ? 1.08 : 1,
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: [0.16, 1, 0.3, 1],
                  delay: index * 0.05,
                }}
                className={cn("inline-block relative z-10", {
                  "text-black font-extrabold": isOffsetSub,
                })}
              >
                {char}
              </motion.span>
            )
          })}

          {/* Cursor Pointer 1 */}
          <motion.div
            initial={{ opacity: 0, x: -40, y: 40 }}
            animate={{
              opacity: 1,
              x: [-40, 0, 4, 0],
              y: [40, 0, -4, 0],
            }}
            transition={{
              duration: 1.2,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute -bottom-7 -left-3 z-20 pointer-events-none"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={color1}
              className="drop-shadow-md"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Word 2: Motion Primitives Character Slot Bouncing */}
        <motion.div
          initial={{ opacity: 0, y: 25, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center px-1"
        >
          {Array.from(word2).map((char, index) => {
            const isOffsetSuper = superIndices.includes(index)
            return (
              <motion.span
                key={`w2-${char}-${index}`}
                animate={{
                  y: isHovered ? 0 : isOffsetSuper ? [0, -10, 0] : [0, -3, 0],
                  scale: isHovered ? 1 : isOffsetSuper ? 1.08 : 1,
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: [0.16, 1, 0.3, 1],
                  delay: (word1.length + index) * 0.05,
                }}
                className={cn("inline-block relative z-10", {
                  "text-black font-extrabold": isOffsetSuper,
                })}
              >
                {char}
              </motion.span>
            )
          })}

          {/* Cursor Pointer 2 */}
          <motion.div
            initial={{ opacity: 0, x: 40, y: 40 }}
            animate={{
              opacity: 1,
              x: [40, 0, -4, 0],
              y: [40, 0, 4, 0],
            }}
            transition={{
              duration: 1.3,
              delay: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute -bottom-7 left-3 z-20 pointer-events-none"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={color2}
              className="drop-shadow-md"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
