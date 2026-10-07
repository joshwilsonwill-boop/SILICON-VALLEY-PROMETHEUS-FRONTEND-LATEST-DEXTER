'use client'

import { useEffect, useState } from 'react'
import { Check, CircleAlert, CircleStop, LoaderCircle, Sparkles } from 'lucide-react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import { useAutonomousStore } from '@/lib/autonomous-ui/autonomous-store'
import { ACTION_STATUS_LABELS, getReceiptMetrics } from './action-feedback'

const statusTone = {
  running: 'text-cyan-200',
  succeeded: 'text-emerald-200',
  failed: 'text-rose-200',
  partial: 'text-amber-200',
  cancelled: 'text-zinc-300',
} as const

function StatusMark({ status }: { status: keyof typeof statusTone }) {
  if (status === 'running') return <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
  if (status === 'succeeded') return <Check aria-hidden="true" className="size-3.5" />
  return <CircleAlert aria-hidden="true" className="size-3.5" />
}

export function AgentSessionHud() {
  const actions = useAutonomousStore((store) => store.actions)
  const [editingEnabled, setEditingEnabled] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => autonomousCoordinator.subscribe((next) => setEditingEnabled(next.isTakeover)), [])

  useEffect(() => {
    if (!editingEnabled) return
    const stopOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') autonomousCoordinator.endTakeover()
    }
    window.addEventListener('keydown', stopOnEscape)
    return () => window.removeEventListener('keydown', stopOnEscape)
  }, [editingEnabled])

  if (!editingEnabled && actions.length === 0) return null

  const running = actions.filter((action) => action.status === 'running')
  const currentAction = running.at(-1)
  const latest = actions.at(-1)
  const displayed = expanded ? [...actions].reverse() : currentAction ? [currentAction] : latest ? [latest] : []

  // Dismissed per user request: bottom corner box containing history covers a large chunk of the screen and blocks the enter button
  const isHidden = true
  if (isHidden) return null

  return (
    <aside
      aria-label="Jarvis editing session"
      className="pointer-events-auto fixed bottom-4 right-3 z-[9999] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[10px] border border-white/[0.12] bg-[#0c1014]/[0.97] text-zinc-100 shadow-[0_18px_56px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-xl forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] sm:right-5 [body:has([data-jarvis-conversation])_&]:hidden"
    >
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />

      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-cyan-200/[0.18] bg-cyan-200/[0.06] text-cyan-100">
            <Sparkles aria-hidden="true" className="size-4" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-medium tracking-[0.01em]">Jarvis</h2>
              <span className="h-1 w-1 rounded-full bg-white/25" aria-hidden="true" />
              <p className="truncate text-[11px] text-zinc-300">{editingEnabled ? 'Editing access on' : 'Edit activity'}</p>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-zinc-400">
              {currentAction ? 'Working on your edit' : editingEnabled ? 'Ready for your next instruction' : 'Recent changes in this session'}
            </p>
          </div>
        </div>

        {editingEnabled && (
          <button
            type="button"
            onClick={() => autonomousCoordinator.endTakeover()}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/[0.14] bg-white/[0.045] px-2.5 text-[11px] font-medium text-zinc-200 transition-colors hover:border-rose-200/35 hover:bg-rose-200/[0.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"
          >
            <CircleStop aria-hidden="true" className="size-3.5" strokeWidth={1.7} />
            Stop
          </button>
        )}
      </header>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {currentAction
          ? `In progress: ${currentAction.label}. ${currentAction.targetLabel ?? ''}`
          : latest
            ? `${ACTION_STATUS_LABELS[latest.status]}: ${latest.label}. ${latest.summary}`
            : editingEnabled ? 'Jarvis editing access enabled. Ready for your next instruction.' : 'Jarvis edit activity'}
      </p>

      <section aria-label="Current edit status" className="border-t border-white/[0.08] px-4 py-3">
        {displayed.length > 0 ? displayed.map((action) => (
          <article key={action.id} data-action-status={action.status} className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-[12px] font-medium leading-[1.45] text-zinc-100">{action.label}</p>
              <span className={`inline-flex shrink-0 items-center gap-1.5 pt-px text-[10px] ${statusTone[action.status]}`}>
                <StatusMark status={action.status} />
                {ACTION_STATUS_LABELS[action.status]}
              </span>
            </div>
            {action.targetLabel && <p className="mt-1 text-[11px] text-zinc-400">{action.targetLabel}</p>}
            {action.summary && <p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-[1.55] text-zinc-300">{action.summary}</p>}
            {getReceiptMetrics(action) && <p className="mt-1.5 text-[10px] tabular-nums tracking-[0.02em] text-zinc-400">{getReceiptMetrics(action)}</p>}
          </article>
        )) : (
          <p className="text-[11px] leading-[1.55] text-zinc-300">
            Jarvis can make changes in this project when you give an instruction. You stay in control and can stop at any time.
          </p>
        )}
      </section>

      {actions.length > 0 && (
        <div className="border-t border-white/[0.08] px-4 py-1">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="min-h-9 text-[11px] text-zinc-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"
          >
            {expanded ? 'Hide activity' : `View activity · ${actions.length}`}
          </button>
        </div>
      )}

      {expanded && actions.length > 0 && (
        <ol aria-label="Edit activity history" className="max-h-[min(36dvh,280px)] overflow-y-auto overscroll-contain border-t border-white/[0.08] px-4">
          {[...actions].reverse().map((action) => (
            <li key={action.id} className="border-b border-white/[0.07] py-2.5 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words text-[11px] font-medium leading-4">{action.label}</p>
                <span className={`shrink-0 text-[10px] ${statusTone[action.status]}`}>{ACTION_STATUS_LABELS[action.status]}</span>
              </div>
              {action.targetLabel && <p className="mt-1 text-[10px] text-zinc-400">{action.targetLabel}</p>}
              {action.summary && <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-[1.5] text-zinc-300">{action.summary}</p>}
              {getReceiptMetrics(action) && <p className="mt-1 text-[10px] tabular-nums text-zinc-400">{getReceiptMetrics(action)}</p>}
            </li>
          ))}
        </ol>
      )}

      {editingEnabled && (
        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-2.5">
          <span className="text-[10px] text-zinc-400">Press <kbd className="rounded border border-white/[0.14] bg-white/[0.04] px-1 py-0.5 font-medium text-zinc-200">Esc</kbd> to return control</span>
          <span className="text-[10px] text-emerald-200/80">You can interrupt anytime</span>
        </footer>
      )}
    </aside>
  )
}

