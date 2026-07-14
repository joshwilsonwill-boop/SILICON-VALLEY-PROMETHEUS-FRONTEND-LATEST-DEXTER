import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const dashboard = read('components/billing/billing-dashboard.tsx')
const checkoutModal = read('components/billing/dodo-checkout-modal.tsx')
const checkoutButton = read('components/billing/dodo-checkout-button.tsx')
const pricingPlans = read('components/premium-pricing-plans.tsx')

assert.match(dashboard, /Account Overview/, 'Billing dashboard must consolidate status and usage into Account Overview.')
assert.match(dashboard, /grid-cols-2[\s\S]*sm:grid-cols-3[\s\S]*lg:grid-cols-4/, 'Account Overview must use compact responsive metric tiles.')
assert.doesNotMatch(dashboard, /AI Generation Credits/, 'Standalone oversized credits card must be removed.')
assert.match(dashboard, /handleAddPaymentMethod/, 'Payment-method action handler must remain intact.')
assert.match(dashboard, /handleCancelSubscription/, 'Cancellation handler must remain intact.')
assert.match(dashboard, /setIsBillingHistoryOpen\(true\)/, 'Billing-history action must remain available.')
assert.match(dashboard, /featured=\{plan.featured\}/, 'Checkout CTA must receive the recommended-plan visual state.')

assert.match(checkoutModal, /bg-black\/60/, 'Checkout modal overlay must use the premium dark backdrop.')
assert.match(checkoutModal, /backdrop-blur-\[40px\]/, 'Checkout modal must use glass blur.')
assert.match(checkoutModal, /rounded-3xl/, 'Checkout modal must use the premium radius.')
assert.match(checkoutModal, /bg-\[#0f0f1a\]\/80/, 'Checkout modal must use the premium glass surface.')
assert.match(checkoutModal, /bg-white[\s\S]{0,100}text-black/, 'Checkout primary action must be high contrast.')
assert.match(checkoutModal, /rounded-2xl/, 'Checkout primary action must be generously rounded.')

assert.match(checkoutButton, /featured\?: boolean/, 'Checkout CTA must support featured plan styling.')
assert.match(checkoutButton, /bg-white text-black/, 'Standard checkout CTA must be high contrast.')
assert.match(checkoutButton, /bg-\[linear-gradient/, 'Featured checkout CTA must have a premium gradient treatment.')
assert.match(pricingPlans, /shadow-\[0_0_30px_rgba\(99,102,241,0.24\)\]/, 'Recommended plan badge must retain a subtle glow.')

console.log('billing premium UI regression checks passed')
