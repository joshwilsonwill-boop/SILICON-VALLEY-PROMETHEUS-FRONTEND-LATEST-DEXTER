# Cookie Consent Legal Framework

**Research date:** 2026-07-14  
**Scope:** Primary regulator and statutory sources relevant to Prometheus Studio's cookie-consent banner, cookie policy, and non-essential tracking controls.  
**Important:** This is implementation research, not legal advice. Have qualified counsel review the deployed policy, cookie inventory, and regional configuration before launch.

## Confirmed Requirements

### UK and EU: device storage/access requires prior consent unless an exception applies

UK PECR Regulation 6 and Article 5(3) of the ePrivacy Directive require clear and comprehensive information about purposes and prior consent before storing information on, or accessing information from, a user's device, unless the limited technical-transmission or strictly-necessary/requested-service exception applies. The rule is technology-neutral: it is not confined to HTTP cookies. It covers web storage such as `localStorage`, scripts/tags, pixels, SDKs, and similar identifiers where they store or access device information.

**Implementation implication:** Do not initialize PostHog, Vercel Analytics, advertising pixels, third-party video embeds, or ordinary preference storage before the applicable opt-in. The `prometheus_cookie_consent` record may be stored as strictly necessary to remember and honor the user's choice. Authentication, security, and requested-service storage must be assessed by purpose, not labelled "essential" merely because it is convenient. A GDPR legitimate-interest basis for related processing does **not** replace the PECR/ePrivacy strict-necessity exception for device storage/access.

Sources: [PECR Regulation 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6); [ePrivacy Directive, Article 5(3)](https://eur-lex.europa.eu/eli/dir/2002/58/2018-12-19/eng); [ICO: What are the PECR rules?](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-pecr-rules/); [ICO: What are storage and access technologies?](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/).

### Valid consent is opt-in, informed, specific, demonstrable, and reversible

The GDPR defines consent as freely given, specific, informed, unambiguous, and expressed through a clear affirmative action. Controllers must be able to demonstrate consent; requests must be distinguishable, intelligible, and easily accessible; and withdrawing consent must be as easy as giving it. Silence, inactivity, pre-ticked boxes, and continued browsing are not valid consent. The ICO applies these requirements to non-exempt storage/access: name third parties, describe purposes before consent, do not operate non-exempt technologies beforehand, and make refusal as easy as acceptance.

**Implementation implication:** The first-visit default is essential-only. The banner needs an equally usable `Reject Non-Essential` action alongside `Accept All`, no pre-enabled Analytics/Preferences/Marketing controls, and a persistent Cookie Settings control that opens the same choices. Record category choices, timestamp, policy/config version, and the user action. Do not rely on scrolling, closing the page, or continued navigation as consent. Do not block the product/site merely to force acceptance of non-essential tracking.

Sources: [GDPR, Articles 4(11) and 7, and Recital 32](https://eur-lex.europa.eu/eli/reg/2016/679/oj); [ICO: What are the PECR rules?](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-pecr-rules/); [EDPB Guidelines 05/2020 on consent](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en).

### Policy disclosures must map to the deployed inventory

The ICO says the required clear and comprehensive information includes the technologies used, their purposes, whether third parties store/access or receive information, and intended storage/access duration. The organisation operating the service remains responsible for incorporated third-party technologies.

**Implementation implication:** The Cookie Policy must distinguish verified current cookies from conditional third-party technologies. Do not assert that a payment/checkout or embed cookie is set on Prometheus pages until a runtime audit verifies it. If YouTube/social embeds are added, do not load their tracking-capable content before consent; use a consent placeholder or external link. Re-audit after adding analytics, embeds, payments, or advertising tools.

Source: [ICO: What are the PECR rules?](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-pecr-rules/).

### California: opt-out applies when personal information is sold or shared

The CCPA gives California consumers the right to direct a business not to sell or share their personal information. A business that sells or shares personal information must provide a clear and conspicuous `Do Not Sell or Share My Personal Information` homepage link (or a compliant combined alternative) and honor opt-outs. "Sharing" includes cross-context behavioral advertising, so an advertising/retargeting pixel can trigger this requirement even where there is no monetary exchange. California regulations also require recognition of opt-out preference signals where applicable.

**Implementation implication:** If Prometheus does not currently sell or share personal information, it must say so accurately; California law does not require a Do-Not-Sell/Share link solely because a business exists. Retaining that link as a transparent route to Cookie Settings is reasonable if requested, but it must not falsely suggest data is sold/shared. Reassess before enabling marketing pixels, retargeting, or cross-context behavioral advertising, and honor applicable opt-out preference signals.

Sources: [California Civil Code sections 1798.120, 1798.135, and 1798.140](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&chapter=3.&part=4.&lawCode=CIV&title=1.81.5); [CPPA Consumer Privacy Regulations](https://cppa.ca.gov/regulations/consumer_privacy_regulations.html).

## Product Decisions Supported By This Research

1. Default to essential-only and store a minimal consent choice in `localStorage` to honor the decision.
2. Gate analytics and other non-essential scripts/components on that state, including after a user withdraws consent. A page refresh may be needed to remove scripts already initialized in the current document; document and minimize that behavior.
3. Make `Accept All`, `Reject Non-Essential`, and category-level saving clear, keyboard-operable, and comparable in effort and visibility.
4. Give users a persistent footer Cookie Settings entry and keep the policy's inventory, durations, purposes, and third-party disclosures current.
5. Treat this as a continuing compliance control: new SDKs, embeds, tracking pixels, and client storage need classification and review before release.

## Sources Reviewed

- [UK Privacy and Electronic Communications Regulations 2003, Regulation 6](https://www.legislation.gov.uk/uksi/2003/2426/regulation/6)
- [ICO guidance: storage and access technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/)
- [GDPR, Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [ePrivacy Directive 2002/58/EC](https://eur-lex.europa.eu/eli/dir/2002/58/2018-12-19/eng)
- [EDPB Guidelines 05/2020 on consent](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en)
- [California Consumer Privacy Act statutory text](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&chapter=3.&part=4.&lawCode=CIV&title=1.81.5)
- [California Privacy Protection Agency Consumer Privacy Regulations](https://cppa.ca.gov/regulations/consumer_privacy_regulations.html)
