"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface HighlightBoxProps {
  prefixText?: string
  highlightText?: string
  suffixText?: string
  boxColor?: string
  textColor?: string
  highlightTextColor?: string
  className?: string
  boxClassName?: string
}

export function HighlightBox({
  prefixText = "Made for ",
  highlightText = "builders.",
  suffixText = "",
  boxColor = "bg-[#ffd000]",
  textColor = "text-white",
  highlightTextColor = "text-black",
  className,
  boxClassName,
}: HighlightBoxProps) {
  const [isHighlighted, setIsHighlighted] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsHighlighted((prev) => !prev)
    }, 2400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={cn("inline-flex items-center font-sans text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight select-none", className)}>
      <span className={textColor}>{prefixText}</span>

      <span className="relative inline-block px-1.5 py-0.5 ml-1">
        {/* Kinetic Yellow Box Background */}
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHighlighted ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={cn("absolute inset-0 origin-left rounded-sm z-0", boxColor, boxClassName)}
        />

        {/* Text inside highlight box with dynamic color inversion */}
        <motion.span
          animate={{ color: isHighlighted ? "#000000" : "#8e8e93" }}
          transition={{ duration: 0.35 }}
          className="relative z-10 font-bold"
        >
          {highlightText}
        </motion.span>
      </span>

      {suffixText && <span className={textColor}>{suffixText}</span>}
    </div>
  )
}
