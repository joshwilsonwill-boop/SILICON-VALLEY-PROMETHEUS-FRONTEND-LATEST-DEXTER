'use client'

import { useEditorialTimeline } from '@/hooks/use-editorial-timeline'

export function EditorialSyncStatus() {
  const { status, error, retry } = useEditorialTimeline()
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[10px] text-white/40" role="status" title={error ?? undefined}>
      {status === 'error' ? <><span className="max-w-44 truncate text-amber-200">{error || 'Timeline not saved'}</span><button type="button" onClick={retry} className="rounded border border-white/15 px-1.5 py-0.5 text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Retry</button></> : status === 'saving' ? 'Saving audio…' : status === 'loading' ? 'Syncing audio…' : 'Audio synced'}
    </span>
  )
}
