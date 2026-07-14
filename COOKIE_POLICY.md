# Prometheus Studio Cookie Policy

**Last Updated:** 14 July 2026

> **Review note:** This is a product-specific policy draft. Confirm the deployed-cookie inventory, provider durations, and bracketed contact details with privacy counsel before publication.

## 1. Introduction

Prometheus Studio uses cookies and similar technologies to keep the Platform secure, remember choices you ask us to remember, and, with your permission, understand how the Platform is used. This Cookie Policy explains those technologies and the choices available to you. For our broader personal-data practices, see our Privacy Policy.

Where GDPR or UK GDPR applies, we rely on consent under Article 6(1)(a) for non-essential analytics, preference, and marketing technologies. For strictly necessary storage used for security, authentication, checkout, and core Service operation, we rely on the applicable ePrivacy/PECR necessity exemption; where associated personal data is processed, our GDPR basis may include legitimate interests under Article 6(1)(f), contractual necessity, or legal obligation as appropriate.

## 2. What Are Cookies?

Cookies are small text files that a website places on your browser or device. First-party cookies are set by Prometheus Studio. Third-party cookies are set by a provider whose service is embedded in or used by our Platform.

Session cookies are removed when you close your browser. Persistent cookies remain until their stated expiry or until you clear them. We also use similar technologies, including localStorage, sessionStorage, IndexedDB, SDK storage, and pixel tags. Privacy and consent rules can apply to these technologies even when they are not technically browser cookies.

## 3. Cookies and Similar Technologies We Use

### Essential Cookies - Always Active

The first table lists technologies currently used by the Platform or its deployed infrastructure. Payment-provider and third-party entries marked "where applicable" are conditional on the checkout or embedded service you use.

| Cookie Name | Provider | Purpose | Duration | Type |
| --- | --- | --- | --- | --- |
| `sb-*-auth-token*`, `sb-access-token`, `sb-refresh-token` | Supabase / Prometheus Studio | Maintains authenticated sessions and refreshes account access securely. | Session to persistent, as configured by Supabase | First-party |
| `xano_token` | Prometheus Studio | Maintains an application authentication session where the legacy authentication flow is used. | 7 days | First-party |
| `__vercel_jwt` | Vercel | Supports edge routing, deployment protection, and request authentication where enabled. | Session | First-party |
| `cf_clearance` | Cloudflare | Records that a browser passed Cloudflare bot-management or security checks. | Up to 1 year, provider-configured | Third-party |
| `__stripe_sid`, `__stripe_mid` | Payment service used in Dodo Payments checkout, where applicable | Supports payment-session security and fraud prevention when a configured checkout uses these services. | Session to 1 year, provider-configured | Third-party |
| Next.js and application session cookies | Prometheus Studio | Supports request integrity, navigation, and application session management. | Session | First-party |

### Analytics Cookies - Active with Consent

| Cookie Name | Provider | Purpose | Duration | Type |
| --- | --- | --- | --- | --- |
| `ph_*` | PostHog, when configured | Stores a distinct visitor or session identifier for product-usage analysis, funnels, and optional session replay. | Up to 1 year, provider-configured | First-party |
| `va_*` or equivalent measurement storage | Vercel Analytics, when enabled | Measures page visits, web vitals, and performance trends for Platform optimization. | Provider-configured | First-party |

### Preference Cookies - Active with Consent

| Cookie Name | Provider | Purpose | Duration | Type |
| --- | --- | --- | --- | --- |
| `prometheus.theme.preferences.v1`, `theme` | Prometheus Studio | Stores an optional theme and font choice for the interface. | Persistent until changed or cleared | First-party |
| `locale` | Prometheus Studio | Stores an optional interface language choice when language selection is enabled. | Persistent until changed or cleared | First-party |
| Reduced-motion preference | Prometheus Studio | Stores an optional accessibility choice that reduces non-essential motion. | Persistent until changed or cleared | First-party |

### Marketing Cookies - Active with Explicit Opt-In

| Cookie Name | Provider | Purpose | Duration | Type |
| --- | --- | --- | --- | --- |
| None currently deployed | Not applicable | No marketing or retargeting cookies are currently deployed. Any future advertising measurement or retargeting technology will require your explicit opt-in first. | Not applicable | Third-party |

## 4. Third-Party Content

Embedded third-party content may set its own cookies or similar technologies after you interact with it. This can include YouTube previews or tutorials and social sharing widgets from X, Meta, or other platforms. We do not control those technologies. Review the provider policies before interacting with embedded content:

- Google / YouTube: `https://policies.google.com/technologies/cookies`
- X: `https://x.com/en/privacy`
- Meta: `https://www.facebook.com/privacy/policies/cookies/`

## 5. How We Obtain Consent

On your first visit, our cookie banner lets you choose **Accept All**, **Reject Non-Essential**, or **Customize**. Essential technologies are always active because the Service cannot function securely without them. Analytics and preference technologies are off unless you opt in. Marketing technologies are off unless you explicitly opt in; we do not use pre-ticked boxes.

We record your choice, timestamp, and policy version in localStorage under `prometheus_cookie_consent`. We use localStorage for this record to avoid placing a non-essential cookie before you make a choice.

## 6. Managing Cookies and Withdrawing Consent

You can change or withdraw consent at any time by clicking **Cookie Settings** in the footer or in Settings. Withdrawal stops future non-essential technologies from being loaded. Technologies already stored may remain until they expire or you clear them manually.

You can also manage cookies through browser controls:

- Chrome: `https://support.google.com/chrome/answer/95647`
- Safari: `https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac`
- Firefox: `https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox`
- Edge: `https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge`

You may also use the Google Analytics opt-out browser add-on, applicable PostHog controls, the Network Advertising Initiative opt-out, and Your Online Choices in the EU. Blocking essential cookies can prevent login, checkout, security controls, and other Platform functions from working.

## 7. California Choices

Prometheus Studio does not sell personal information for money and does not share it for cross-context behavioral advertising without required notice and choice. California residents can use the **Do Not Sell or Share My Personal Information** control in the banner or footer to keep optional marketing choices disabled and open their preferences. For a broader privacy request, contact support@prometheusstudio.tech.

## 8. Changes and Contact

We may update this policy as our technology use changes. For material changes, we will show an updated notice through the banner or another appropriate method on your next visit. Continued use after a new choice is presented is not treated as consent for optional technologies.

**Cookie inquiries:** support@prometheusstudio.tech  
**Privacy inquiries:** support@prometheusstudio.tech  
**DPO contact:** [TBD] To be appointed when the GDPR threshold is met or the first EU user is onboarded.
