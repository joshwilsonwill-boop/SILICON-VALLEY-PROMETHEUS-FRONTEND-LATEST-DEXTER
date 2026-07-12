'use client'

import { motion } from 'framer-motion'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import type { FinalResultsData, MotionNode } from '../../types/motion-editor'

export function FinalResultsNode({ node }: { node: MotionNode }) {
  const data = node.data as FinalResultsData

  return (
    <div className="relative h-[230px]">
      {data.loading ? (
        <div className="absolute inset-2 grid place-items-center rounded-xl border border-white/10 bg-white/[0.035]">
          <InlineLoadingAnimation size={40} label="Generating final results" />
        </div>
      ) : null}
      {(data.images.length ? data.images : ['a', 'b', 'c']).slice(0, 3).map((image, index) => (
        <motion.div
          aria-label={image}
          className="absolute left-1/2 top-2 h-[214px] w-[162px] -translate-x-1/2 overflow-hidden rounded-lg border border-white/10 shadow-[0_18px_34px_rgba(0,0,0,0.48)]"
          initial={{ opacity: 0, rotate: 0, scale: 0.92, x: '-50%', y: 18 }}
          animate={{
            opacity: data.loading ? 0.25 : 1,
            rotate: [-5, 4, 0][index],
            scale: 1,
            x: `calc(-50% + ${[-20, 20, 0][index]}px)`,
            y: [12, 8, 0][index],
            zIndex: [1, 2, 3][index],
          }}
          transition={{ delay: 5.55 + index * 0.1, duration: 0.5, ease: 'easeOut' }}
          key={image}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_22%,rgba(250,230,170,0.95),transparent_20%),radial-gradient(circle_at_50%_40%,rgba(214,176,112,0.8),transparent_22%),linear-gradient(160deg,#315d38_0%,#8faa63_34%,#e5bf72_62%,#1a2d1c_100%)]" />
          <div className="absolute left-1/2 top-[22%] h-20 w-16 -translate-x-1/2 rounded-t-full bg-[#d9c99d]/70 blur-[1px]" />
          <div className="absolute left-[27%] top-[35%] size-8 rounded-full bg-[#f4d56f]/80 shadow-[26px_4px_0_rgba(77,143,77,0.85),48px_-9px_0_rgba(228,177,82,0.75),18px_37px_0_rgba(56,120,68,0.8)]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
        </motion.div>
      ))}
    </div>
  )
}
