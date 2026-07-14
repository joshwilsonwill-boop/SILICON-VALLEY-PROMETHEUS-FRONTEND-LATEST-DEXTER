import type { Metadata } from 'next'

import { LegalLayout, LegalSection, LegalSubsection } from '@/components/legal/LegalLayout'
import { COOKIE_CATALOG, type CookieCategory } from '@/lib/cookies/cookie-config'

const LAST_UPDATED = 'July 14, 2026'
const CATEGORIES: Array<{ id: CookieCategory; title: string; consent: string }> = [
  { id: 'essential', title: 'Essential Cookies', consent: 'Always active' },
  { id: 'analytics', title: 'Analytics Cookies', consent: 'Active with consent' },
  { id: 'preferences', title: 'Preference Cookies', consent: 'Active with consent' },
  { id: 'marketing', title: 'Marketing Cookies', consent: 'Active with explicit opt-in' },
]

export const metadata: Metadata = {
  title: 'Cookie Policy | Prometheus Studio',
  description: 'Cookie Policy for Prometheus Studio.',
}

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      description="How Prometheus Studio uses cookies and similar technologies, and how you can control them."
      currentPath="/cookie-policy"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="1. Introduction">
        <p>
          Prometheus Studio uses cookies and similar technologies to keep the Platform secure,
          remember choices you ask us to remember, and, with your permission, understand how the
          Platform is used. This Cookie Policy should be read with our Privacy Policy, which
          explains our broader personal-data practices.
        </p>
        <p>
          Where GDPR or UK GDPR applies, we rely on consent for non-essential analytics,
          preference, and marketing technologies. Strictly necessary storage relies on the
          applicable ePrivacy or PECR necessity exemption; associated personal-data processing may
          rely on legitimate interests, contractual necessity, or legal obligations as appropriate.
        </p>
      </LegalSection>

      <LegalSection title="2. What Are Cookies?">
        <p>
          Cookies are small text files placed on your browser or device. First-party cookies are
          set by Prometheus Studio; third-party cookies are set by a provider whose service is used
          in or embedded on the Platform. Session cookies are removed when you close your browser;
          persistent cookies remain until their stated expiry or until you clear them.
        </p>
        <p>
          Similar technologies include localStorage, sessionStorage, IndexedDB, SDK storage, and
          pixel tags. Consent rules can apply to these technologies even when they are not browser cookies.
        </p>
      </LegalSection>

      <LegalSection title="3. Technologies We Use">
        {CATEGORIES.map((category) => (
          <LegalSubsection key={category.id} title={`${category.title} - ${category.consent}`}>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-[44rem] text-left text-sm text-white/68">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.12em] text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cookie name</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Purpose</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {COOKIE_CATALOG[category.id].map((cookie) => (
                    <tr key={cookie.name} className="align-top">
                      <td className="px-4 py-3 font-medium text-white">{cookie.name}</td>
                      <td className="px-4 py-3">{cookie.provider}</td>
                      <td className="px-4 py-3">{cookie.purpose}</td>
                      <td className="px-4 py-3">{cookie.duration}</td>
                      <td className="px-4 py-3">{cookie.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LegalSubsection>
        ))}
      </LegalSection>

      <LegalSection title="4. Third-Party Content">
        <p>
          Payment-provider rows marked where applicable and embedded YouTube previews, tutorials,
          or social sharing widgets may set their own cookies after
          you interact with them. We do not control those technologies. Review Google/YouTube, X,
          Meta, and any other provider&apos;s privacy and cookie policies before interacting with embedded content.
        </p>
      </LegalSection>

      <LegalSection title="5. Consent and Your Choices">
        <p>
          On your first visit, the cookie banner lets you Accept All, Reject Non-Essential, or
          Customize. Essential technologies stay active because the Service cannot function securely
          without them. Optional categories are off by default and no marketing option is pre-selected.
        </p>
        <p>
          We record your choice, timestamp, and policy version in localStorage under
          prometheus_cookie_consent. You can change or withdraw consent at any time through Cookie
          Settings in the footer or Settings. Withdrawal stops optional technologies from loading going forward.
        </p>
      </LegalSection>

      <LegalSection title="6. Browser and Third-Party Controls">
        <p>
          You can clear or block cookies through browser settings, use the Google Analytics opt-out
          browser add-on, applicable PostHog controls, the Network Advertising Initiative opt-out,
          or Your Online Choices in the EU. Blocking essential technologies can prevent login,
          checkout, security controls, and other Platform functions from working.
        </p>
      </LegalSection>

      <LegalSection title="7. California and Contact">
        <p>
          We do not sell personal information for money or share it for cross-context behavioral
          advertising without required notice and choice. California residents can use the Do Not
          Sell or Share My Personal Information control in the banner or footer to keep optional
          marketing choices disabled.
        </p>
        <p>Cookie and privacy inquiries: support@prometheusstudio.tech</p>
      </LegalSection>
    </LegalLayout>
  )
}
