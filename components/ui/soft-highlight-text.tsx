"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface SoftHighlightTextProps {
  prefixText?: string
  words?: string[]
  intervalDuration?: number
  className?: string
}

export function SoftHighlightText({
  prefixText = "Design",
  words = ["Limitless", "Boundless", "Seamless", "Effortless"],
  intervalDuration = 2800,
  className,
}: SoftHighlightTextProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, intervalDuration)
    return () => clearInterval(timer)
  }, [words.length, intervalDuration])

  return (
    <div className={cn("inline-flex items-center font-sans text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 select-none bg-white p-8 rounded-2xl shadow-lg border border-neutral-100", className)}>
      {/* Fixed Prefix Word */}
      <span className="text-neutral-900 font-semibold mr-3">{prefixText}</span>

      {/* Subtle Soft Purple Highlight Box & Word Cycler */}
      <div className="relative inline-flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={words[index]}
            initial={{ opacity: 0, x: -6, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 6, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative px-3 py-1 bg-purple-100/80 rounded-md text-purple-700 font-extrabold flex items-center shadow-sm border border-purple-200/50"
          >
            <span>{words[index]}</span>
            {/* Subtle Selection Cursor Indicator Line */}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-[2px] h-6 bg-purple-600 ml-1 inline-block rounded-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
