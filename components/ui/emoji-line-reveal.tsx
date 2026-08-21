"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface EmojiLineRevealProps {
  lines?: { text: string; emoji?: string }[]
  className?: string
}

export function EmojiLineReveal({
  lines = [
    { text: "HI 👋, FRIEND!" },
    { text: "🌤️ IT IS NICE ↗ TO" },
    { text: "MEET 😊 YOU" },
  ],
  className,
}: EmojiLineRevealProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-center font-sans font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#0022ff] select-none bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl w-full",
        className
      )}
      style={{
        backgroundImage: "radial-gradient(#e5e7eb 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
    >
      {lines.map((line, idx) => (
        <div key={idx} className="overflow-hidden py-1">
          <motion.div
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              duration: 1,
              delay: idx * 0.16,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex items-center gap-2"
          >
            {line.text}
          </motion.div>
        </div>
      ))}
    </div>
  )
}
