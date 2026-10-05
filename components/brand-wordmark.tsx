import Link from 'next/link'
import Image from 'next/image'

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <Link href="/" aria-label="Prometheus Studio home" className={`inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white ${className}`}>
      <Image src="/branding/prometheus-logo-no-bg.png" width={28} height={38} alt="" className="h-8 w-6 object-contain" priority />
      <span>Prometheus Studio</span>
    </Link>
  )
}
