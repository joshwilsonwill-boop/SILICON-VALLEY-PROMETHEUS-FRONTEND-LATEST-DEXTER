import Link from 'next/link'

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <Link href="/" aria-label="Prometheus Studio home" className={`inline-flex items-center gap-2 text-base font-semibold tracking-tight ${className}`}>
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-[var(--theme-accent)] font-serif text-lg text-black">P</span>
      <span>Prometheus Studio</span>
    </Link>
  )
}
