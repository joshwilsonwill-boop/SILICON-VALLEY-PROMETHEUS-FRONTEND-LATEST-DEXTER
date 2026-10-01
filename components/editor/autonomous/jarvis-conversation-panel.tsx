'use client'

import { useEffect, useRef, useState } from 'react'
import { downloadConversationLog } from '@/lib/conversation-log'
import { useAutonomousStore } from '@/lib/autonomous-ui/autonomous-store'
import { ACTION_STATUS_LABELS, getReceiptMetrics } from './action-feedback'

export interface ConversationTurn {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
  status?: 'streaming' | 'complete' | 'interrupted' | 'partial'
}

export interface JarvisConversationPanelProps {
  transcripts: ConversationTurn[]
  status: string
  connectionNotice: string | null
  error: string | null
  canReplayResponse: boolean
  getCapturedAudio?: () => Blob | null
  reconnect: () => Promise<void>
  replayLastResponse: () => Promise<void>
  sendTextMessage: (text: string) => void
  onClose: () => void
  isMuted: boolean
  toggleMute: () => void
  disconnect: () => void
  isEditorLinked: boolean
  editingEnabled: boolean
  toggleEditing: () => void
}

export const TRANSCRIPT_STATUS_LABELS = {
  streaming: 'Receiving reply',
  complete: '',
  interrupted: 'Interrupted · received text kept',
  partial: 'Incomplete · received text kept',
} as const

const controlClass = 'min-h-11 rounded-md border border-zinc-600 px-3 text-xs font-medium text-zinc-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-50'

