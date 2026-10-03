import type { Metadata } from 'next'

import { PricingSection } from '@/components/PricingSection'

export const metadata: Metadata = {
  alternates: { canonical: '/pricing' },
  title: 'Pricing | Prometheus Studio',
  description: 'Prometheus Studio pricing for a professional video editing and production workspace for filmmakers.',
}

export default function PricingPage() {
  return (
      <main className="relative isolate min-h-screen overflow-x-hidden bg-[#050505] px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#050505_0%,#0b0b0d_42%,#0f0f11_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.12),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px] opacity-80"
        />

        <div className="relative mx-auto max-w-[88rem]">
          <header className="mx-auto mb-12 max-w-4xl text-center sm:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/42">
              PRICING
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Premium video infrastructure, packaged for teams that ship.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/58 sm:text-lg">
              Choose a Prometheus Studio plan for a professional video editing and production workspace for filmmakers, motion designers, cloud-backed project storage, and export-ready rendering workflows.
            </p>
          </header>

          <PricingSection />
        </div>
      </main>

  )
}
