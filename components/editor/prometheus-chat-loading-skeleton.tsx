"use client"

import { motion, useReducedMotion } from "framer-motion"

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
      <motion.span
        aria-hidden="true"
        className="relative grid size-7 shrink-0 place-items-center"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 2.8, ease: "linear", repeat: Infinity }}
      >
        <span className="absolute inset-0 rounded-full border border-white/42 border-l-white/12" />
        <span className="size-1.5 rounded-full bg-white/60" />
      </motion.span>
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
      className={cn(
        "block h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,255,255,0.58),rgba(255,255,255,0.12))]",
        className,
      )}
      style={{ backgroundSize: "220% 100%" }}
      animate={reduceMotion ? undefined : { backgroundPositionX: ["0%", "220%"] }}
      transition={{ duration: 1.35, delay, ease: "linear", repeat: Infinity }}
    />
  )
}
