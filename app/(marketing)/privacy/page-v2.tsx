// DEPRECATED — replaced by PRIVACY_POLICY.md on 2026-07-14.
import type { Metadata } from 'next'
import { LegalPageSection, LegalPageShell, LegalTable } from '@/components/marketing/legal-page-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy v2 | Prometheus Studio',
  description: 'Unified privacy policy for Prometheus Studio platform integrations and payments.',
}

export default function PrivacyPageV2() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      currentPath="/privacy"
      description="Prometheus Studio respects your privacy. This policy explains how we collect, use, protect, and delete personal data for our AI video editing workspace, payment flows, cloud storage, and user-initiated social publishing integrations."
    >
      <LegalPageSection title="1. Introduction">
        <p>
          Prometheus Studio (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy. This policy
          applies to prometheusstudio.tech, Prometheus Studio, and related services operated by Prometheus AI.
        </p>
        <p>
          Effective date: June 8, 2026. Contact: support@prometheusstudio.tech.
        </p>
      </LegalPageSection>

      <LegalPageSection title="2. Data We Collect">
        <LegalTable>
          <thead className="bg-white/[0.04] text-white">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Examples</th>
              <th className="p-3">Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {[
              ['Account info', 'Name, email, password hash', 'Authentication and account management'],
              ['Profile data', 'Avatar, bio, company', 'Personalization and social features'],
              ['Payment data', 'Billing address, VAT ID', 'Paddle handles payments; we never store card numbers'],
              ['Project data', 'Video files, transcripts, edits', 'Core app functionality'],
              ['Usage data', 'Feature usage, errors', 'Product improvement and debugging'],
              ['OAuth data', 'Platform tokens, connection status', 'Social publishing integrations'],
              ['Device data', 'IP address, browser, operating system', 'Security and fraud prevention'],
            ].map(([category, examples, purpose]) => (
              <tr key={category}>
                <td className="p-3 font-medium text-white">{category}</td>
                <td className="p-3">{examples}</td>
                <td className="p-3">{purpose}</td>
              </tr>
            ))}
          </tbody>
        </LegalTable>
      </LegalPageSection>

      <LegalPageSection title="3. How We Use Your Data">
        <ul className="list-inside list-disc space-y-2">
          <li>Provide and improve the Prometheus Studio service.</li>
          <li>Process payments through Paddle as Merchant of Record.</li>
          <li>Authenticate users through Supabase Auth.</li>
          <li>Enable user-initiated publishing to connected social platforms.</li>
          <li>Send transactional emails such as account, billing, security, and product notices.</li>
          <li>Comply with legal obligations and enforce platform security.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="4. Data Sharing and Service Providers">
        <LegalTable>
          <thead className="bg-white/[0.04] text-white">
            <tr>
              <th className="p-3">Third party</th>
              <th className="p-3">What we share</th>
              <th className="p-3">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {[
              ['Paddle', 'Payment and billing details', 'Payment processing, tax, invoices, and refunds'],
              ['Supabase', 'User, project, and connection data', 'Database hosting and authentication'],
              ['Cloudflare R2', 'Media files and generated assets', 'Cloud storage'],
              ['Social platforms', 'Videos, captions, and metadata selected by you', 'User-initiated publishing only'],
              ['AssemblyAI', 'Audio files selected for transcription', 'Transcription processing'],
              ['Groq', 'Text prompts and editor instructions', 'AI processing'],
              ['Analytics providers', 'Usage patterns and diagnostics', 'Product improvement'],
            ].map(([party, shared, purpose]) => (
              <tr key={party}>
                <td className="p-3 font-medium text-white">{party}</td>
                <td className="p-3">{shared}</td>
                <td className="p-3">{purpose}</td>
              </tr>
            ))}
          </tbody>
        </LegalTable>
        <p>
          We do not sell your data. We do not share data for advertising purposes. We do not use your data to build
          profiles for third parties.
        </p>
      </LegalPageSection>

      <LegalPageSection title="5. Social Platform Data Usage">
        <p>
          When you connect a social platform, we store only the access token, refresh token when required, expiration
          time, and basic profile or channel information needed to publish content you explicitly select.
        </p>
        <ul className="list-inside list-disc space-y-2">
          <li>We do not access private messages, friend lists, or browsing history.</li>
          <li>We do not post on your behalf without explicit user action.</li>
          <li>You can disconnect any platform at any time in Settings, Social Accounts.</li>
          <li>Upon disconnection, we delete the access token immediately unless legal retention is required.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="6. Google API Services Limited Use Disclosure">
        <p>
          Prometheus Studio&apos;s use of Google API Services, including the YouTube Data API and Google Drive API,
          complies with the Google API Services User Data Policy, including the Limited Use requirements.
        </p>
        <ul className="list-inside list-disc space-y-2">
          <li>We access YouTube data only to display channel information and publish videos to your channel on request.</li>
          <li>We access Google Drive data only for files you choose or create through Prometheus Studio.</li>
          <li>We do not use Google user data for advertising, retargeting, or profiling.</li>
          <li>We do not transfer Google user data to third parties except as necessary to provide the user-requested feature.</li>
          <li>Users can revoke access through Google Account permissions or inside Prometheus Studio.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="7. Data Retention and Deletion">
        <ul className="list-inside list-disc space-y-2">
          <li>Account data is retained while your account is active.</li>
          <li>Project data is retained until you delete the project or your account.</li>
          <li>Media files are deleted from storage when the related project is deleted.</li>
          <li>OAuth tokens are deleted immediately upon disconnection.</li>
          <li>Analytics data is anonymized after 12 months where technically feasible.</li>
          <li>Full account deletion requests are completed within 30 days unless legal retention applies.</li>
        </ul>
      </LegalPageSection>

      <LegalPageSection title="8. User Rights">
        <p>
          Depending on your location, including the EU, UK, EEA, California, and other privacy jurisdictions, you may
          request access, correction, deletion, restriction, portability, or objection to non-essential processing.
        </p>
        <p>
          California users may use &quot;Do Not Sell or Share My Personal Information&quot; by contacting
          support@prometheusstudio.tech. We do not sell or share personal information for cross-context behavioral
          advertising.
        </p>
      </LegalPageSection>

      <LegalPageSection title="9. Security">
        <p>
          We use TLS for data in transit, encryption for stored data where supported by our infrastructure providers,
          encrypted OAuth token storage, access controls, logging, and regular security review. We are working toward
          formal SOC 2 Type II readiness and will update this page when certification status changes.
        </p>
      </LegalPageSection>

      <LegalPageSection title="10. Cookies and Tracking">
        <p>
          We use essential cookies for session, authentication, security, and workspace state. Analytics cookies are
          optional where required by law and may be disabled. We do not use third-party advertising cookies.
        </p>
      </LegalPageSection>

      <LegalPageSection title="11. Children&apos;s Privacy">
        <p>
          Our service is not intended for users under 16. We do not knowingly collect personal data from children.
        </p>
      </LegalPageSection>

      <LegalPageSection title="12. Changes and Contact">
        <p>
          We may update this policy. Changes are posted here with a revised date. For privacy, deletion, or data access
          requests, contact support@prometheusstudio.tech.
        </p>
        <p>Business contact: Prometheus Studio, Prometheus AI, support@prometheusstudio.tech.</p>
      </LegalPageSection>
    </LegalPageShell>
  )
}
