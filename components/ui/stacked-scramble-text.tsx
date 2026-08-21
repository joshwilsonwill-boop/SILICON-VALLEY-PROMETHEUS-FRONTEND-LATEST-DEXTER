"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StackedScrambleTextProps {
  topText?: string
  mainText?: string
  subText?: string
  className?: string
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$"

export function StackedScrambleText({
  topText = "TEXT FLOW",
  mainText = "DYNAMIC TEXT",
  subText = "HOVER ME",
  className,
}: StackedScrambleTextProps) {
  const [scrambleVal, setScrambleVal] = useState("KBPQWHJ")
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    let iteration = 0

    if (isHovered) {
      interval = setInterval(() => {
        setScrambleVal(
          subText
            .split("")
            .map((char, index) => {
              if (char === " ") return " "
              if (index < iteration) return subText[index]
              return CHARS[Math.floor(Math.random() * CHARS.length)]
            })
            .join("")
        )

        if (iteration >= subText.length) {
          clearInterval(interval)
        }

        iteration += 1 / 2
      }, 40)
    } else {
      setScrambleVal("KBPQWHJ")
    }

    return () => clearInterval(interval)
  }, [isHovered, subText])

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative flex flex-col items-center justify-center font-mono select-none cursor-pointer group bg-white p-8 rounded-xl shadow-xl border border-neutral-200 max-w-xl w-full", className)}
    >
      {/* LINE 1: STACKED OVERLAY & YELLOW HIGHLIGHT */}
      <div className="relative w-full mb-3">
        {/* Background Ghost Text */}
        <div className="text-zinc-600 font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-widest leading-none opacity-40 select-none transform -translate-y-2">
          {topText}
        </div>
        {/* Foreground Yellow Highlight Bar */}
        <div className="relative z-10 bg-[#ffff00] text-black font-black text-3xl sm:text-4xl md:text-5xl tracking-wider px-3 py-1 -mt-4 w-full shadow-sm">
          {mainText}
        </div>
      </div>

      {/* LINE 2: STACKED HOVER SCRAMBLE & YELLOW HIGHLIGHT */}
      <div className="relative w-full">
        {/* Background Ghost Text */}
        <div className="text-zinc-600 font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-widest leading-none opacity-40 select-none transform -translate-y-2">
          {subText}
        </div>
        {/* Foreground Yellow Highlight Bar */}
        <div className="relative z-10 bg-[#ffff00] text-black font-black text-3xl sm:text-4xl md:text-5xl tracking-wider px-3 py-1 -mt-4 w-full shadow-sm">
          {scrambleVal}
        </div>
      </div>
    </div>
  )
}
