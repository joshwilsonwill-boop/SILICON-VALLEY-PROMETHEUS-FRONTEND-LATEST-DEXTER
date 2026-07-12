'use client'

import * as React from 'react'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'

export type PlanStatus = 'pending' | 'running' | 'completed' | 'error'

export interface PlanItem {
  id: string
  title: string
  status: PlanStatus
  progress?: number
  meta?: string
}

export interface PlanProps {
  items: PlanItem[]
  className?: string
}

export function Plan({ items, className }: PlanProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => {
        const icon =
          item.status === 'completed' ? (
            <CheckCircle2 className="size-4 text-emerald-300" />
          ) : item.status === 'error' ? (
            <XCircle className="size-4 text-red-300" />
          ) : item.status === 'running' ? (
            <InlineLoadingAnimation size={16} label={`Running ${item.title}`} />
          ) : (
            <Circle className="size-4 text-white/25" />
          )

        const progress = Math.max(0, Math.min(1, item.progress ?? (item.status === 'completed' ? 1 : 0)))

        return (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {icon}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white/90">
                    {item.title}
                  </div>
                  {item.meta ? (
                    <div className="truncate text-xs text-white/45">{item.meta}</div>
                  ) : null}
                </div>
              </div>
              <div className="text-xs tabular-nums text-white/40">
                {item.status === 'completed'
                  ? '100%'
                  : item.status === 'running'
                    ? `${Math.round(progress * 100)}%`
                    : ''}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
