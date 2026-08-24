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
      <span aria-hidden="true" className="relative grid size-8 shrink-0 place-items-center">
        <motion.span
          data-thinking-morph="circle-to-spark"
          className="block size-6 bg-white shadow-[0_0_16px_rgba(255,255,255,0.28)]"
          initial={false}
          animate={reduceMotion ? { clipPath: SPARK_POLYGON } : {
            clipPath: [ROUND_POLYGON, SOFT_SPARK_POLYGON, SPARK_POLYGON, SOFT_SPARK_POLYGON, ROUND_POLYGON],
            rotate: [0, 0, 45, 90, 90],
            scale: [0.52, 0.82, 1, 0.78, 0.52],
          }}
          transition={{ duration: 2.6, ease: [0.65, 0, 0.35, 1], repeat: Infinity }}
        />
        <motion.span
          className="absolute inset-0 rounded-full border border-white/16"
          animate={reduceMotion ? undefined : { opacity: [0.15, 0.48, 0.15], scale: [0.72, 1.08, 0.72] }}
          transition={{ duration: 2.6, ease: "easeInOut", repeat: Infinity }}
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

const ROUND_POLYGON = "polygon(50% 0%, 75% 7%, 93% 25%, 100% 50%, 93% 75%, 75% 93%, 50% 100%, 25% 93%, 7% 75%, 0% 50%, 7% 25%, 25% 7%)"
const SOFT_SPARK_POLYGON = "polygon(50% 0%, 58% 29%, 71% 40%, 100% 50%, 71% 60%, 58% 71%, 50% 100%, 42% 71%, 29% 60%, 0% 50%, 29% 40%, 42% 29%)"
const SPARK_POLYGON = "polygon(50% 0%, 56% 31%, 68% 43%, 100% 50%, 68% 57%, 56% 69%, 50% 100%, 44% 69%, 32% 57%, 0% 50%, 32% 43%, 44% 31%)"
