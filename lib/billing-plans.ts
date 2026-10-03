import type { BillingPlanId } from '@/lib/billing'

export type BillingPlanDefinition = {
  id: BillingPlanId
  name: string
  subtitle: string
  priceWhole: string
  priceFraction: string
  monthlyLabel: string
  creditsLabel: string
  accent: string
  ctaLabel: string
  featured?: boolean
  contactOnly?: boolean
  features: Array<{
    label: string
    emphasized?: boolean
    hint?: string
  }>
}

export const BILLING_PLAN_ORDER: BillingPlanId[] = ['creator', 'studio', 'cinema']

export const BILLING_PLAN_DEFINITIONS: Record<BillingPlanId, BillingPlanDefinition> = {
  creator: {
    id: 'creator',
    name: 'Creator',
    subtitle: 'For independent creators and solo operators producing content at scale.',
    priceWhole: '$997',
    priceFraction: '.99',
    monthlyLabel: '/ mo',
    creditsLabel: '150 AI generation credits / month',
    accent: 'from-[#6366f1] via-[#6366f1] to-[#6366f1]',
    ctaLabel: 'Get Started',
    features: [
      { label: 'AI-powered premium video editing & compositing engine' },
      { label: 'Cinematic motion graphics automation' },
      { label: 'Intelligent short-form repurposing (1 video → 10 clips)' },
      { label: 'AI voiceover & synthetic narration (50+ voices)' },
      { label: 'Automated color grading & LUT matching' },
      { label: 'Unlimited draft previews' },
      { label: 'Export in up to 4K UHD' },
      { label: 'Standard rendering queue' },
      { label: '150 AI generation credits / month' },
      { label: '500GB cloud-backed project storage' },
      { label: 'Single user license' },
      { label: 'Basic template library (100+ presets)' },
      { label: 'Standard email support (48h response)' },
    ],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    subtitle: 'For professional creators, editors, and small production teams.',
    priceWhole: '$2,500',
    priceFraction: '.99',
    monthlyLabel: '/ mo',
    creditsLabel: '600 AI generation credits / month',
    accent: 'from-[#6366f1] via-[#6366f1] to-[#6366f1]',
    ctaLabel: 'Get Started',
    featured: true,
    features: [
      { label: 'Everything in Creator, plus:', emphasized: true },
      { label: 'Advanced motion graphics engine (3D camera, particles, depth)' },
      { label: 'Custom visual style presets (brand-lockable)' },
      { label: 'AI b-roll insertion & stock footage auto-sourcing' },
      { label: 'Multi-language auto-dubbing & subtitle burn-in (20 languages)' },
      { label: '4K & 8K export capability' },
      { label: 'ProRes & DNxHD export codecs' },
      { label: 'Faster rendering queue (2× priority)' },
      { label: '600 AI generation credits / month' },
      { label: '2TB cloud-backed project storage' },
      { label: 'Team workspace with multi-brand folders' },
      { label: 'Team access: up to 5 users' },
      { label: 'Commercial usage rights included' },
      { label: 'Priority support (24h response, Slack-connect)' },
      { label: 'Monthly 30-min strategy call' },
    ],
  },
  cinema: {
    id: 'cinema',
    name: 'Cinema',
    subtitle: 'For agencies, studios, and high-volume production pipelines.',
    priceWhole: '$5,000',
    priceFraction: '.99',
    monthlyLabel: '/ mo',
    creditsLabel: '2,000 AI generation credits / month',
    accent: 'from-[#6366f1] via-[#6366f1] to-[#6366f1]',
    ctaLabel: 'Get Started',
    features: [
      { label: 'Everything in Studio, plus:', emphasized: true },
      { label: 'High-end video ad campaign generation (A/B variants)' },
      { label: 'Apple-style cinematic commercial production mode' },
      { label: 'Batch processing engine (50+ videos overnight)' },
      { label: 'API access (integrate into your CMS or client portal)' },
      { label: 'Dedicated workflow automation tools (Zapier, Make, webhooks)' },
      { label: 'Highest priority rendering (dedicated compute, zero queue)' },
      { label: '2,000 AI generation credits / month' },
      { label: 'RAW/LOG export profiles for colorist handoff' },
      { label: 'White-label export (remove Prometheus branding)' },
      { label: '5TB cloud-backed project storage' },
      { label: 'Team scaling: up to 20 users with role-based permissions' },
      { label: 'Client review rooms (password-protected share links)' },
      { label: 'Shared asset library (fonts, logos, brand kits)' },
      { label: 'White-glove onboarding & private implementation support' },
      { label: 'Dedicated account manager' },
    ],
  },
}

export function isBillingPlanId(value: unknown): value is BillingPlanId {
  return value === 'creator' || value === 'studio' || value === 'cinema'
}

export function getBillingPlanDefinition(planId: BillingPlanId) {
  return BILLING_PLAN_DEFINITIONS[planId]
}

export function getBillingPlanPriceDisplay(planId: BillingPlanId) {
  const plan = getBillingPlanDefinition(planId)
  return `${plan.priceWhole}${plan.priceFraction} USD`
}
