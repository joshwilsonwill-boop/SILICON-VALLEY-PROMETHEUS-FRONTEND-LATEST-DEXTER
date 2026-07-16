'use client'

import { ArrowUpRight } from 'lucide-react'

export function AnalyticsPanel() {
  return (
    <section className="space-y-3" aria-label="Analytics">
      <p className="rounded-xl border border-prometheus-border-subtle bg-white/[0.025] px-4 py-5 text-sm leading-6 text-prometheus-text-secondary">
        No analytics available yet. Post your video to see performance metrics.
      </p>
      <button type="button" className="premium-liquid-pill flex w-full items-center justify-between rounded-xl border border-[#7ff2d4]/16 bg-[#7ff2d4]/[0.055] px-3 py-3 text-sm font-medium text-white/82">
        Go to Export
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </button>
    </section>
  )
}
