'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertOctagon,
  Sparkles,
  Layers,
  FileAudio,
  Scissors,
  TrendingUp,
  Award,
  Radio,
} from 'lucide-react'
import { OracleClient, OracleStage, SessionStatusResponse, OracleEvent } from '@/lib/oracle'

interface StageTrackerProps {
  client: OracleClient
  userToken: string
  sessionId: string
  eventsUrl?: string
  statusUrl?: string
  initialStage?: OracleStage
  onComplete: (status: SessionStatusResponse) => void
  onError?: (err: Error) => void
}

interface StageConfig {
  key: OracleStage
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const STAGES: StageConfig[] = [
  {
    key: 'queued',
    label: 'Queued',
    description: 'Job received by Oracle worker pool',
    icon: Clock,
  },
  {
    key: 'transcribing',
    label: 'Transcribing',
    description: 'Autonomous audio extraction and deep transcription',
    icon: FileAudio,
  },
  {
    key: 'segmenting',
    label: 'Segmenting',
    description: 'Semantic narrative chunking & beat detection',
    icon: Scissors,
  },
  {
    key: 'scoring',
    label: 'Scoring',
    description: 'Viral hook probability & engagement heuristics',
    icon: TrendingUp,
  },
  {
    key: 'ranking',
    label: 'Ranking',
    description: 'Selecting optimal timeline cut according to creative prompt',
    icon: Award,
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Editorial timeline assembled and ready for preview',
    icon: CheckCircle2,
  },
]

export function StageTracker({
  client,
  userToken,
  sessionId,
  eventsUrl,
  statusUrl,
  initialStage = 'queued',
  onComplete,
  onError,
}: StageTrackerProps) {
  const [currentStage, setCurrentStage] = useState<OracleStage>(initialStage)
  const [progress, setProgress] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [eventLog, setEventLog] = useState<{ time: string; text: string }[]>([
    {
      time: new Date().toLocaleTimeString(),
      text: `Pipeline initialized for session ${sessionId}`,
    },
  ])

  useEffect(() => {
    let isSubscribed = true
    const targetEventsUrl = eventsUrl || `/api/session/${sessionId}/events`

    const addLog = (text: string) => {
      setEventLog((prev) => [
        { time: new Date().toLocaleTimeString(), text },
        ...prev.slice(0, 19),
      ])
    }

    const unsub = client.subscribeToEvents(
      targetEventsUrl,
      {
        onEvent: (event: OracleEvent) => {
          if (!isSubscribed) return
          if (event.stage) {
            setCurrentStage(event.stage)
            addLog(`Stage transitioned to: ${event.stage}`)
          }
          if (typeof event.progress === 'number') {
            setProgress(event.progress)
          }
          if (event.message) {
            addLog(event.message)
          }
        },
        onComplete: async () => {
          if (!isSubscribed) return
          setCurrentStage('completed')
          setProgress(100)
          addLog('Session analysis complete!')
          try {
            const finalStatus = await client.getSessionStatus(statusUrl || sessionId, userToken)
            onComplete(finalStatus)
          } catch {
            onComplete({ sessionId, status: 'completed' })
          }
        },
        onError: (err: Error) => {
          if (!isSubscribed) return
          setErrorMessage(err.message)
          addLog(`Error: ${err.message}`)
          onError?.(err)
        },
      },
      {
        token: userToken,
        pollIntervalMs: 2500,
        fallbackToPolling: true,
      },
    )

    return () => {
      isSubscribed = false
      unsub()
    }
  }, [client, sessionId, eventsUrl, statusUrl, userToken, onComplete, onError])

  const getStageIndex = (stage: OracleStage) => {
    if (stage === 'failed') return -1
    return STAGES.findIndex((s) => s.key === stage)
  }

  const currentIdx = getStageIndex(currentStage)

  return (
    <div className="space-y-6">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            {currentStage === 'failed' ? (
              <AlertOctagon className="w-5 h-5 text-rose-400" />
            ) : currentStage === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <>
                <Radio className="w-5 h-5 animate-pulse text-orange-400" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                </span>
              </>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Live Pipeline Execution
            </div>
            <div className="text-sm font-bold text-zinc-100 capitalize">
              {currentStage === 'failed'
                ? 'Processing Failed'
                : `Current Stage: ${currentStage}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500 font-mono">Session ID</div>
          <div className="text-xs text-zinc-300 font-mono">{sessionId}</div>
        </div>
      </div>

      {/* Stage Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {STAGES.map((s, idx) => {
          const Icon = s.icon
          const isPassed = currentIdx > idx || currentStage === 'completed'
          const isCurrent = currentIdx === idx && currentStage !== 'completed'
          const isFailed = currentStage === 'failed' && currentIdx === idx

          return (
            <div
              key={s.key}
              className={`p-4 rounded-xl border transition-all ${
                isPassed
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : isCurrent
                  ? 'border-orange-500/60 bg-orange-500/10 shadow-lg shadow-orange-500/5'
                  : isFailed
                  ? 'border-rose-500/50 bg-rose-500/10'
                  : 'border-zinc-800/80 bg-zinc-950/40 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isPassed
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : isCurrent
                        ? 'text-orange-400 bg-orange-500/20'
                        : isFailed
                        ? 'text-rose-400 bg-rose-500/20'
                        : 'text-zinc-500 bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isPassed
                        ? 'text-emerald-300'
                        : isCurrent
                        ? 'text-orange-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isCurrent && <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />}
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">{s.description}</p>
            </div>
          )
        })}
      </div>

      {/* Error display if failed */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-300 text-xs">
          <AlertOctagon className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-200">Execution Error</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Live SSE / Polling Stream Event Feed */}
      <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>Event Stream Log</span>
          </span>
          <span className="text-[10px] text-zinc-500">Auto-refreshing</span>
        </div>
        <div className="font-mono text-[11px] max-h-36 overflow-y-auto space-y-1 text-zinc-400">
          {eventLog.map((log, i) => (
            <div key={i} className="flex items-start space-x-2">
              <span className="text-zinc-600 flex-shrink-0">[{log.time}]</span>
              <span className="text-zinc-300">{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
