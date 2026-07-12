'use client'

import React from 'react'
import { SocialPlatform } from '@/lib/social/types'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  CircleDashed, 
  AlertCircle,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Music2,
  Facebook
} from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'

export interface PostStatus {
  platform: SocialPlatform
  status: 'queued' | 'uploading' | 'processing' | 'posted' | 'failed'
  progress: number
  error?: string
}

interface PostStatusTrackerProps {
  statuses: PostStatus[]
}

const PLATFORM_ICONS: Record<SocialPlatform, any> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
  x: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
}

export function PostStatusTracker({ statuses }: PostStatusTrackerProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {statuses.map((item, index) => {
          const Icon = PLATFORM_ICONS[item.platform]
          const isDone = item.status === 'posted'
          const isFailed = item.status === 'failed'
          const isWorking = item.status === 'uploading' || item.status === 'processing'

          return (
            <motion.div
              key={item.platform}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-2xl bg-white/5 border border-white/5 overflow-hidden group"
            >
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isDone ? "bg-lime-400/20 text-lime-400" : 
                    isFailed ? "bg-red-400/20 text-red-400" : 
                    "bg-white/5 text-zinc-400"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold capitalize text-white">
                      {item.platform}
                    </h5>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                      {item.status}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-lime-400" />
                    ) : isFailed ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : isWorking ? (
                      <InlineLoadingAnimation size={16} label={`${item.status} ${item.platform} post`} />
                    ) : (
                      <CircleDashed className="w-4 h-4 text-zinc-600" />
                    )}
                    <span className={cn(
                      "text-sm font-mono font-medium",
                      isDone ? "text-lime-400" : isFailed ? "text-red-400" : "text-zinc-400"
                    )}>
                      {item.progress}%
                    </span>
                  </div>
                </div>
              </div>

              {isFailed && item.error && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 text-[10px] text-red-400/80 bg-red-400/5 p-2 rounded-lg border border-red-400/10"
                >
                  Error: {item.error}
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
