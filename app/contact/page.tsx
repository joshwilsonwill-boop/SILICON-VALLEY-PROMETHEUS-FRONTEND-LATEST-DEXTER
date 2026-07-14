import type { Metadata } from 'next'

const SUPPORT_PHONE = '+234 813 146 6596'
const WHATSAPP_BUSINESS_PHONE = '+1 680 240 2281'
const REGISTERED_BUSINESS_ADDRESS = 'support@prometheusstudio.tech'

export const metadata: Metadata = {
  title: 'Contact | Prometheus Studio',
  description: 'Contact Prometheus Studio for support, billing, and subscription questions.',
}

export default function ContactPage() {
  return (
    <main className="relative min-h-screen bg-neutral-950 px-6 py-24 text-white md:py-32">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[120px]"
        aria-hidden="true"
      />

      <section className="relative mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">Contact</p>
        <h1 className="mt-6 max-w-2xl text-5xl font-medium leading-none tracking-[-0.06em] sm:text-6xl">
          Contact Prometheus Studio
        </h1>

        <div className="mt-12 space-y-5 text-base leading-8 text-neutral-300">
          <p>Email: support@prometheusstudio.tech</p>
          <p>Phone: {SUPPORT_PHONE}</p>
          <p>Business WhatsApp: {WHATSAPP_BUSINESS_PHONE}</p>
          <p>Official Registered Business Address: {REGISTERED_BUSINESS_ADDRESS}</p>
          <p>Business Hours: Monday–Friday, 9:00 AM–5:00 PM WAT</p>
          <p>
            For billing and subscription support, contact us first or use the Dodo Payments buyer-support
            details in your payment receipt.
          </p>
        </div>
      </section>
    </main>
  )
}
