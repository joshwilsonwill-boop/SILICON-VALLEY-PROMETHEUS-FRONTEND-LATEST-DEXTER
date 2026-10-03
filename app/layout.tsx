import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import { RootClientEffects } from '@/components/root-client-effects'
import { AuthProvider } from '@/components/auth/auth-provider'
import { RootLayoutFrame } from '@/components/root-layout-frame'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { CookieConsentBanner } from '@/components/cookie-consent/banner'
import { ConsentGatedAnalytics } from '@/components/cookie-consent/consent-gated-analytics'
import { CookieConsentProvider } from '@/components/cookie-consent/consent-context'
import { JarvisTopNavFilament } from '@/components/navigation/jarvis-top-nav-filament'
import './globals.css'
import './premium-vignette.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  preload: false,
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://prometheusstudio.tech'),
  title: 'Prometheus Studio ? Record once. Publish fast.',
  description: 'Record once. Publish fast. Edit source footage, refine your cut, and prepare delivery in Prometheus Studio.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Prometheus Studio ? Record once. Publish fast.',
    description: 'Your footage, edit, and delivery in one workspace.',
    url: 'https://prometheusstudio.tech',
    siteName: 'Prometheus Studio',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Prometheus Studio ? record once, publish fast' }],
  },
  twitter: { card: 'summary_large_image', title: 'Prometheus Studio ? Record once. Publish fast.', description: 'Your footage, edit, and delivery in one workspace.', images: ['/opengraph-image'] },
  icons: { icon: '/favicon.ico' },
}

export const viewport = { themeColor: '#38BDF8' }

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // A per-request CSP nonce requires Next to render bootstrap scripts per request.
  await headers()

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} bg-background font-sans text-foreground antialiased`}>
        <CookieConsentProvider>
          <LoadingProvider>
            <AuthProvider>
              <JarvisTopNavFilament />
              <div className="relative z-10">
                <RootLayoutFrame>{children}</RootLayoutFrame>
              </div>
              <RootClientEffects />
              <ConsentGatedAnalytics />
              <CookieConsentBanner />
            </AuthProvider>
          </LoadingProvider>
        </CookieConsentProvider>
      </body>
    </html>
  )
}
