"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MotionPrimitivesTextProps {
  text?: string
  /** 0-based character indices to shift subscript down */
  subIndices?: number[]
  /** 0-based character indices to shift superscript up */
  superIndices?: number[]
  className?: string
}

export function MotionPrimitivesText({
  text = "motion-primitives",
  subIndices,
  superIndices,
  className,
}: MotionPrimitivesTextProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Smart default slot calculation if custom indices aren't provided:
  // Dynamically targets ~15% and ~30% character positions for any word length.
  const activeSub = subIndices ?? [Math.min(1, text.length - 1)]
  const activeSuper = superIndices ?? [Math.min(2, text.length - 1)]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative inline-flex items-center justify-center font-sans text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-neutral-900 select-none cursor-pointer group",
        className
      )}
    >
      {Array.from(text).map((char, index) => {
        const isOffsetSub = activeSub.includes(index)
        const isOffsetSuper = activeSuper.includes(index)

        return (
          <motion.span
            key={`${char}-${index}`}
            animate={{
              y: isHovered
                ? 0
                : isOffsetSub
                ? [0, 8, 0]
                : isOffsetSuper
                ? [0, -10, 0]
                : [0, -3, 0],
              scale: isHovered ? 1 : isOffsetSub || isOffsetSuper ? 1.06 : 1,
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: [0.16, 1, 0.3, 1],
              delay: index * 0.06,
            }}
            className={cn("inline-block relative", {
              "text-neutral-950 font-extrabold": isOffsetSub || isOffsetSuper,
            })}
          >
            {char}
          </motion.span>
        )
      })}
    </div>
  )
}
