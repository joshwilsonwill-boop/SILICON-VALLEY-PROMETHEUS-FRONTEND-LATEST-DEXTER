"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MagneticSnapTextProps {
  text?: string
  className?: string
}

export function MagneticSnapText({
  text = "MAGNETIC SNAP",
  className,
}: MagneticSnapTextProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans font-black text-4xl sm:text-5xl md:text-6xl tracking-tight text-neutral-900 select-none bg-white p-12 rounded-2xl border border-neutral-200 shadow-2xl min-h-[260px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      <div key={replayKey} className="relative flex flex-col items-center">
        {/* Top Half Split Mask */}
        <div className="overflow-hidden h-[42px] sm:h-[50px] md:h-[60px] flex items-end">
          <motion.span
            initial={{ y: "-100%", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 22,
              delay: 0.1,
            }}
            className="inline-block text-black font-extrabold uppercase leading-none"
          >
            {text}
          </motion.span>
        </div>

        {/* Bottom Half Split Mask */}
        <div className="overflow-hidden h-[42px] sm:h-[50px] md:h-[60px] flex items-start -mt-1">
          <motion.span
            initial={{ y: "100%", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 450,
              damping: 22,
              delay: 0.2,
            }}
            className="inline-block text-neutral-400 font-bold uppercase leading-none"
          >
            {text}
          </motion.span>
        </div>

        {/* Central Kinetic Dividing Spark Line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeInOut" }}
          className="absolute top-1/2 left-0 right-0 h-[2px] bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.8)] pointer-events-none"
        />
      </div>
    </div>
  )
}
