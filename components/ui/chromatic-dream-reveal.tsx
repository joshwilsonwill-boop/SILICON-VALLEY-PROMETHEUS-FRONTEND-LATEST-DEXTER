"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ChromaticDreamRevealProps {
  text?: string
  className?: string
}

export function ChromaticDreamReveal({
  text = "DREAM",
  className,
}: ChromaticDreamRevealProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans font-black text-6xl sm:text-7xl md:text-8xl tracking-tight select-none bg-[#f8fafc] p-12 rounded-2xl border border-neutral-200 shadow-2xl min-h-[300px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      <div key={replayKey} className="relative flex items-center justify-center">
        {/* Red Chromatic Shift Layer */}
        <motion.span
          initial={{ opacity: 0, x: -12, filter: "blur(18px)" }}
          animate={{ opacity: 0.7, x: -3, filter: "blur(2px)" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute font-black text-red-600 mix-blend-multiply pointer-events-none"
        >
          {text}
        </motion.span>

        {/* Cyan Chromatic Shift Layer */}
        <motion.span
          initial={{ opacity: 0, x: 12, filter: "blur(18px)" }}
          animate={{ opacity: 0.7, x: 3, filter: "blur(2px)" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute font-black text-cyan-500 mix-blend-multiply pointer-events-none"
        >
          {text}
        </motion.span>

        {/* Main Solid Hero Text Layer with Lens Blur Recovery */}
        <motion.span
          initial={{ opacity: 0, scale: 0.9, filter: "blur(22px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 font-black text-[#09090b] uppercase"
        >
          {text}
        </motion.span>
      </div>
    </div>
  )
}
