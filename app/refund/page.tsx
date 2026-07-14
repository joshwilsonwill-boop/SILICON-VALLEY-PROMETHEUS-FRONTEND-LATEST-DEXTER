import type { Metadata } from 'next'

import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout'

const LAST_UPDATED = '14 July 2026'

export const metadata: Metadata = {
  title: 'Refund Policy | Prometheus Studio',
  description: 'Refund Policy for Prometheus Studio purchases processed by Dodo Payments.',
}

export default function RefundPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      description="How refund requests, cancellations, and payment disputes are handled for Prometheus Studio."
      currentPath="/refund"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="1. Overview">
        <p>
          Prometheus Studio provides immediately accessible digital services, including cloud-based
          video editing, AI processing, storage, rendering, and export. Dodo Payments is the
          Merchant of Record and authorized reseller for paid transactions. Dodo Payments handles
          payment processing, applicable taxes, receipts or invoices, chargebacks, and approved
          payment refunds.
        </p>
        <p>
          Requests are subject to this policy, Dodo Payments&apos; Buyer Terms, payment-network rules,
          fraud controls, and applicable consumer-protection law. This policy explains our
          support-review process and does not limit non-waivable consumer rights.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          We generally consider a request submitted within 7 days of the transaction date for a
          verified technical failure that prevented meaningful access and could not be resolved, a
          duplicate charge or billing error, a verified unauthorized charge, a failure to deliver
          the Service substantially as described, or where a refund is required by law.
        </p>
        <p>
          The 7-day window is Prometheus Studio&apos;s support-review period, not a Dodo Payments
          deadline. We review the account, transaction, delivery records, usage, billing history,
          and applicable legal rights in each case.
        </p>
      </LegalSection>

      <LegalSection title="3. Requests Normally Not Eligible">
        <ul className="list-inside list-disc space-y-2">
          <li>Change of mind after Service access, digital delivery, or transmission has begun.</li>
          <li>Dissatisfaction with an AI output&apos;s quality, accuracy, uniqueness, or suitability.</li>
          <li>Failure to use the Service during a paid period or unused time after cancellation.</li>
          <li>An account restricted for a Terms or Acceptable Use Policy violation.</li>
          <li>Fraud, refund abuse, chargeback misuse, manipulation, or material misrepresentation.</li>
          <li>
            Significant paid usage, including extensive AI generation, rendering, export, or
            storage. Usage over 50% of the applicable plan&apos;s measured limits generally weighs
            against a refund, subject to the facts and mandatory consumer rights.
          </li>
        </ul>
        <p>
          Promotional purchases are reviewed using the amount actually paid. This section does not
          override a refund required by law.
        </p>
      </LegalSection>

      <LegalSection title="4. Digital Delivery and Refund Process">
        <p>
          By purchasing, you request immediate provision of digital services. Where local law
          permits, you acknowledge that a withdrawal right may be lost after digital delivery or
          transmission begins. This does not waive rights that cannot be waived under applicable law.
        </p>
        <ol className="list-inside list-decimal space-y-2">
          <li>
            Email support@prometheusstudio.tech or use the Dodo Payments buyer-support flow linked
            in your receipt.
          </li>
          <li>
            Include your account email, invoice or order number, transaction date, and reason. Do
            not send card numbers or sensitive payment credentials to Prometheus Studio.
          </li>
          <li>
            We aim to communicate a support decision within 5 to 7 business days; complex
            technical, fraud, or payment investigations may take longer.
          </li>
          <li>
            If approved, Dodo Payments returns funds to the original payment method. Banks and card
            providers commonly take 5 to 10 business days to show the refund.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="5. Cancellation, Annual Plans, and Taxes">
        <p>
          Cancellation stops a future subscription renewal. Unless law requires otherwise or we
          confirm it in writing, paid access continues through the current paid period and no
          partial refund is issued for unused time. Cancel in account settings or contact
          support@prometheusstudio.tech; where possible, request cancellation at least 48 hours
          before renewal.
        </p>
        <p>
          For annual plans, a pro-rated refund may be considered case by case when requested within
          30 days and usage supports it, but is not guaranteed. Any eligible VAT, GST, or sales-tax
          adjustment is handled by Dodo Payments under its Buyer Terms.
        </p>
      </LegalSection>

      <LegalSection title="6. Chargebacks and Disputes">
        <p>
          Contact Prometheus Studio and Dodo Payments before opening a chargeback or bank dispute
          so we can investigate and attempt to resolve the issue. This request does not limit your
          lawful right to dispute a charge. Chargeback abuse or fraud may result in account
          termination or a prohibition on future use.
        </p>
        <p>
          Under Dodo Payments&apos; Buyer Terms, Dodo Payments may, in its sole discretion, apply
          remedies to a meritless chargeback, including USD 100 in liquidated damages. Prometheus
          Studio does not impose that Dodo Payments remedy. If you disagree with our support
          decision, reply with additional information and we aim to complete a further review
          within 10 business days.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>Refund and cancellation support: support@prometheusstudio.tech</p>
        <p>Dodo Payments buyer support: support@dodopayments.com</p>
      </LegalSection>
    </LegalLayout>
  )
}
