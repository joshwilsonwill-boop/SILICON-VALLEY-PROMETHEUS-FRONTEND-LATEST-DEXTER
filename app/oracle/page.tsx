import { Metadata } from 'next'
import { OracleView } from '@/components/oracle'

export const metadata: Metadata = {
  title: 'Prometheus ↔ Oracle Video Pipeline',
  description: 'Autonomous Video Editorial & Generation Pipeline',
}

export default function OraclePage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200">
      <OracleView />
    </main>
  )
}
