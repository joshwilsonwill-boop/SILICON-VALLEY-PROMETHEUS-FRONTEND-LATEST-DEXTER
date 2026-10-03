import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact | Prometheus Studio',
  description: 'Contact Prometheus Studio for product, privacy, billing, and subscription support.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--theme-background)] px-6 py-20 text-white">
      <section className="mx-auto max-w-3xl">
        <h1 className="text-4xl leading-tight sm:text-6xl">Contact Prometheus Studio</h1>
        <div className="mt-10 space-y-5 text-base leading-8 text-white/75">
          <p>For product support, feature requests, privacy inquiries, billing, or subscription questions, email <a className="text-[var(--theme-accent)] underline underline-offset-4" href="mailto:support@prometheusstudio.tech">support@prometheusstudio.tech</a>.</p>
          <p>Include your account email and the steps that led to the issue. For billing questions, include the order or invoice number. Please do not send passwords or payment-card details.</p>
          <section id="feature-request" className="scroll-mt-32">
            <h2 className="text-2xl text-white">Request a feature</h2>
            <p className="mt-3">Email <a className="text-[var(--theme-accent)] underline" href="mailto:support@prometheusstudio.tech?subject=Prometheus%20Studio%20feature%20request">support@prometheusstudio.tech</a> with the subject line &quot;Feature request&quot;. Describe the task you are trying to finish and what would make it easier.</p>
          </section>
          <p>For payment support, you can also use the Dodo Payments buyer-support details in your receipt.</p>
        </div>
      </section>
    </main>
  )
}