export function JarvisConversationPanel(props: JarvisConversationPanelProps) {
  const actions = useAutonomousStore((store) => store.actions)
  const [draft, setDraft] = useState('')
  const [replaying, setReplaying] = useState(false)
  const [replayError, setReplayError] = useState<string | null>(null)
  const [audioExportError, setAudioExportError] = useState<string | null>(null)
  const [newMessages, setNewMessages] = useState(false)
  const conversationRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const followLatest = useRef(true)
  const active = !['disconnected', 'error', 'connecting'].includes(props.status)
  const notice = props.connectionNotice || (props.error ? 'The voice connection stopped. Reconnect to continue.' : null)
  const conversationChange = props.transcripts.map((turn) => `${turn.id}:${turn.text.length}:${turn.status}`).join('|')

  useEffect(() => { closeRef.current?.focus() }, [])
  useEffect(() => {
    const region = conversationRef.current
    if (!region) return
    if (followLatest.current) region.scrollTop = region.scrollHeight
    else setNewMessages(true)
  }, [conversationChange])

  const jumpToLatest = () => {
    followLatest.current = true
    setNewMessages(false)
    const region = conversationRef.current
    if (region) region.scrollTop = region.scrollHeight
  }

  const downloadMicrophoneAudio = () => {
    const audio = props.getCapturedAudio?.()
    if (!audio) { setAudioExportError('No microphone audio was captured during this session.'); return }
    setAudioExportError(null)
    const url = URL.createObjectURL(audio)
    const link = document.createElement('a')
    link.href = url
    link.download = 'jarvis-microphone-session.wav'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section data-jarvis-conversation role="dialog" aria-label="Jarvis conversation" aria-modal="false"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); props.onClose() } }}
      className="pointer-events-auto relative mt-2 flex max-h-[calc(100dvh-88px)] w-[calc(100vw-24px)] max-w-[480px] flex-col overflow-hidden rounded-lg border border-zinc-600 bg-[#101316] text-zinc-100 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
      <header className="flex shrink-0 flex-col gap-2 border-b border-zinc-700 px-4 py-3">
        <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-medium">Jarvis</h2><p className="mt-1 text-xs text-zinc-300">Conversation and editing</p></div>
          <button ref={closeRef} type="button" onClick={props.onClose} aria-label="Close Jarvis conversation" className={controlClass}>Close</button></div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!props.transcripts.some((turn) => turn.text.trim())}
            onClick={() => downloadConversationLog(props.transcripts, 'jarvis-voice-session')}
            className={controlClass} aria-label="Download conversation">Download conversation</button>
          {props.getCapturedAudio && <button type="button" onClick={downloadMicrophoneAudio} className={controlClass} aria-label="Download microphone audio">Download mic audio</button>}
        </div>
        {audioExportError && <p role="alert" className="text-xs text-amber-100">{audioExportError}</p>}
      </header>

      {notice && <div role="alert" className="shrink-0 border-b border-zinc-700 bg-amber-200/[0.05] px-4 py-3">
        <p className="text-xs leading-5 text-amber-100">{notice}</p>
        <button type="button" onClick={() => { void props.reconnect() }} disabled={props.status === 'connecting'} className={`${controlClass} mt-2`}>{props.status === 'connecting' ? 'Connecting…' : 'Reconnect'}</button>
      </div>}

      <div ref={conversationRef} role="log" aria-label="Full conversation" aria-live="polite" aria-relevant="additions text" tabIndex={0}
        onScroll={() => {
          const region = conversationRef.current
          if (!region) return
          followLatest.current = region.scrollHeight - region.scrollTop - region.clientHeight < 48
          if (followLatest.current) setNewMessages(false)
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-200">
        {props.transcripts.length ? props.transcripts.map((turn) => <article key={turn.id} data-turn-status={turn.status ?? 'complete'} className="border-b border-zinc-700 py-3 first:pt-0 last:border-0">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className={`text-xs font-medium ${turn.role === 'user' ? 'text-zinc-300' : 'text-cyan-200'}`}>{turn.role === 'user' ? 'You' : 'Jarvis'}</p>
            {turn.status && TRANSCRIPT_STATUS_LABELS[turn.status] && <p className="text-[11px] text-amber-100">{TRANSCRIPT_STATUS_LABELS[turn.status]}</p>}
          </div>
          <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-zinc-100">{turn.text || (turn.status === 'streaming' ? 'Waiting for reply…' : 'No text received.')}</p>
        </article>) : <p className="py-3 text-sm leading-6 text-zinc-300">{props.status === 'connecting' ? 'Connecting to voice…' : active ? 'Speak or type a message to start your conversation.' : 'Connect to speak with Jarvis.'}</p>}
        {actions.length > 0 && <details className="mt-3 border-t border-zinc-600 pt-3">
          <summary className="min-h-11 cursor-pointer text-xs font-medium text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">Edit results ({actions.length})</summary>
          <ol aria-label="Confirmed edit results">{[...actions].reverse().map((action) => <li key={action.id} className="border-b border-zinc-700 py-3 last:border-0">
            <p className="text-xs font-medium">{action.label} · {ACTION_STATUS_LABELS[action.status]}</p>
            {action.targetLabel && <p className="mt-1 break-words text-xs text-zinc-300">{action.targetLabel}</p>}
            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5">{action.summary || 'Waiting for the editor result.'}</p>
            {getReceiptMetrics(action) && <p className="mt-1 text-xs text-zinc-300">{getReceiptMetrics(action)}</p>}
          </li>)}</ol>
        </details>}
      </div>
      {newMessages && <button type="button" onClick={jumpToLatest} className={`${controlClass} mx-4 mb-2 shrink-0`}>Go to latest reply</button>}

      <footer className="shrink-0 border-t border-zinc-700 p-3">
        {props.canReplayResponse && <div className="mb-3">
          <button type="button" disabled={replaying} className={controlClass}
            onClick={async () => {
              setReplaying(true); setReplayError(null)
              try { await props.replayLastResponse() }
              catch { setReplayError('Could not replay the received audio. Your text is still available above.') }
              finally { setReplaying(false) }
            }}>{replaying ? 'Playing received reply…' : 'Replay received reply'}</button>
          <p className="mt-1 text-[11px] leading-4 text-zinc-300">Plays the audio received for the last reply.</p>
        </div>}
        {replayError && <p role="alert" className="mb-2 text-xs text-amber-100">{replayError}</p>}
        <form onSubmit={(event) => {
          event.preventDefault()
          if (!active || !draft.trim()) return
          props.sendTextMessage(draft.trim()); setDraft(''); jumpToLatest()
        }}>
          <label htmlFor="jarvis-message" className="mb-1 block text-xs text-zinc-300">Message Jarvis</label>
          <div className="flex items-center gap-2">
            <input id="jarvis-message" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!active}
              placeholder={active ? 'Describe your next edit' : 'Connect to send a message'}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-zinc-600 bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 disabled:opacity-60" />
            <button type="submit" disabled={!active || !draft.trim()} className={controlClass}>Send</button>
          </div>
        </form>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={props.toggleMute} disabled={!active} aria-pressed={props.isMuted} className={controlClass}>{props.isMuted ? 'Unmute mic' : 'Mute mic'}</button>
          <button type="button" onClick={props.toggleEditing} disabled={!props.isEditorLinked} aria-pressed={props.editingEnabled} className={controlClass}>{props.editingEnabled ? 'Stop editing' : 'Allow edits'}</button>
          <button type="button" disabled={props.status === 'connecting'} onClick={() => {
            if (active) props.disconnect()
            else void props.reconnect()
          }} className={controlClass}>{props.status === 'connecting' ? 'Connecting…' : active ? 'Disconnect' : 'Connect'}</button>
        </div>
      </footer>
    </section>
  )
}
