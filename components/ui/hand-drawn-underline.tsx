"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface HandDrawnUnderlineProps {
  children?: React.ReactNode
  text?: string
  className?: string
  textClassName?: string
  strokeColor?: string
  strokeWidth?: number
  duration?: number
}

export function HandDrawnUnderline({
  children,
  text = "Namaste World!",
  className,
  textClassName,
  strokeColor = "#000000",
  strokeWidth = 3,
  duration = 1.2,
}: HandDrawnUnderlineProps) {
  const [isDrawn, setIsDrawn] = useState(false)

  useEffect(() => {
    setIsDrawn(true)
    const interval = setInterval(() => {
      setIsDrawn((prev) => !prev)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("relative inline-flex flex-col items-center justify-center font-sans select-none", className)}>
      {/* Headline Text */}
      <span className={cn("text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100", textClassName)}>
        {children || text}
      </span>

      {/* Hand-Drawn Curved Underline SVG */}
      <svg
        className="w-full h-5 mt-1 overflow-visible"
        viewBox="0 0 300 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          d="M 5,8 Q 140,20 295,10"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: isDrawn ? 1 : 0,
            opacity: isDrawn ? 1 : 0,
          }}
          transition={{
            duration: duration,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </svg>
    </div>
  )
}
