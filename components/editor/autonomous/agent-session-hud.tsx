'use client'

import { useEffect, useState } from 'react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import { useAutonomousStore } from '@/lib/autonomous-ui/autonomous-store'
import { ACTION_STATUS_LABELS, getReceiptMetrics } from './action-feedback'

export function AgentSessionHud() {
  const actions = useAutonomousStore((store) => store.actions)
  const [editingEnabled, setEditingEnabled] = useState(false)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => autonomousCoordinator.subscribe((next) => setEditingEnabled(next.isTakeover)), [])
  if (!editingEnabled && actions.length === 0) return null
  const running = actions.filter((action) => action.status === 'running')
  const displayed = expanded ? [...actions].reverse() : [...actions].reverse().slice(0, 2)
  const latest = actions.at(-1)
  return (
    <aside aria-label="Jarvis edit activity" className="pointer-events-auto fixed bottom-4 right-3 z-[9999] w-[min(340px,calc(100vw-24px))] rounded-lg border border-zinc-600 bg-[#101316] text-zinc-100 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:right-5 [body:has([data-jarvis-conversation])_&]:hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <p className="text-xs font-medium">{running.length ? 'Jarvis is editing' : 'Jarvis edit activity'}</p>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-9 rounded px-2 text-xs text-cyan-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">{expanded ? 'Show less' : `History (${actions.length})`}</button>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{latest ? `${ACTION_STATUS_LABELS[latest.status]}: ${latest.label}. ${latest.summary}` : 'Jarvis editing access enabled'}</p>
      <ol aria-label="Recent edit results" className="max-h-[min(40dvh,320px)] overflow-y-auto overscroll-contain border-t border-zinc-700 px-3">
        {displayed.map((action) => <li key={action.id} data-action-status={action.status} className="border-b border-zinc-700 py-3 last:border-0">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 break-words text-xs font-medium leading-5">{action.label}</p>
            <span className={`shrink-0 text-[11px] leading-5 ${action.status === 'failed' ? 'text-rose-200' : action.status === 'partial' || action.status === 'cancelled' ? 'text-amber-200' : 'text-cyan-200'}`}>{ACTION_STATUS_LABELS[action.status]}</span>
          </div>
          {action.targetLabel && <p className="mt-0.5 break-words text-xs text-zinc-300">{action.targetLabel}</p>}
          {action.summary && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-200">{action.summary}</p>}
          {getReceiptMetrics(action) && <p className="mt-1 text-xs tabular-nums text-zinc-300">{getReceiptMetrics(action)}</p>}
        </li>)}
      </ol>
      {editingEnabled && <div className="flex items-center justify-between gap-2 border-t border-zinc-700 px-3 py-2">
        <span className="text-[11px] text-zinc-300">Esc to stop editing</span>
        <button type="button" onClick={() => autonomousCoordinator.endTakeover()} className="min-h-10 rounded border border-zinc-500 px-3 text-xs hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">Stop editing</button>
      </div>}
    </aside>
  )
}
