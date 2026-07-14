// DEPRECATED — replaced by TERMS_OF_SERVICE.md on 2026-07-14.
import type { Metadata } from 'next'
import { LegalPageSection, LegalPageShell, LegalPageSubsection } from '@/components/marketing/legal-page-shell'

export const metadata: Metadata = {
  title: 'Terms of Service v2 | Prometheus Studio',
  description: 'Unified terms of service for Prometheus Studio.',
}

export default function TermsPageV2() {
  return (
    <LegalPageShell
      title="Terms of Service"
      currentPath="/terms"
      description="These Terms govern your use of Prometheus Studio, an AI-assisted video editing, cloud storage, and user-initiated social publishing platform operated by Prometheus AI."
    >
      <LegalPageSection title="1. Acceptance of Terms">
        <p>
          By accessing prometheusstudio.tech, creating an account, starting checkout, or using Prometheus Studio, you
          agree to these Terms. If you do not agree, do not use the service.
        </p>
      </LegalPageSection>

      <LegalPageSection title="2. Description of Service">
        <p>
          Prometheus Studio provides AI-assisted video editing, transcription, captions, project storage, rendering,
          export tools, and optional social publishing integrations. AI features assist creative work and require human
          review before publishing.
        </p>
      </LegalPageSection>

      <LegalPageSection title="3. User Accounts">
        <p>
          You are responsible for maintaining accurate account information, protecting login credentials, and all
          activity under your account. We may suspend or terminate accounts used for fraud, abuse, illegal activity,
          security attacks, payment evasion, or violations of these Terms.
        </p>
      </LegalPageSection>

      <LegalPageSection title="4. Subscription and Billing">
        <p>
          Paddle acts as Merchant of Record for Prometheus Studio purchases. Paddle processes payment methods, recurring
          billing, tax compliance, invoices, buyer support, cancellations, and refund transactions. Subscription terms,
          plan features, trial periods, and prices are shown before checkout.
        </p>
        <p>
          You may cancel a subscription through the Paddle buyer portal, the billing link in your Paddle confirmation
          email, Settings, Billing, or support@prometheusstudio.tech. Cancellation stops future renewals and access
          continues until the end of the then-current billing period unless otherwise required by law.
        </p>
      </LegalPageSection>

      <LegalPageSection title="5. User Content">
        <LegalPageSubsection title="Ownership">
          <p>
            You own your uploaded videos, audio, images, transcripts, captions, project files, and final exports. We do
            not claim ownership over your content.
          </p>
        </LegalPageSubsection>
        <LegalPageSubsection title="Limited license to operate the service">
          <p>
            You grant Prometheus Studio a limited license to host, process, display, transmit, transform, render, and
            store your content only as needed to provide the service, secure the platform, comply with law, and support
            user-directed exports or publishing.
          </p>
        </LegalPageSubsection>
        <LegalPageSubsection title="Content moderation">
          <p>
            You may not upload or publish illegal, infringing, exploitative, non-consensual, abusive, deceptive, or
            malicious content. You are responsible for rights, releases, licenses, and platform compliance for your
            content.
          </p>
        </LegalPageSubsection>
      </LegalPageSection>

      <LegalPageSection title="6. Acceptable Use">
        <ul className="list-inside list-disc space-y-2">
          <li>No bots, spam, scraping, credential sharing, or abuse of rate limits.</li>
          <li>No reverse engineering, security probing, interference, or circumvention.</li>
          <li>No illegal content or content that violates third-party rights.</li>
          <li>No use of social integrations for unsolicited posting, impersonation, or platform policy evasion.</li>
          <li>No resale or sublicensing unless agreed in writing.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="7. Social Platform Integrations">
        <p>
          Social publishing is user-initiated only. Prometheus Studio does not control YouTube, Google, Dropbox,
          TikTok, LinkedIn, Meta, X, or other third-party platforms, and each platform may reject, remove, limit, or
          suspend content or integrations under its own policies.
        </p>
        <p>
          You must comply with each connected platform&apos;s terms, developer rules, rate limits, branding rules, and
          content policies. You may disconnect integrations at any time.
        </p>
      </LegalPageSection>

      <LegalPageSection title="8. Intellectual Property">
        <p>
          Prometheus AI owns Prometheus Studio software, systems, workflows, interface design, documentation, templates,
          model orchestration, trademarks, and platform technology. You may use the service only as permitted by these
          Terms.
        </p>
      </LegalPageSection>

      <LegalPageSection title="9. Disclaimers and Limitation of Liability">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent
          permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement,
          uninterrupted availability, and error-free output.
        </p>
        <p>
          To the fullest extent permitted by law, Prometheus AI will not be liable for indirect, incidental, special,
          consequential, exemplary, punitive, lost profit, lost data, business interruption, or platform suspension
          damages. Our total liability is limited to amounts paid to us for the service in the three months before the
          claim, unless law requires otherwise.
        </p>
      </LegalPageSection>

      <LegalPageSection title="10. Indemnification">
        <p>
          You agree to indemnify and hold Prometheus AI harmless from claims, damages, liabilities, costs, and expenses
          arising from your content, your violation of these Terms, your violation of law, or your violation of a third
          party platform&apos;s terms.
        </p>
      </LegalPageSection>

      <LegalPageSection title="11. Governing Law and Disputes">
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict of law
          principles, unless mandatory consumer law in your jurisdiction requires otherwise. Disputes will be resolved in
          competent courts unless a separate written agreement requires arbitration.
        </p>
      </LegalPageSection>

      <LegalPageSection title="12. Changes and Contact">
        <p>
          We may update these Terms by posting a revised version and updating the date. Material changes may also be
          sent by email or shown in the product. Contact support@prometheusstudio.tech with questions.
        </p>
      </LegalPageSection>
    </LegalPageShell>
  )
}
