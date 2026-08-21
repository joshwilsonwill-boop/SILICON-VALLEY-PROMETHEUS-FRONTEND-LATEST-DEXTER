"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MatrixScrambleTextProps {
  text?: string
  subText?: string
  className?: string
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"

export function MatrixScrambleText({
  text = "DYNAMIC TEXT",
  subText = "HOVER ME",
  className,
}: MatrixScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text)
  const [displaySubText, setDisplaySubText] = useState(subText)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    let iteration = 0

    if (isHovered) {
      interval = setInterval(() => {
        setDisplayText(
          text
            .split("")
            .map((char, index) => {
              if (char === " ") return " "
              if (index < iteration) return text[index]
              return CHARS[Math.floor(Math.random() * CHARS.length)]
            })
            .join("")
        )

        setDisplaySubText(
          subText
            .split("")
            .map((char, index) => {
              if (char === " ") return " "
              if (index < iteration) return subText[index]
              return CHARS[Math.floor(Math.random() * CHARS.length)]
            })
            .join("")
        )

        if (iteration >= Math.max(text.length, subText.length)) {
          clearInterval(interval)
        }

        iteration += 1 / 3
      }, 30)
    } else {
      setDisplayText(text)
      setDisplaySubText(subText)
    }

    return () => clearInterval(interval)
  }, [isHovered, text, subText])

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("flex flex-col items-start justify-center font-mono select-none cursor-pointer group", className)}
    >
      {/* Top Neon Yellow Scramble Bar */}
      <div className="bg-[#ffff00] text-black font-black text-3xl sm:text-4xl md:text-5xl tracking-wider px-4 py-2 w-full transition-transform duration-200 group-hover:scale-[1.02]">
        {displayText}
      </div>

      {/* Sub Muted Text Bar */}
      <div className="text-zinc-500 font-bold text-2xl sm:text-3xl md:text-4xl tracking-wider px-4 py-1 mt-1 transition-colors duration-200 group-hover:text-zinc-200">
        {displaySubText}
      </div>
    </div>
  )
}
