'use client'

const rows = [
  { label: 'Current duration', value: '—' },
  { label: 'Beat markers', value: '—' },
  { label: 'Transcript segments', value: '—' },
]

export function TimelinePanel() {
  return (
    <section className="space-y-3" aria-label="Timeline details">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between rounded-xl border border-prometheus-border-subtle bg-white/[0.025] px-3 py-3">
          <span className="text-sm text-prometheus-text-secondary">{row.label}</span>
          <span className="text-sm font-medium text-prometheus-text-primary">{row.value}</span>
        </div>
      ))}
    </section>
  )
}
