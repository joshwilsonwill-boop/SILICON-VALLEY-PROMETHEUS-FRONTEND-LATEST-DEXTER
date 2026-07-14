// DEPRECATED — replaced by REFUND_POLICY.md on 2026-07-14.
import type { Metadata } from 'next'
import { LegalPageSection, LegalPageShell } from '@/components/marketing/legal-page-shell'

export const metadata: Metadata = {
  title: 'Refund Policy v2 | Prometheus Studio',
  description: 'Paddle-aligned refund and cancellation policy for Prometheus Studio.',
}

export default function RefundPolicyPageV2() {
  return (
    <LegalPageShell
      title="Refund Policy"
      currentPath="/refund"
      description="Prometheus Studio uses Paddle as Merchant of Record for payments, tax compliance, buyer support, and refund transactions. This policy is designed to align with Paddle buyer terms and applicable consumer law."
    >
      <LegalPageSection title="1. Overview">
        <p>
          Prometheus Studio uses Paddle as our Merchant of Record for all payments. Paddle handles billing, tax
          compliance, invoices, and refund transactions on our behalf. This policy aligns with Paddle&apos;s Buyer Terms
          and Refund Policy.
        </p>
      </LegalPageSection>

      <LegalPageSection title="2. Subscription Plans and Trials">
        <p>
          We may offer monthly and annual subscription plans. If a plan includes a free trial, no payment is required
          until the trial ends. To avoid being charged after a trial, cancel before the trial period ends.
        </p>
      </LegalPageSection>

      <LegalPageSection title="3. Refund Eligibility Within 14 Days">
        <p>
          If you are not satisfied with Prometheus Studio, you can request a full refund within 14 days of your first
          paid subscription charge. This cooling-off period supports consumer withdrawal rights where applicable.
        </p>
        <ul className="list-inside list-disc space-y-2">
          <li>Monthly plans: full refund of the first month if requested within 14 days of the first paid charge.</li>
          <li>Annual plans: full refund of the first year if requested within 14 days of the first paid charge.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="4. Refund Requests After 14 Days">
        <p>After 14 days, refunds are considered case by case for:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Technical issues that prevent core functionality.</li>
          <li>Service outages exceeding 24 hours in a billing period.</li>
          <li>Billing errors or duplicate charges.</li>
        </ul>
        <p>Refunds are not normally provided for:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Change of mind after the 14-day period.</li>
          <li>Failure to use the service.</li>
          <li>Subjective dissatisfaction with AI output quality after the 14-day period.</li>
          <li>Account termination for a Terms of Service violation.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="5. How to Request a Refund">
        <ol className="list-inside list-decimal space-y-2">
          <li>Contact support@prometheusstudio.tech with your Paddle order ID.</li>
          <li>Describe the reason for the refund request.</li>
          <li>Our team will review within 2 business days.</li>
          <li>Approved refunds are processed by Paddle, typically within 5 to 10 business days.</li>
        </ol>
      </LegalPageSection>

      <LegalPageSection title="6. Cancellation">
        <p>You can cancel your subscription at any time:</p>
        <ol className="list-inside list-decimal space-y-2">
          <li>Go to Settings, Billing.</li>
          <li>Click Cancel Subscription or use the Paddle buyer portal link in your receipt email.</li>
          <li>Your access continues until the end of the current billing period.</li>
          <li>No partial refunds are provided for unused time after cancellation unless required by law.</li>
        </ol>
      </LegalPageSection>

      <LegalPageSection title="7. Paddle&apos;s Role">
        <p>As Merchant of Record, Paddle processes payments, handles tax compliance, manages refund transactions, and provides invoices and receipts.</p>
        <p>For Paddle-specific payment or refund questions, contact Paddle support at paddle.net.</p>
      </LegalPageSection>

      <LegalPageSection title="8. Contact">
        <p>Refund and cancellation support: support@prometheusstudio.tech.</p>
      </LegalPageSection>
    </LegalPageShell>
  )
}
