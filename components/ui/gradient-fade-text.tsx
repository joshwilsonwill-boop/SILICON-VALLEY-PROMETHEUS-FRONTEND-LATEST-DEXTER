"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GradientFadeTextProps {
  text?: string
  className?: string
  duration?: number
}

export function GradientFadeText({
  text = "Mishra Hub",
  className,
  duration = 3,
}: GradientFadeTextProps) {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev + 1) % 100)
    }, 40)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("relative inline-block font-sans text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight select-none", className)}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="bg-clip-text text-transparent bg-gradient-to-r from-black via-black/60 to-transparent dark:from-white dark:via-white/60 dark:to-transparent"
        style={{
          backgroundImage: `linear-gradient(90deg, #000000 0%, rgba(0,0,0,0.6) 65%, rgba(255,255,255,0) 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {text}
      </motion.span>
    </div>
  )
}
