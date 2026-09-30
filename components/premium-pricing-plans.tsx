'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

import {
  BILLING_PLAN_DEFINITIONS,
  BILLING_PLAN_ORDER,
  type BillingPlanDefinition,
} from '@/lib/billing-plans'
import { cn } from '@/lib/utils'

const PLANS = BILLING_PLAN_ORDER.map((planId) => BILLING_PLAN_DEFINITIONS[planId])

type PricingCtaContext = {
  buttonClassName: string
  ctaAriaLabel: string
  ctaLabel: string
}

type PremiumPricingPlansProps = {
  className?: string
  compact?: boolean
  ctaHref?: string
  renderCta?: (plan: BillingPlanDefinition, context: PricingCtaContext) => ReactNode
}

export function getPremiumPricingButtonClassName(plan: BillingPlanDefinition) {
  const isFeatured = plan.featured
  const isCinema = plan.id === 'cinema'

  return cn(
    '[--button-glow:99_102_241] inline-flex h-12 min-h-11 w-full items-center justify-center rounded-[16px] border px-5 text-[15px] font-semibold text-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708]',
    isFeatured
      ? 'border-[#6366f1]/80 bg-[#6366f1] shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)] hover:border-[#818cf8] hover:bg-[#5558e8] hover:shadow-[0_20px_64px_-22px_rgba(99,102,241,1)]'
      : cn(
          'border-white/12 bg-white/[0.025] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/22 hover:bg-white hover:text-[#070708] hover:shadow-[0_18px_44px_-28px_rgba(255,255,255,0.55)]',
          isCinema &&
            'border-[#6366f1]/24 bg-[#6366f1]/[0.035] hover:border-[#6366f1]/60 hover:bg-[#6366f1] hover:text-white hover:shadow-[0_18px_52px_-26px_rgba(99,102,241,0.85)]',
        ),
  )
}

export function PremiumPricingPlans({
  className,
  compact = false,
  ctaHref = '/signup',
  renderCta,
}: PremiumPricingPlansProps) {
  return (
    <section
      aria-label="Prometheus pricing plans"
      className={cn('relative isolate overflow-hidden px-1 pb-2 pt-8', className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[8.5rem] z-0 w-[140vw] -translate-x-1/2 scale-x-105 select-none text-center text-[4.2rem] font-black leading-none text-white/[0.04] blur-[2px] sm:text-[7.5rem] md:top-[10rem] md:text-[10rem] lg:text-[12rem] xl:text-[15rem]"
      >
        PROMETHEUS
      </div>

      <div className="relative z-10 grid grid-cols-1 justify-items-center gap-5 md:grid-cols-2 md:items-stretch md:justify-items-stretch lg:grid-cols-3 lg:gap-6 xl:gap-8">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            compact={compact}
            ctaHref={ctaHref}
            plan={plan}
            renderCta={renderCta}
          />
        ))}
      </div>
    </section>
  )
}

function PricingCard({
  compact,
  ctaHref,
  plan,
  renderCta,
}: {
  compact: boolean
  ctaHref: string
  plan: BillingPlanDefinition
  renderCta?: (plan: BillingPlanDefinition, context: PricingCtaContext) => ReactNode
}) {
  const isFeatured = plan.featured
  const headingId = `pricing-plan-${plan.id}`
  const buttonClassName = getPremiumPricingButtonClassName(plan)
  const ctaLabel = plan.ctaLabel
  const ctaAriaLabel = `${ctaLabel} with the ${plan.name} plan`
  const priceMajor = plan.priceWhole.replace('$', '')

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'group relative flex h-full w-[min(100%,26rem)] flex-col overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#111116]/[0.82] p-6 text-white shadow-[0_34px_90px_-58px_rgba(0,0,0,0.95)] transition-[border-color,box-shadow,transform,background-color] duration-300 supports-[backdrop-filter]:bg-white/[0.03] supports-[backdrop-filter]:backdrop-blur-[24px] md:w-full',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_38%,rgba(99,102,241,0.045)_100%)] before:opacity-90 before:content-[\'\']',
        'after:pointer-events-none after:absolute after:inset-px after:rounded-[25px] after:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.035)] after:content-[\'\']',
        isFeatured
          ? 'border-[#6366f1]/34 shadow-[0_42px_110px_-58px_rgba(99,102,241,0.68),0_34px_90px_-58px_rgba(0,0,0,0.95)] lg:-translate-y-3 lg:scale-[1.015] lg:hover:-translate-y-4'
          : 'hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.045] hover:shadow-[0_40px_100px_-58px_rgba(0,0,0,0.95)]',
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-6 top-0 h-px bg-white/18',
          isFeatured && 'bg-[#a5b4fc]/70',
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent)]',
          isFeatured && 'bg-[linear-gradient(180deg,rgba(99,102,241,0.16),transparent)]',
        )}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex min-h-8 items-start justify-between gap-4">
          {isFeatured ? (
            <span className="inline-flex rounded-full border border-[#6366f1]/36 bg-[#6366f1]/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c7d2fe] shadow-[0_0_30px_rgba(99,102,241,0.24)]">
              RECOMMENDED
            </span>
          ) : (
            <span className="h-6" aria-hidden="true" />
          )}
          <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/42">
            {plan.creditsLabel.replace('AI generation credits / month', 'credits')}
          </span>
        </div>

        <div className="mt-7 space-y-3">
          <h3 id={headingId} className="text-2xl font-semibold text-white">
            {plan.name}
          </h3>
          <p className="min-h-14 text-[15px] leading-7 text-white/58">{plan.subtitle}</p>
        </div>

        <div className="mt-8 flex items-end gap-1.5">
          <span className="pb-2 text-2xl font-semibold text-white/42">$</span>
          <span className="text-5xl font-bold leading-none text-white sm:text-6xl lg:text-5xl xl:text-6xl">
            {priceMajor}
          </span>
          <span className="pb-2 pl-1 text-sm font-medium text-white/42">{plan.monthlyLabel}</span>
        </div>

        <div className="mt-8 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />

        <ul className={cn('mt-8 flex-1 space-y-3.5', compact && 'space-y-3')}>
          {plan.features.map((feature) => (
            <li key={feature.label} className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-[#818cf8] [stroke-width:1.8]" aria-hidden="true" />
              <span
                className={cn(
                  'text-sm leading-6 text-white/62',
                  feature.emphasized && 'font-semibold text-white/88',
                )}
              >
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {renderCta ? (
            renderCta(plan, { buttonClassName, ctaAriaLabel, ctaLabel })
          ) : (
            <Link href={ctaHref} aria-label={ctaAriaLabel} className={buttonClassName}>
              <span className="flex h-full items-center justify-center">{ctaLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
