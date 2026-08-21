"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface ElegantBlurProps {
  text?: string
  className?: string
  wordClassName?: string
  staggerDuration?: number
  blurAmount?: number
  repeatInterval?: number
}

export function ElegantBlurText({
  text = "Elegant blur animation that brings your words to life with cinematic transitions.",
  className,
  wordClassName,
  staggerDuration = 0.08,
  blurAmount = 14,
  repeatInterval = 5000,
}: ElegantBlurProps) {
  const [key, setKey] = useState(0)
  const words = text.split(" ")

  useEffect(() => {
    const interval = setInterval(() => {
      setKey((prev) => prev + 1)
    }, repeatInterval)
    return () => clearInterval(interval)
  }, [repeatInterval])

  return (
    <div className={cn("relative max-w-xl text-left font-sans text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed tracking-wide text-neutral-100 select-none", className)}>
      <AnimatePresence mode="wait">
        <motion.p key={key} className="flex flex-wrap gap-x-2 gap-y-1">
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              initial={{
                filter: `blur(${blurAmount}px)`,
                opacity: 0,
                y: 6,
                scale: 0.98,
              }}
              animate={{
                filter: "blur(0px)",
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                filter: `blur(${blurAmount}px)`,
                opacity: 0,
                y: -6,
                scale: 0.98,
              }}
              transition={{
                duration: 0.9,
                delay: index * staggerDuration,
                ease: [0.16, 1, 0.3, 1], // Apple spring ease curve
              }}
              className={cn("inline-block", wordClassName)}
            >
              {word}
            </motion.span>
          ))}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
