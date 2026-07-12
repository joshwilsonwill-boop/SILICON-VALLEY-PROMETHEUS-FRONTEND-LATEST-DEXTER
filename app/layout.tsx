import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Inter, Geist, JetBrains_Mono, Playfair_Display, Space_Grotesk } from 'next/font/google'
import localFont from 'next/font/local'
import { CustomCursor } from '@/components/ui/custom-cursor'
import { RootSmoothScroll } from '@/components/root-smooth-scroll'
import { RootClientEffects } from '@/components/root-client-effects'
import { AuthProvider } from '@/components/auth/auth-provider'
import { ReactQueryProvider } from '@/components/ReactQueryProvider'
import { RootLayoutFrame } from '@/components/root-layout-frame'
import { LoadingProvider } from '@/contexts/LoadingContext'
import './globals.css'
import './premium-vignette.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
  preload: false,
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

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  preload: false,
})

const vogueDisplay = localFont({
  src: '../Vogue.ttf',
  variable: '--font-vogue-display',
  display: 'swap',
})

const migraDisplay = localFont({
  src: [
    {
      path: '../public/fonts/migra/Migra-Extralight.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../public/fonts/migra/Migra-Extrabold.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/migra/MigraItalic-ExtraboldItalic.woff2',
      weight: '800',
      style: 'italic',
    },
  ],
  variable: '--font-migra',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Prometheus',
  description: 'Prometheus Studio is a professional video editing and production workspace for filmmakers.',
  generator: 'Prometheus',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#00f0ff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${geist.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${spaceGrotesk.variable} ${vogueDisplay.variable} ${migraDisplay.variable} bg-background font-sans text-foreground antialiased`}>
        <ReactQueryProvider>
          <LoadingProvider>
            <AuthProvider>
              <RootSmoothScroll />
              <CustomCursor />
              <div className="relative z-10">
                <RootLayoutFrame>{children}</RootLayoutFrame>
              </div>
              <RootClientEffects />
              <Analytics />
              <SpeedInsights />
            </AuthProvider>
          </LoadingProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
