"use client"

import React, { useEffect, useState } from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { cn } from "@/lib/utils"

interface ChromeHeroTextProps {
  value?: number
  duration?: number
  className?: string
}

export function ChromeHeroText({
  value = 404,
  duration = 2.5,
  className,
}: ChromeHeroTextProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1)
      
      // Ultra-smooth Apple HIG easeOutQuart physics curve
      const easeProgress = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeProgress * value))

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setCount(value)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [value, duration])

  return (
    <div className={cn("flex flex-col items-center justify-center font-sans select-none text-center bg-black p-8 rounded-2xl border border-white/10 w-full", className)}>
      {/* 3D Metallic Chrome Hero Count-Up Display (No Subtext) */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.82, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 22,
          mass: 0.8,
        }}
        className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent leading-none py-2"
        style={{
          backgroundImage: "linear-gradient(180deg, #ffffff 0%, #e4e4e7 35%, #71717a 70%, #27272a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.95))",
        }}
      >
        {count.toLocaleString()}
      </motion.h1>
    </div>
  )
}
