'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { useVoiceCompanion } from '@/hooks/use-voice-companion'
import { getVoiceCompanionBridge, subscribeVoiceCompanionBridge } from '@/lib/voice-companion/bridge'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import { JarvisConversationPanel } from '@/components/editor/autonomous/jarvis-conversation-panel'

export interface JarvisTopNavFilamentProps { className?: string }

const STATUS_LABELS: Record<string, string> = {
  disconnected: 'Offline', error: 'Connection interrupted', connecting: 'Connecting…',
  listening: 'Listening', speaking: 'Speaking', interrupted: 'Reply interrupted',
}

export function JarvisTopNavFilament({ className }: JarvisTopNavFilamentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const companion = useVoiceCompanion()
  const bridge = useSyncExternalStore(subscribeVoiceCompanionBridge, getVoiceCompanionBridge, getVoiceCompanionBridge)
  const isEditorLinked = Boolean(bridge.contextProvider || bridge.onApplyActions)
  const close = () => { setIsExpanded(false); triggerRef.current?.focus() }
  return (
    <div className={cn('pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center', className)}>
      <button ref={triggerRef} type="button" aria-label="Open Jarvis conversation" aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-b-md border border-t-0 border-zinc-600 bg-[#101316] px-4 text-xs text-zinc-100 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
        <span className="font-medium">Jarvis</span>
        <span className="text-zinc-300">{STATUS_LABELS[companion.status] ?? 'Ready'}</span>
        {companion.connectionNotice && <span className="text-amber-100">Check connection</span>}
      </button>
      {isExpanded && <JarvisConversationPanel
        transcripts={companion.transcripts} status={companion.status}
        connectionNotice={companion.connectionNotice} error={companion.error}
        reconnect={companion.reconnect} replayLastResponse={companion.replayLastResponse}
        canReplayResponse={companion.canReplayResponse} sendTextMessage={companion.sendTextMessage}
        getCapturedAudio={companion.getCapturedAudio}
        onClose={close} isMuted={companion.isMuted} toggleMute={companion.toggleMute}
        disconnect={companion.disconnect} isEditorLinked={isEditorLinked}
        editingEnabled={Boolean(bridge.isTakeoverEnabled)}
        toggleEditing={() => {
          if (!isEditorLinked) return
          if (bridge.onToggleTakeover) bridge.onToggleTakeover()
          else if (bridge.isTakeoverEnabled) autonomousCoordinator.endTakeover()
          else void autonomousCoordinator.executeAutonomousTakeover('Motion')
        }}
      />}
    </div>
  )
}
