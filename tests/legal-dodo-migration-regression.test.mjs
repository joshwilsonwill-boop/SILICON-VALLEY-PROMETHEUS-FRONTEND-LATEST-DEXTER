import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const terms = read('TERMS_OF_SERVICE.md')
const privacy = read('PRIVACY_POLICY.md')
const refund = read('REFUND_POLICY.md')
const checklist = read('PADDLE_CLEANUP_CHECKLIST.md')
const checkoutModal = read('components/billing/dodo-checkout-modal.tsx')

for (const [name, document] of [
  ['Terms of Service', terms],
  ['Privacy Policy', privacy],
  ['Refund Policy', refund],
]) {
  assert.match(document, /\*\*Last Updated:\*\* 14 July 2026/, `${name} must expose the approved Last Updated date.`)
}

assert.doesNotMatch(terms, /Paddle/i, 'The new Terms must not reference Paddle.')
assert.doesNotMatch(privacy, /Paddle/i, 'The new Privacy Policy must not reference Paddle.')
assert.doesNotMatch(refund, /Paddle/i, 'The new Refund Policy must not reference Paddle.')
assert.match(terms, /Dodo Payments.*Merchant of Record|Merchant of Record.*Dodo Payments/s, 'Terms must identify Dodo Payments as Merchant of Record.')
assert.match(privacy, /independent controller/i, 'Privacy Policy must identify Dodo as an independent controller.')
assert.match(refund, /7 days/i, 'Refund Policy must state the support-review window.')
assert.match(terms, /sexually suggestive/i, 'Terms must prohibit suggestive adult content.')
assert.match(terms, /deepfakes|deceptive deepfakes/i, 'Terms must prohibit deceptive synthetic media.')
assert.match(terms, /laws of England and Wales/, 'Terms must use England and Wales governing law.')
assert.match(terms, /London Court of International Arbitration \(LCIA\)/, 'Terms must require LCIA arbitration.')
assert.match(terms, /seat of arbitration shall be London, England/, 'Terms must identify the London seat.')
assert.doesNotMatch(terms, /Federal Republic of Nigeria|courts of competent jurisdiction in Nigeria/, 'Terms must not retain Nigerian governing-law wording.')
assert.match(privacy, /\[TBD\] To be appointed when the GDPR threshold is met or the first EU user is onboarded\./, 'Privacy Policy must preserve the explicit DPO appointment status.')
assert.match(privacy, /UK Information Commissioner(?:&apos;|'|’)s Office \(ICO\)/, 'Privacy Policy must list the ICO.')
assert.match(privacy, /Nigerian Data Protection Bureau \(NDPB\)/, 'Privacy Policy must list the NDPB.')
assert.match(terms, /support@prometheusstudio\.tech/, 'Terms must use the supplied support email.')
assert.match(privacy, /support@prometheusstudio\.tech/, 'Privacy Policy must use the supplied privacy email.')
assert.match(refund, /support@prometheusstudio\.tech/, 'Refund Policy must use the supplied support email.')
for (const document of [terms, privacy, refund]) {
  assert.doesNotMatch(document, /\[(?!TBD\])[^\]]+\]/, 'Policy documents must not retain generic bracketed placeholders.')
}

for (const relativePath of ['app/terms/page.tsx', 'app/privacy/page.tsx', 'app/refund/page.tsx', 'app/contact/page.tsx']) {
  assert.doesNotMatch(read(relativePath), /Paddle/i, `${relativePath} must not present Paddle on an active customer surface.`)
}

assert.match(checkoutModal, /hasAcceptedPolicies/, 'Checkout must track policy acknowledgment.')
assert.match(checkoutModal, /href="\/terms"/, 'Checkout must link the Terms.')
assert.match(checkoutModal, /href="\/privacy"/, 'Checkout must link the Privacy Policy.')
assert.match(checkoutModal, /href="\/refund"/, 'Checkout must link the Refund Policy.')
assert.match(checkoutModal, /disabled=\{state === 'loading' \|\| !hasAcceptedPolicies\}/, 'Checkout must require acknowledgment before proceeding.')
assert.match(checklist, /Retained Legacy Runtime/, 'Checklist must identify retained legacy code.')

console.log('legal Dodo migration regression checks passed')
