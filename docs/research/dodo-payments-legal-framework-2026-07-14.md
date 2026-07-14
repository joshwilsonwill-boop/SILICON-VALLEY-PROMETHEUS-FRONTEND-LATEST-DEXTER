# Dodo Payments Legal Framework Research

**Research date:** 2026-07-14  
**Scope:** Primary Dodo Payments materials relevant to Prometheus Studio's Dodo migration.  
**Important:** This is product/legal research, not legal advice. Have qualified counsel review the final customer-facing policies, especially governing law, consumer rights, retention periods, and any chargeback remedy.

## Confirmed Dodo Positions

### Merchant of Record and buyer contract

Dodo's Buyer Terms state that Dodo Payments is the merchant of record and an authorised reseller for the supplier. The buyer purchases from Dodo, while the supplier licenses or sells the underlying product. The terms also describe a click-wrap acceptance flow: before an order is submitted, a buyer must be shown the terms and affirmatively accept them.

**Policy implication:** Prometheus can accurately state that Dodo is the seller/Merchant of Record for transactions and Prometheus supplies the service. Prometheus should not describe itself as the direct seller or issuer of the Dodo invoice/receipt. Checkout should make the applicable Prometheus Terms and Privacy Policy links available, and the actual integration must preserve Dodo's required affirmative acceptance.

Source: [Dodo Payments Buyer Terms](https://dodopayments.com/legal/buyer-terms) (last updated 2026-02-26), sections opening paragraph and “Contract Formation”.

### Digital delivery, subscriptions, taxes, and refunds

Dodo's Buyer Terms say that, for immediately available digital content, the buyer consents to immediate performance and loses the withdrawal right once the download or relevant transmission begins. Dodo charges the payment method and applicable taxes, sends electronic invoices/receipts, and handles refunds case by case at its sole discretion. The terms permit Dodo to refuse refunds where it finds fraud, refund abuse, or manipulative conduct. Subscription cancellation takes effect at the next payment date and unused subscription periods are not refunded. The terms provide a separate 60-day process for eligible indirect-sales-tax refunds where a valid tax code is supplied.

**Policy implication:** A Prometheus refund policy may set a support-review window and eligibility criteria, but must state that approved payment refunds are processed by Dodo and remain subject to applicable law, card-network rules, and Dodo's buyer terms. Do not characterize a 7-day support window as a Dodo-mandated deadline; it is a Prometheus policy choice. Do not use digital-delivery/withdrawal wording to override non-waivable local consumer rights.

Source: [Dodo Payments Buyer Terms](https://dodopayments.com/legal/buyer-terms), “Digital Content”, “Payment, Taxes and Refunds”, and “Subscriptions”.

### Chargebacks

Dodo's Buyer Terms require buyers to contact Dodo before raising a chargeback or bank/card dispute. For a legitimate charge disputed without merit or legitimate reason, Dodo reserves the right, at its sole discretion, to prohibit future purchases or charge USD 100 in liquidated damages.

**Policy implication:** Prometheus can direct users to contact Prometheus support and Dodo before a chargeback, and may suspend an account for chargeback abuse under its own terms. Avoid stating that Prometheus itself will impose Dodo's USD 100 charge or unilaterally determine a chargeback is meritless. Attribute that remedy precisely to Dodo's buyer terms and preserve consumers' statutory dispute rights.

Source: [Dodo Payments Buyer Terms](https://dodopayments.com/legal/buyer-terms), “Chargebacks”.

### Dodo privacy role

Dodo's Privacy Policy says the policy is issued by Dodo controller entities and addresses people with whom Dodo interacts in its Merchant of Record business. It identifies processing grounds including consent, contract, legitimate interests, and legal obligations; describes international transfers using appropriate safeguards including Standard Contractual Clauses where applicable; and describes data-subject rights. Its current policy must be linked rather than reproduced.

**Policy implication:** Describe Dodo as an independent controller for its own Merchant of Record/payment, tax, invoice, fraud, and compliance processing. Prometheus remains responsible for explaining its own processing of accounts, media, projects, support requests, analytics, and any payment-status data it receives. Do not say Dodo processes all Prometheus user data, or call Dodo Prometheus's processor for Dodo's MoR operations.

Source: [Dodo Payments Privacy Policy](https://dodopayments.com/legal/privacy-policy), introduction, lawful-bases, international-transfer, and data-subject-rights sections.

### AI video, adult content, and merchant acceptance

Dodo's Merchant Acceptance Policy lists AI content-generation tools, including text, image, video, and voice, as acceptable only without impersonation, scraping, or deepfakes. It separately prohibits “NSFW, Intimacy & Adult content or services,” including explicit **or suggestive** material whether real or AI-generated. The policy also bars illegal content, piracy/unauthorised resale, deceptive claims, and privacy-violating offerings. Dodo can restrict or close access when offerings create legal, financial, or reputational risk, including high refunds/chargebacks or a material mismatch between what is marketed and what is delivered.

**Policy implication:** Prometheus's acceptable-use policy should prohibit:

- sexual, nude, pornographic, erotic, fetish, or sexually suggestive content, services, and outputs, whether real, synthetic, animated, or AI-generated;
- sexualized depictions of any person who is, appears to be, or could reasonably be perceived as under 18, with no exception for fictional, stylized, or age-altered content;
- non-consensual intimate imagery, sexualized likenesses, impersonation, deceptive deepfakes, and use of a person's voice/image without the required rights and consent;
- material designed to facilitate fraud, harassment, exploitation, circumvention of privacy, copyright infringement, or unlawful activity.

The terms should reserve the right to remove content, limit features, preserve evidence, and suspend/terminate accounts. They should also require users to obtain all necessary rights, permissions, and releases before upload or generation. This rule needs to be applied to uploaded assets, prompts, in-progress projects, exports, shared links, and integrations, not merely public publishing.

Source: [Dodo Payments Merchant Acceptance Policy](https://docs.dodopayments.com/miscellaneous/merchant-acceptance), “Businesses We Can Support”, “Businesses We Can’t Support”, and fulfillment-channel/enforcement guidance.

## Checkout and implementation cautions

1. Verify the deployed Dodo checkout uses the current Dodo-hosted/SDK flow and does not replace or interfere with Dodo's buyer-terms acknowledgement. Dodo's Buyer Terms expressly describe affirmative click-wrap acceptance.
2. Link Prometheus's own Terms, Privacy Policy, and Refund Policy from its website and any pre-checkout screen. Keep Dodo's buyer terms and privacy-policy links available at the payment stage as required by the active Dodo integration.
3. Use a precise customer-facing division of responsibilities: Prometheus provides product support and controls the platform; Dodo is MoR and controls payment, tax, invoice, and its buyer-refund/chargeback process.
4. Do not promise a specific Dodo customer-portal URL, payment method, tax treatment, refund timing, Dodo retention period, or regional legal outcome unless verified from the current account configuration and counsel-approved.
5. The source pages change over time. Re-check their effective dates and the configured checkout immediately before publishing legal copy.

## Sources Reviewed

- [Dodo Payments Buyer Terms](https://dodopayments.com/legal/buyer-terms) (last updated 2026-02-26)
- [Dodo Payments Privacy Policy](https://dodopayments.com/legal/privacy-policy)
- [Dodo Payments Merchant Acceptance Policy](https://docs.dodopayments.com/miscellaneous/merchant-acceptance)
- [Dodo Payments Checkout documentation](https://docs.dodopayments.com/features/checkout)
