"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface NoiseFineGrainProps {
  text?: string
  className?: string
}

export function NoiseFineGrain({
  text = "NOISE",
  className,
}: NoiseFineGrainProps) {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <div
      onClick={() => setReplayKey((prev) => prev + 1)}
      className={cn(
        "relative flex items-center justify-center font-sans font-black text-6xl sm:text-7xl md:text-8xl tracking-tighter select-none bg-[#ececee] p-12 rounded-2xl border border-neutral-300 shadow-2xl min-h-[320px] w-full overflow-hidden cursor-pointer",
        className
      )}
    >
      {/* SVG Spray Paint & Film Grain Filter Definitions */}
      <svg className="absolute width-0 height-0 pointer-events-none">
        <defs>
          {/* Fine Film Grain Noise Filter */}
          <filter id="spray-grain-noise" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
          {/* Airbrush Spray Blur Filter */}
          <filter id="spray-paint-blur">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div key={replayKey} className="relative flex items-center justify-center">
        
        {/* Dynamic Speckled Paper Grain Overlay */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.5, 0.35, 0.6, 0.3] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror" }}
          className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:8px_8px]"
        />

        {/* Heavy Outer Airbrush Spray Mist Layer (Simulating Spray Paint Halo) */}
        <motion.span
          initial={{ opacity: 0, filter: "blur(28px)", scale: 1.08 }}
          animate={{ opacity: [0.6, 0.95, 0.8], filter: ["blur(28px)", "blur(16px)", "blur(14px)"], scale: 1.05 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute font-black text-black pointer-events-none select-none tracking-tighter"
        >
          {text}
        </motion.span>

        {/* Medium Airbrush Edge Diffusion Layer */}
        <motion.span
          initial={{ opacity: 0, filter: "blur(16px)" }}
          animate={{ opacity: 0.9, filter: "blur(8px)" }}
          transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute font-black text-[#111111] pointer-events-none select-none tracking-tighter"
        >
          {text}
        </motion.span>

        {/* Primary Stencil Core Text with Embedded White/Gray Spray Droplets & Noise */}
        <motion.span
          initial={{ opacity: 0, filter: "blur(10px) contrast(1.5)" }}
          animate={{ opacity: 1, filter: "blur(1.5px) contrast(1.2)" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 font-black text-[#050505] tracking-tighter uppercase drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]"
          style={{
            filter: "url(#spray-grain-noise) blur(1.5px) contrast(1.3)",
          }}
        >
          {text}
        </motion.span>

      </div>
    </div>
  )
}
