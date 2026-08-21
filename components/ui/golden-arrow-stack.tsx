"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GoldenArrowStackProps {
  items?: string[]
  initialIndex?: number
  intervalMs?: number
  className?: string
}

export function GoldenArrowStack({
  items = ["Fashion", "Motors", "Collectibles", "Home", "Garden", "Toys"],
  initialIndex = 2, // Default to "Collectibles" as shown in the reference image
  intervalMs = 2600,
  className,
}: GoldenArrowStackProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [items.length, intervalMs])

  return (
    <div
      onClick={() => setActiveIndex((prev) => (prev + 1) % items.length)}
      className={cn(
        "relative flex flex-col justify-center items-start font-sans font-bold select-none bg-[#eab308] p-10 sm:p-12 rounded-2xl shadow-2xl min-h-[320px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      <div className="relative flex flex-col gap-2.5 z-10 w-full max-w-md">
        {items.map((item, index) => {
          const isActive = index === activeIndex

          return (
            <motion.div
              key={`item-${item}-${index}`}
              animate={{
                scale: isActive ? 1.03 : 1,
                x: isActive ? 8 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
              className="relative flex items-center gap-3 py-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setActiveIndex(index)
              }}
            >
              {/* Kinetic Arrow Indicator (Only locks onto active focus row) */}
              <div className="w-8 flex items-center justify-center">
                {isActive && (
                  <motion.span
                    layoutId="golden-active-arrow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 28,
                    }}
                    className="text-3xl sm:text-4xl font-extrabold text-[#1c1917]"
                  >
                    →
                  </motion.span>
                )}
              </div>

              {/* Text Item (Active = Dark Pitch Black #1c1917, Inactive = Semi-transparent Brown) */}
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.45,
                  color: isActive ? "#1c1917" : "#854d0e",
                  fontWeight: isActive ? 900 : 700,
                }}
                transition={{ duration: 0.35 }}
                className="text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none"
              >
                {item}
              </motion.span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
