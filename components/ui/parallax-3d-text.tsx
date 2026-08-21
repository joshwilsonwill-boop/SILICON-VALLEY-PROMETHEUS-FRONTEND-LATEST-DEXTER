"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface Parallax3DTextProps {
  text?: string
  className?: string
}

export function Parallax3DText({
  text = "PARALLAX 3D",
  className,
}: Parallax3DTextProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans font-black text-5xl sm:text-6xl md:text-7xl tracking-tighter text-white select-none bg-neutral-950 p-12 rounded-2xl border border-white/10 shadow-2xl min-h-[260px] w-full overflow-hidden cursor-pointer perspective-1000",
        className
      )}
      style={{ perspective: "1000px" }}
    >
      <div key={replayKey} className="relative flex items-center justify-center">
        {/* Back Layer (Purple Glow Shadow) */}
        <motion.span
          initial={{ opacity: 0, z: -80, rotateX: 25, rotateY: -20 }}
          animate={{ opacity: 0.35, z: -40, rotateX: 12, rotateY: -10 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute font-black text-purple-500 blur-sm pointer-events-none"
        >
          {text}
        </motion.span>

        {/* Mid Layer (Cyan Accent Shift) */}
        <motion.span
          initial={{ opacity: 0, z: -40, rotateX: 18, rotateY: -15 }}
          animate={{ opacity: 0.6, z: -20, rotateX: 6, rotateY: -5 }}
          transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute font-black text-cyan-400 pointer-events-none"
        >
          {text}
        </motion.span>

        {/* Front Layer (Crisp White Hero) */}
        <motion.span
          initial={{ opacity: 0, z: 40, scale: 0.9, filter: "blur(10px)" }}
          animate={{ opacity: 1, z: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 font-black text-white drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
        >
          {text}
        </motion.span>
      </div>
    </div>
  )
}
