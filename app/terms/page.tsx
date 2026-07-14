import type { Metadata } from 'next'

import { LegalLayout, LegalSection, LegalSubsection } from '@/components/legal/LegalLayout'

const LAST_UPDATED = '14 July 2026'

export const metadata: Metadata = {
  title: 'Terms of Service | Prometheus Studio',
  description: 'Terms of Service for Prometheus Studio.',
}

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="These Terms govern your use of Prometheus Studio, an AI-powered video editing and motion graphics platform."
      currentPath="/terms"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="1. Agreement and Definitions">
        <p>
          These Terms of Service govern your access to and use of Prometheus Studio, including
          prometheusstudio.tech, our applications, AI-powered editing and motion-graphics tools,
          cloud storage, rendering, export, and support services (collectively, the Service).
          Prometheus Studio is operated by Prometheus AI (we, us, or our).
        </p>
        <p>
          User, Customer, and you mean a person or entity accessing the Service. Content means
          media, prompts, project files, timelines, captions, exports, and AI-generated outputs
          uploaded to, created with, or processed through the Service.
        </p>
        <p>
          Dodo Payments is our authorized reseller and Merchant of Record (MoR) for paid
          transactions. As MoR, Dodo Payments is the legal seller of record for the transaction;
          Prometheus Studio supplies the underlying Service.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          Prometheus Studio provides tools for video editing, AI-assisted content generation,
          cloud media storage, rendering, and export. Plan features, usage limits, supported
          formats, integrations, and availability can change as the Service evolves.
        </p>
        <p>
          AI outputs may contain mistakes, artifacts, inaccurate captions, unexpected visual or
          audio characteristics, or material unsuitable for your purpose. We do not guarantee
          output quality, rendering time, model availability, compatibility, or uninterrupted
          access. You must review outputs before publishing, distributing, or relying on them.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility, Accounts, and Security">
        <p>
          You must be at least 13, or the higher minimum age required where you live. If you are
          under the age of majority, you may use the Service only with a parent or guardian&apos;s
          permission. You must provide accurate, current account information and keep it updated.
        </p>
        <p>
          You are responsible for activity under your account and for protecting your password,
          API keys, connected-account credentials, and devices. Notify us at
          support@prometheusstudio.tech if you suspect unauthorized access.
        </p>
        <p>
          We may suspend, restrict, or terminate accounts when reasonably necessary to investigate
          a Terms violation, fraud, chargeback abuse, payment failure, security risk, legal
          requirement, or harm to the Service or other users.
        </p>
      </LegalSection>

      <LegalSection title="4. Payments and Billing">
        <LegalSubsection title="Dodo Payments as Merchant of Record">
          <p>
            All paid transactions are processed by Dodo Payments as our Merchant of Record and
            authorized reseller. You purchase the applicable subscription or digital service from
            Dodo Payments, not directly from Prometheus Studio. Dodo Payments handles payment
            processing, applicable tax calculation and remittance, receipts or invoices,
            chargeback handling, and payment refunds under its buyer terms and applicable law.
          </p>
          <p>
            We provide product and technical support for Prometheus Studio. We do not issue Dodo
            Payments invoices or collect payment for Dodo Payments transactions directly.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Subscriptions, taxes, and failed payments">
          <p>
            Prices, currency, billing interval, plan features, and applicable taxes are displayed
            before checkout. Subscriptions renew automatically until cancelled. Cancellation stops
            a future renewal and normally does not refund an already-started period unless required
            by law or approved under our Refund Policy.
          </p>
          <p>
            If a charge fails or is reversed, Dodo Payments may retry it as permitted by its terms
            and payment-network rules. You remain responsible for valid amounts due, and we may
            limit paid access until payment status is resolved. We give advance notice of material
            price increases where required by law.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="5. Refunds, Digital Delivery, and Chargebacks">
        <p>
          Our Refund Policy forms part of these Terms. Submit a request to
          support@prometheusstudio.tech or through the Dodo Payments buyer-support flow shown on
          your receipt within 7 days of the transaction date, unless applicable law provides a
          longer period. The 7-day period is our support-review window, not a Dodo Payments
          deadline.
        </p>
        <p>
          The Service provides immediate access to digital tools, cloud services, and AI
          processing. Where law permits, you request immediate performance and acknowledge that a
          withdrawal right may be lost when digital delivery or transmission begins. Nothing here
          limits a non-waivable consumer right.
        </p>
        <p>
          Refunds are reviewed case by case and are processed by Dodo Payments, subject to its
          buyer terms, payment-network rules, fraud controls, and applicable law. Before opening a
          card dispute, contact us and Dodo Payments so we can investigate. This does not limit
          your lawful right to dispute a charge. Dodo Payments&apos; Buyer Terms may provide Dodo
          Payments, in its sole discretion, remedies for a meritless chargeback; Prometheus Studio
          does not impose those remedies.
        </p>
      </LegalSection>

      <LegalSection title="6. Content, Intellectual Property, and AI">
        <LegalSubsection title="Your Content">
          <p>
            You retain ownership of Content you lawfully upload. You represent that you have every
            right, license, release, and consent needed to upload, edit, process, export, share,
            and generate from that Content.
          </p>
          <p>
            You grant us and our providers a limited, non-exclusive, worldwide, royalty-free
            license to host, copy, transmit, store, process, transform, render, display, and export
            Content solely to provide, secure, support, and improve the Service; comply with law;
            and complete user-directed integrations.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Outputs and our technology">
          <p>
            Subject to these Terms and applicable law, we do not claim ownership of your
            AI-generated outputs. You may use outputs personally or commercially, but we do not
            guarantee that they are unique, non-infringing, lawful, or fit for a particular use.
            Similar outputs can be generated for other users.
          </p>
          <p>
            Prometheus AI owns the Platform, including its software, code, UI, models, workflows,
            templates, documentation, branding, and underlying technology. We may use de-identified
            and aggregated data to improve the Service and AI systems. We do not use private
            Content to train models available to other users without your explicit consent.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="7. Acceptable Use and Content Safety">
        <p>
          You must comply with applicable law and may not use the Service to create, upload,
          process, export, store, share, or facilitate unlawful or harmful Content or conduct.
        </p>
        <ul className="list-inside list-disc space-y-2">
          <li>
            Child sexual abuse material or sexualized depictions of anyone who is, appears to be,
            or could reasonably be perceived as under 18, including fictional, stylized, animated,
            age-altered, or AI-generated material.
          </li>
          <li>
            Nude, pornographic, erotic, fetish, sexually explicit, or sexually suggestive Content,
            whether real, synthetic, animated, or AI-generated.
          </li>
          <li>
            Non-consensual intimate imagery, sexualized likenesses, deepfakes, face swaps, voice
            cloning, or deceptive impersonation without all required rights and consent.
          </li>
          <li>
            Fraud, scams, phishing, identity theft, harassment, extremist or terrorist content,
            hateful or exploitative content, or material intended to cause harm.
          </li>
          <li>
            Copyright, trademark, privacy, publicity, trade-secret, or other rights infringement;
            pirated media; or unauthorized resale.
          </li>
          <li>
            Scraping, spam, credential sharing, API abuse, reverse engineering, security probing,
            bypassing usage limits, or interference with the Service or connected platforms.
          </li>
        </ul>
        <p>
          These rules apply to prompts, source media, projects, drafts, exports, shared links, and
          integrations. We do not monitor all Content in real time. We may remove Content, block
          outputs, preserve evidence, restrict features, and suspend or terminate accounts. Report
          suspected violations to support@prometheusstudio.tech.
        </p>
      </LegalSection>

      <LegalSection title="8. Privacy and Third Parties">
        <p>
          Our Privacy Policy explains how we process personal data. Dodo Payments is an independent
          controller for its Merchant of Record operations, including payment, tax, invoicing,
          refund, fraud, and chargeback processing. Its privacy policy is available at
          dodopayments.com/legal/privacy-policy.
        </p>
        <p>
          Connected storage, publishing, cloud, AI, analytics, and other third-party services are
          governed by their own terms and privacy policies. We do not control their availability or
          decisions. You may disconnect an integration through the Service where available.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers and Limitation of Liability">
        <p>
          To the maximum extent permitted by law, the Service is provided as is and as available,
          without warranties of merchantability, fitness for a particular purpose, title,
          non-infringement, accuracy, availability, or error-free operation.
        </p>
        <p>
          To the maximum extent permitted by law, Prometheus Studio and its suppliers are not liable
          for indirect, incidental, special, consequential, exemplary, punitive, lost-profit,
          lost-data, goodwill, business-interruption, AI-output, third-party-service, or Service
          availability damages. Our total liability for claims relating to the Service will not
          exceed the amount you paid for the Service in the 12 months before the event giving rise
          to the claim. These limits apply only to the extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="10. Termination, Governing Law, and Changes">
        <p>
          You may cancel a plan or stop using the Service at any time. On termination, access to
          paid features may end at the conclusion of the current paid period or sooner where
          suspension is necessary. We retain data only as described in the Privacy Policy or as
          needed for legal compliance, security, fraud prevention, backups, disputes, and
          enforcement.
        </p>
        <p>
          These Terms are governed by and construed in accordance with the laws of England and
          Wales, without regard to conflict of law principles.
        </p>
        <p>
          Any dispute arising from these Terms shall be finally resolved by binding arbitration
          under the Rules of the London Court of International Arbitration (LCIA). The seat of
          arbitration shall be London, England. The language of arbitration shall be English. The
          arbitral tribunal shall consist of one arbitrator appointed in accordance with LCIA Rules.
        </p>
        <p>
          Judgment on the arbitration award may be entered in any court of competent jurisdiction.
          Notwithstanding the foregoing, either party may seek injunctive or other equitable relief
          in any court of competent jurisdiction to prevent irreparable harm pending arbitration.
        </p>
        <p>
          You agree to resolve disputes with us individually and waive any right to participate in
          class actions, collective proceedings, or representative actions to the maximum extent
          permitted by applicable law.
        </p>
        <p>
          We may update these Terms for changes to the Service, law, security, or our operations.
          We will provide notice of material changes when required by law. Continued use after an
          effective date constitutes acceptance to the extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>Support and legal inquiries: support@prometheusstudio.tech</p>
        <p>Dodo Payments buyer support: support@dodopayments.com</p>
      </LegalSection>
    </LegalLayout>
  )
}
