import Link from 'next/link'

import { CookieSettingsButton } from '@/components/cookie-consent/cookie-settings-button'

const FOOTER_LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund', label: 'Refund Policy' },
  { href: '/cookie-policy', label: 'Cookie Policy' },
  { href: '/contact', label: 'Contact' },
]

export function Footer() {
  return (
    <footer className="prometheus-footer w-full border-t border-white/[0.07] bg-[#05060a] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="max-w-md">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.28em] text-white transition-colors hover:text-white/72"
          >
            Prometheus Studio
          </Link>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Professional video editing and production workspace for filmmakers, motion designers,
            and modern production teams.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/34">
            © 2026 Prometheus Studio. All rights reserved.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/56 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <CookieSettingsButton className="text-sm font-medium text-white/56 transition-colors hover:text-white">
            Cookie Settings
          </CookieSettingsButton>
          <CookieSettingsButton className="text-sm font-medium text-white/56 transition-colors hover:text-white">
            Do Not Sell or Share My Personal Information
          </CookieSettingsButton>
          <a
            href="mailto:support@prometheusstudio.tech"
            className="text-sm font-medium text-white/56 transition-colors hover:text-white"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  )
}
