"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface GooeyTextProps {
  words?: string[]
  intervalDuration?: number
  className?: string
}

export function GooeyText({
  words = ["Designali", "Creative", "Prometheus", "Innovation"],
  intervalDuration = 3200,
  className,
}: GooeyTextProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, intervalDuration)
    return () => clearInterval(timer)
  }, [words.length, intervalDuration])

  return (
    <div className={cn("relative flex items-center justify-center select-none bg-white p-8 rounded-2xl shadow-xl min-h-[220px] w-full overflow-hidden", className)}>
      {/* SVG Threshold Filter with tuned deviation */}
      <svg className="absolute w-0 h-0 pointer-events-none">
        <defs>
          <filter id="gooey-ink-threshold">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="gooey"
            />
          </filter>
        </defs>
      </svg>

      <div className="relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={words[index]}
            initial={{ opacity: 0, scale: 0.88, filter: "url(#gooey-ink-threshold) blur(8px)" }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: [
                "url(#gooey-ink-threshold) blur(6px)",
                "url(#gooey-ink-threshold) blur(2px)",
                "none",
              ],
            }}
            exit={{ opacity: 0, scale: 1.1, filter: "url(#gooey-ink-threshold) blur(8px)" }}
            transition={{
              duration: 1.1,
              ease: [0.16, 1, 0.3, 1],
              filter: { duration: 1.1, times: [0, 0.6, 1] },
            }}
            className="font-sans font-black text-5xl sm:text-6xl md:text-7xl text-black tracking-tight"
          >
            {words[index]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
