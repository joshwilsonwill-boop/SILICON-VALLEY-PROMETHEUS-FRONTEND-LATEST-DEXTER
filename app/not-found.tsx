import Link from 'next/link'
import { BrandWordmark } from '@/components/brand-wordmark'
import { Footer } from '@/components/Footer'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="mx-auto max-w-7xl px-6 py-5"><BrandWordmark /></div>
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="font-mono text-[var(--theme-accent)]">404 · Page not found</p>
        <h1 className="mt-5 text-5xl leading-tight">This cut didn&apos;t make it.</h1>
        <p className="mt-6 text-white/70">The page may have moved, or the address may be incorrect. Find your next starting point below.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/" className={buttonVariants()}>Back to Studio</Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'secondary' })}>View pricing</Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
