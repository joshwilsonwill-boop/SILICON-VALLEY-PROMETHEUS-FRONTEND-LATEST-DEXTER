# Paddle Cleanup Checklist

**Prepared:** 2026-07-14  
**Migration status:** Active customer-facing payment, billing, legal, and checkout surfaces use Dodo Payments. Legacy Paddle files are retained only for rollback, historical records, or migration traceability and must not be used by new product code.

## Completed Active-Surface Cleanup

- [x] Replaced Paddle Merchant of Record wording on `/terms`, `/privacy`, and `/refund` with Dodo Payments wording.
- [x] Replaced the live contact-page reference to the Paddle customer portal with Dodo Payments buyer support and Prometheus billing support.
- [x] Added a required Prometheus Terms, Privacy Policy, and Refund Policy acknowledgment before the embedded Dodo checkout is opened.
- [x] Preserved Dodo's hosted checkout and its independent buyer-terms acknowledgement; the pre-checkout acknowledgment does not replace it.
- [x] Added production-ready Markdown source documents: `TERMS_OF_SERVICE.md`, `PRIVACY_POLICY.md`, and `REFUND_POLICY.md`.
- [x] Updated the active refund policy from a blanket 30-day guarantee to the Dodo-aligned case-by-case support-review process.

## Retained Legacy Runtime: Do Not Use for New Work

These files still contain Paddle references because they are retained as legacy rollback or compatibility code. The active billing flow uses `/api/dodo/*`, `components/billing/dodo-checkout-modal.tsx`, and Dodo-backed billing data.

| Location | Reason retained | Required future action |
| --- | --- | --- |
| `components/billing/paddle-checkout-button.tsx` | Unused legacy overlay component | Delete after confirming no import or production use for a full release cycle. |
| `lib/paddle.ts` | Legacy Paddle SDK helper | Delete with the legacy API routes and dependencies. |
| `app/api/billing/checkout/route.ts` | Legacy Paddle transaction endpoint | Return a deprecation response or delete after clients are confirmed migrated. |
| `app/api/billing/checkout-session/route.ts` | Legacy Paddle transaction lookup | Return a deprecation response or delete after clients are confirmed migrated. |
| `app/api/billing/cancel/route.ts` | Compatibility route already returns `410` | Remove after callers have migrated to `/api/dodo/subscription`. |
| `app/api/billing/invoices/route.ts` | Compatibility route already returns `410` | Remove after callers have migrated to `/api/dodo/invoices`. |
| `app/api/billing/webhook/route.ts` | Compatibility route already returns `410` | Remove after old webhook delivery is disabled in Paddle. |
| `hooks/use-billing-data.ts` | Legacy database field compatibility | Rename/remove `paddle_subscription_id` only after a reviewed database migration. |
| `lib/storage-limits.ts` | Legacy plan-ID comment | Update the comment when the legacy plan mapping is removed. |
| `supabase/migrations/20260525000000_billing_subscriptions.sql` | Immutable historical migration | Retain; never rewrite applied migrations. |
| `package.json` and `package-lock.json` | Paddle SDK remains for legacy code | Remove packages only in the same change that removes their imports. |
| `.env.example` | Retained old variable names for rollback context | Remove deprecated variables after legacy code is deleted and deployment configuration is verified. |
| `scripts/generate-paddle-client-token.ts` and `scripts/test-paddle-key.ts` | Old operational utilities | Archive or delete after access is revoked and no rollback is needed. |

## Retained Historical and Audit Materials

| Location | Reason retained | Required future action |
| --- | --- | --- |
| `PADDLE_AUDIT.md` | Historical migration audit | Keep as an audit record; do not treat as current implementation documentation. |
| `docs/paddle-local-testing.md` | Historical local-testing procedure | Archive or replace with a Dodo testing guide when rollback is no longer supported. |
| `docs/audits/legal-pages-audit.md` | Historical legal-page assessment | Keep as historical audit evidence. |
| `AUDIT_REPORT.md` | Historical system report | Update in a future audit rather than rewriting historic findings. |
| `lib/migration/unified-platform-compliance-checklist.md` | Historical migration checklist | Mark superseded when the Dodo migration is formally closed. |
| `.env.example` | Legacy Paddle environment names retained for rollback context | Remove only after the legacy runtime and deployed fallback configuration are retired. |
| `app/(marketing)/terms/page-v2.tsx` | Legacy, non-canonical legal content | Keep only until legal review approves archival or removal; do not link from active pages. |
| `app/(marketing)/privacy/page-v2.tsx` | Legacy, non-canonical legal content | Keep only until legal review approves archival or removal; do not link from active pages. |
| `app/(marketing)/refund-policy/page-v2.tsx` | Legacy, non-canonical legal content | Keep only until legal review approves archival or removal; do not link from active pages. |

## Environment and Deployment Verification

- [ ] Confirm production has `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_SECRET`, `DODO_PAYMENTS_WEBHOOK_URL`, and `NEXT_PUBLIC_DODO_PAYMENTS_ENVIRONMENT` configured.
- [ ] Confirm Dodo product IDs in `app/api/dodo/checkout/route.ts` match the live Dodo catalog before launch.
- [ ] Confirm Dodo checkout displays its current Buyer Terms and Privacy Policy links and requires its buyer acknowledgement.
- [ ] Test a live-mode checkout, receipt, invoice download, cancellation, failed-payment recovery, and refund-support path with approved test credentials.
- [ ] Remove obsolete Paddle environment secrets from production after rollback approval, then rotate any remaining legacy credentials.
- [ ] Obtain legal approval for the final public policies, including entity details, contacts, governing law, data-retention periods, and consumer-rights language.

## Search Commands for Final Cutover

Use these commands before declaring a full source-code removal complete:

```bash
rg -n -i --glob '!node_modules/**' 'paddle' app components hooks lib scripts docs .env.example package.json
rg -n '@paddle/' package.json package-lock.json
rg -n 'paddle_subscription_id|paddle_customer_id' hooks lib app supabase
```

At final cutover, remove legacy runtime references in one reviewed migration. Do not alter applied database migrations or historical audit records merely to make a text search empty.
