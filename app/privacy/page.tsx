import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalLayout, LegalSection, LegalSubsection } from '@/components/legal/LegalLayout'

const LAST_UPDATED = '14 July 2026'

export const metadata: Metadata = {
  title: 'Privacy Policy | Prometheus Studio',
  description: 'Privacy Policy for Prometheus Studio.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How Prometheus Studio collects, uses, stores, and protects personal data for our AI video editing platform."
      currentPath="/privacy"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="1. Introduction and Who We Are">
        <p>
          Prometheus Studio (we, us, or our) respects your privacy. This policy explains how
          Prometheus Studio collects, uses, stores, shares, and protects personal data when you use
          prometheusstudio.tech, our applications, and related services.
        </p>
        <p>
          We seek to comply with applicable privacy laws, including GDPR, UK GDPR, and the
          CCPA/CPRA where they apply. Contact us about privacy at support@prometheusstudio.tech.
          Our registered address is Lagos, Nigeria. Our Data Protection Officer is [TBD] and will
          be appointed when the GDPR threshold is met or the first EU user is onboarded.
        </p>
        <p>
          Dodo Payments is our Merchant of Record and an independent controller for its payment,
          tax, invoicing, fraud, refund, and chargeback operations. Dodo Payments is not our
          processor for those activities. Its privacy policy is available at
          dodopayments.com/legal/privacy-policy.
        </p>
      </LegalSection>

      <LegalSection title="2. Data We Collect">
        <LegalSubsection title="Account, profile, and communications data">
          <p>
            We collect your name, email address, hashed or encrypted authentication credentials,
            profile information, account preferences, notification settings, workspace details,
            connected-account information, support tickets, emails, chat messages, feedback, and
            survey responses.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Payment and subscription data">
          <p>
            Dodo Payments handles full payment-card numbers, CVV/CVC codes, and bank-account
            details. We do not store those credentials. We may receive limited transaction and
            subscription information, such as transaction identifiers, plan, payment status,
            billing history, invoice or receipt links, currency, and amount, to provide access,
            support billing, prevent fraud, and meet legal obligations.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Usage, device, and Content data">
          <p>
            We collect IP address, browser and device information, operating system, session and
            feature usage, error logs, performance data, and security diagnostics. We also process
            the videos, images, audio, text, prompts, captions, transcripts, project files,
            timelines, edits, exports, and AI-generated outputs you upload or create.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="3. How We Use Data">
        <ul className="list-inside list-disc space-y-2">
          <li>Provide, authenticate, secure, and administer accounts and the Service.</li>
          <li>Store, edit, render, export, and provide AI features you request.</li>
          <li>Manage subscriptions and provide billing support using Dodo transaction-status data.</li>
          <li>Send service, account, security, billing, and support communications.</li>
          <li>Detect, investigate, and prevent fraud, abuse, security incidents, and Terms violations.</li>
          <li>Improve reliability, workflows, accessibility, and AI features using de-identified or aggregated data where possible.</li>
          <li>Comply with accounting, tax, legal, and regulatory obligations.</li>
        </ul>
        <p>
          Where GDPR applies, we generally rely on contract necessity, legitimate interests, legal
          obligation, and consent where required. We do not make solely automated decisions that
          have legal or similarly significant effects without required notice and safeguards.
        </p>
      </LegalSection>

      <LegalSection title="4. AI and ML Processing">
        <p>
          Prometheus Studio uses AI and machine-learning systems to generate or modify video
          content, assist editing workflows, create captions or effects, and support rendering.
          When you use these features, your Content may be processed by our AI and cloud providers.
        </p>
        <p>
          AI outputs can be inaccurate, incomplete, biased, unsafe, non-unique, or unsuitable for
          your purpose. You are responsible for reviewing outputs before use or publication. We may
          use de-identified and aggregated data to improve the Service and AI systems, but we do
          not use private Content to train models available to other users without explicit consent.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Sharing and Providers">
        <p>We share personal data only as needed to operate the Service, including with:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>
            Dodo Payments, for transaction context, account email, and billing information needed
            to start and support checkout. Dodo independently handles MoR payment operations.
          </li>
          <li>
            Cloud, hosting, storage, delivery, authentication, and database providers such as AWS,
            Cloudflare, and Supabase, which process data under contractual safeguards where applicable.
          </li>
          <li>
            AI, analytics, monitoring, communications, and support providers that receive only the
            data needed to provide their service.
          </li>
          <li>
            Connected storage or publishing platforms when you direct us to send your Content and metadata.
          </li>
          <li>
            Authorities, advisors, or transaction counterparties where needed for law, security,
            enforcement, or a corporate transaction.
          </li>
        </ul>
        <p>
          We do not sell personal information for money. We do not share personal information for
          cross-context behavioral advertising without the notices and choices required by law.
        </p>
      </LegalSection>

      <LegalSection title="6. International Transfers and Security">
        <p>
          We operate globally and may process data outside your country. For transfers from the
          EEA, UK, or Switzerland, we use appropriate safeguards such as Standard Contractual
          Clauses and supplementary measures where required. Dodo Payments manages its own
          international transfers under its own privacy framework.
        </p>
        <p>
          We use reasonable technical and organizational safeguards, including encryption in
          transit, protections at rest where appropriate, access controls, authentication,
          least-privilege practices, logging, backups, and incident-response processes. No internet
          transmission is completely secure; keep account credentials confidential.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention">
        <p>
          We retain data only as needed for the purposes in this policy. Account data is generally
          retained while an account is active and for the applicable limitation period plus up to 2
          months. Content is retained while an account is active and scheduled for deletion within
          30 days after account deletion, subject to legal retention, fraud prevention, disputes,
          and backups.
        </p>
        <p>
          Payment-status and accounting data may be retained for the period required by tax and
          accounting law, commonly 6 to 7 years. De-identified or aggregated data may be retained
          longer. Backups are deleted on a separate rolling schedule.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <p>
          Depending on your location, you may have rights to access, correct, delete, restrict,
          port, or object to processing; withdraw consent; and complain to a data-protection
          authority. California residents may have rights to know, correct, delete, and receive
          non-discriminatory treatment for exercising privacy rights. We do not sell personal information.
        </p>
        <p>
          To exercise a right, email support@prometheusstudio.tech with the subject Privacy Request,
          your location, and the request. We may verify identity before acting. Payment data requests
          controlled by Dodo Payments can also be sent to privacy@dodopayments.com.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies, Children, and Changes">
        <p>
          We use essential cookies and similar technologies for authentication, session management,
          security, and fraud prevention. Analytics and optional preference technologies are off
          unless you consent through our cookie banner or preference controls. See our{' '}
          <Link href="/cookie-policy" className="text-white underline underline-offset-4 hover:text-white/70">
            Cookie Policy
          </Link>{' '}
          for the current technology inventory, consent choices, and browser controls. Blocking
          essential technologies may prevent core features from working.
        </p>
        <p>
          The Service is not intended for children under 13, or under 16 where local law requires a
          higher age. Contact us if you believe a child has provided data unlawfully. We may update
          this policy and will provide notice of material changes where required by law.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Privacy and security inquiries: support@prometheusstudio.tech</p>
        <p>Primary data-protection authority: UK Information Commissioner&apos;s Office (ICO) - https://ico.org.uk</p>
        <p>Secondary data-protection authority for Nigerian residents: Nigerian Data Protection Bureau (NDPB)</p>
        <p>Dodo Payments privacy: privacy@dodopayments.com</p>
      </LegalSection>
    </LegalLayout>
  )
}
