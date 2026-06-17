'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/lib/utils'

export type InfinityLoaderMode = 'infinity' | 'status' | 'dock-hint'

interface InfinityLoaderProps {
  className?: string
  mode?: InfinityLoaderMode
  progressDurationMs?: number
  subtitle?: string
  title?: string
  visible?: boolean
  onExitComplete?: () => void
}

const INFINITY_PATH =
  'M10 30 C18 10 40 10 60 30 C80 50 102 50 110 30 C102 10 80 10 60 30 C40 50 18 50 10 30'

export function InfinityLoader({
  className,
  mode = 'infinity',
  progressDurationMs = 2400,
  subtitle = 'Preparing workspace',
  title = 'Loading',
  visible = true,
  onExitComplete,
}: InfinityLoaderProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {visible ? (
        <motion.div
          key="prometheus-infinity-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center',
            className,
          )}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="absolute inset-0 bg-[#0A0A0C]/90 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center justify-center">
            {mode === 'status' ? (
              <StatusLoader
                progressDurationMs={progressDurationMs}
                subtitle={subtitle}
                title={title}
              />
            ) : mode === 'dock-hint' ? (
              <DockHintLoader />
            ) : (
              <InfinityMark />
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function InfinityMark() {
  return (
    <div className="flex flex-col items-center">
      <svg
        width="120"
        height="60"
        viewBox="0 0 120 60"
        role="img"
        aria-label="Loading"
        className="overflow-visible"
      >
        <defs>
          <filter id="infinity-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="rgba(140, 180, 255, 0.8)" result="color">
              <animate
                attributeName="flood-color"
                values="rgba(100, 200, 220, 0.9);rgba(160, 100, 220, 0.9);rgba(100, 200, 220, 0.9)"
                dur="3s"
                repeatCount="indefinite"
              />
            </feFlood>
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={INFINITY_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          className="prometheus-infinity-loader__draw"
          d={INFINITY_PATH}
          fill="none"
          pathLength={1}
          stroke="rgba(255,255,255,0.62)"
          strokeLinecap="round"
          strokeWidth="2"
          strokeDasharray="1"
          strokeDashoffset={1}
        />
        <path
          className="prometheus-infinity-loader__head"
          d={INFINITY_PATH}
          fill="none"
          filter="url(#infinity-glow)"
          pathLength={1}
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray="0.16 0.84"
          strokeDashoffset={0}
        />
        {[0, 1, 2].map((index) => (
          <circle
            key={index}
            r="1"
            fill="rgba(230,240,255,0.9)"
            filter="url(#infinity-glow)"
          >
            <animateMotion
              dur="2.4s"
              begin={`${index * 0.18}s`}
              repeatCount="indefinite"
              path={INFINITY_PATH}
            />
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="0.6s"
              begin={`${index * 0.18}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
      <motion.p
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-[11px] uppercase tracking-[0.2em] text-[#444] mt-6"
      >
        Loading...
      </motion.p>
      <style>{`
        @keyframes prometheus-infinity-draw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes prometheus-infinity-loop {
          to { stroke-dashoffset: -1; }
        }

        .prometheus-infinity-loader__draw {
          animation: prometheus-infinity-draw 0.8s ease-out both;
        }

        .prometheus-infinity-loader__head {
          animation:
            prometheus-infinity-draw 0.8s ease-out both,
            prometheus-infinity-loop 2.4s linear 0.8s infinite;
        }
      `}</style>
    </div>
  )
}

function StatusLoader({
  progressDurationMs,
  subtitle,
  title,
}: {
  progressDurationMs: number
  subtitle: string
  title: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center"
    >
      <div className="text-[14px] font-medium text-[#CCC]">{title}</div>
      <div className="mt-2 text-[12px] text-[#555]">{subtitle}</div>
      <div className="mt-6 h-px w-[200px] overflow-hidden bg-[rgba(255,255,255,0.1)]">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: Math.max(0.8, progressDurationMs / 1000),
            ease: 'linear',
            repeat: Number.POSITIVE_INFINITY,
          }}
          className="h-px w-full bg-[rgba(200,200,200,0.6)]"
        />
      </div>
    </motion.div>
  )
}

function DockHintLoader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6"
    >
      <motion.div
        animate={{ scale: [1, 1.035, 1], opacity: [0.72, 1, 0.72] }}
        transition={{ duration: 1.6, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
        className="flex items-center gap-1 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] px-4 py-2 [backdrop-filter:blur(20px)] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className="block size-8 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)]"
            style={{ opacity: 0.42 + index * 0.1 }}
          />
        ))}
      </motion.div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#444]">
        Select an option
      </p>
    </motion.div>
  )
}
