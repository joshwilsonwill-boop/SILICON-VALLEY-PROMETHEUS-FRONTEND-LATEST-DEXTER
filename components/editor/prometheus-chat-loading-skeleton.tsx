"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ThinkingOrb } from "thinking-orbs"

import { cn } from "@/lib/utils"

export function PrometheusChatLoadingSkeleton({
  label = "Prometheus is preparing a response",
  className,
}: {
  label?: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex w-full min-w-0 items-center gap-3", className)}
    >
      <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center">
        <ThinkingOrb
          data-thinking-orb="breathing"
          state="breathing"
          size={20}
          theme="dark"
          paused={reduceMotion ? true : undefined}
        />
      </span>
      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <SkeletonLine className="w-full max-w-48" reduceMotion={reduceMotion} />
        <SkeletonLine className="w-[82%] max-w-40" reduceMotion={reduceMotion} delay={0.12} />
        <SkeletonLine className="w-[58%] max-w-28" reduceMotion={reduceMotion} delay={0.24} />
      </div>
    </div>
  )
}

function SkeletonLine({
  className,
  reduceMotion,
  delay = 0,
}: {
  className: string
  reduceMotion: boolean | null
  delay?: number
}) {
  return (
    <motion.span
      data-skeleton-flow="true"
      className={cn(
        "relative block h-1.5 overflow-hidden rounded-full bg-white/10",
        className,
      )}
      animate={reduceMotion ? undefined : { opacity: [0.52, 0.9, 0.52], scaleX: [0.98, 1, 0.98] }}
      transition={{ duration: 1.55, delay, ease: "easeInOut", repeat: Infinity }}
    >
      <motion.span
        className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)]"
        initial={false}
        animate={reduceMotion ? { x: "55%" } : { x: ["-120%", "240%"] }}
        transition={{ duration: 1.35, delay, ease: [0.4, 0, 0.2, 1], repeat: Infinity }}
      />
    </motion.span>
  )
}

