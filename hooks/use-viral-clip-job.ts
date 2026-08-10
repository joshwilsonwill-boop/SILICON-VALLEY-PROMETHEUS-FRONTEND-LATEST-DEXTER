'use client'

import * as React from 'react'

import {
  checkBackendHealth,
  createViralClipJob,
  getViralClipJobResult,
  getViralClipJobStatus,
} from '@/lib/api/media-jobs'
import {modalCore} from '@/lib/api/modal-core'
import {
  buildFallbackViralClipResult,
  normalizeViralClipSelectedClip,
  planModalTypographyForViralClips,
} from '@/lib/editor/modal-viral-clip-workflow'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'
import type {
  BackendHealthSnapshot,
  ViralClipJobLifecycle,
  ViralClipJobRequest,
  ViralClipJobResultResponse,
  ViralClipJobStage,
  ViralClipJobStatusResponse,
  ViralClipSelectedClip,
} from '@/lib/types'

const VIRAL_CLIP_JOB_STORAGE_KEY = 'prometheus.editor.viral-clip-jobs.v1'
const POLL_INTERVAL_MS = 1800
const RETRY_INTERVAL_MS = 2400

const VALID_STAGES = new Set<ViralClipJobStage>([
  'queued',
  'transcribing',
  'segmenting',
  'heuristic_scoring',
  'llm_scoring',
  'ranking',
  'completed',
  'failed',
])

interface ViralClipJobSubmissionOptions {
  sourceVideoFile?: File | null
  assetFiles?: File[]
}

interface ViralClipJobSessionState {
  lifecycle: ViralClipJobLifecycle
  jobId: string | null
  request: ViralClipJobRequest | null
  backendStage: ViralClipJobStage | null
  backendStatus: string | null
  progressPercent: number | null
  warnings: string[]
  statusMessage: string | null
  errorMessage: string | null
  resultError: string | null
  result: ViralClipJobResultResponse | null
  selectedClips: ViralClipSelectedClip[]
  startedAt: string | null
  completedAt: string | null
  lastUpdatedAt: string | null
}

interface PersistedViralClipJobSession extends ViralClipJobSessionState {
  projectId: string
  videoId: string
  savedAt: string
}

interface UseViralClipJobArgs {
  projectId: string | null
  videoId: string | null
}

interface ViralClipStageCopy {
  label: string
  detail: string
}

const STAGE_COPY: Record<ViralClipJobStage, ViralClipStageCopy> = {
  queued: {
    label: 'Queued',
    detail: 'Job accepted and waiting for the backend to start.',
  },
  transcribing: {
    label: 'Transcribing',
    detail: 'Backend is reading transcript context and spoken cues.',
  },
  segmenting: {
    label: 'Segmenting',
    detail: 'Backend is splitting the source into candidate moments.',
  },
  heuristic_scoring: {
    label: 'Heuristic scoring',
    detail: 'Backend is applying first-pass clip heuristics.',
  },
  llm_scoring: {
    label: 'LLM scoring',
    detail: 'Backend is refining the shortlist with model reasoning.',
  },
  ranking: {
    label: 'Ranking',
    detail: 'Backend is ordering the strongest viral matches.',
  },
  completed: {
    label: 'Completed',
    detail: 'Final selected clips are ready to render.',
  },
  failed: {
    label: 'Failed',
    detail: 'The backend reported a failure for this job.',
  },
}

function createInitialSessionState(): ViralClipJobSessionState {
  return {
    lifecycle: 'idle',
    jobId: null,
    request: null,
    backendStage: null,
    backendStatus: null,
    progressPercent: null,
    warnings: [],
    statusMessage: null,
    errorMessage: null,
    resultError: null,
    result: null,
    selectedClips: [],
    startedAt: null,
    completedAt: null,
    lastUpdatedAt: null,
  }
}

function nowIso() {
  return new Date().toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readSessionMap() {
  return readLocalStorageJSON<Record<string, PersistedViralClipJobSession>>(VIRAL_CLIP_JOB_STORAGE_KEY) ?? {}
}

function writeSessionMap(map: Record<string, PersistedViralClipJobSession>) {
  writeLocalStorageJSON(VIRAL_CLIP_JOB_STORAGE_KEY, map)
}

function sessionKey(projectId: string, videoId: string) {
  return `${projectId}:${videoId}`
}

function normalizeStage(value: unknown): ViralClipJobStage | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (VALID_STAGES.has(normalized as ViralClipJobStage)) return normalized as ViralClipJobStage
  if (normalized.includes('transcrib')) return 'transcribing'
  if (normalized.includes('segment')) return 'segmenting'
  if (normalized.includes('heuristic')) return 'heuristic_scoring'
  if (normalized.includes('llm')) return 'llm_scoring'
  if (normalized.includes('rank')) return 'ranking'
  if (normalized.includes('complete') || normalized.includes('ready') || normalized.includes('done')) return 'completed'
  if (normalized.includes('fail') || normalized.includes('error')) return 'failed'
  if (normalized.includes('queue') || normalized.includes('pend') || normalized.includes('run')) return 'queued'
  return null
}

function normalizeProgressPercent(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 1 && value >= 0) return Math.round(value * 100)
    if (value >= 0 && value <= 100) return Math.round(value)
  }

  if (isRecord(value)) {
    const nestedPercent = value.percent
    if (typeof nestedPercent === 'number' && Number.isFinite(nestedPercent)) {
      return normalizeProgressPercent(nestedPercent)
    }
  }

  return null
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()]
  if (!Array.isArray(value)) return []

  const result: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim().length > 0) {
      result.push(item.trim())
      continue
    }

    if (Array.isArray(item)) {
      for (const nestedItem of item) {
        if (typeof nestedItem === 'string' && nestedItem.trim().length > 0) {
          result.push(nestedItem.trim())
        }
      }
    }
  }

  return result
}

function normalizeWarnings(status: ViralClipJobStatusResponse): string[] {
  const warnings = [...toStringArray(status.warnings), ...toStringArray(status.warning)]
  return Array.from(new Set(warnings)).slice(0, 12)
}

function pickFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

function normalizeSelectedClips(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => normalizeViralClipSelectedClip(item, index))
}

function normalizeJobStatus(payload: ViralClipJobStatusResponse) {
  const stage = normalizeStage(payload.current_stage ?? payload.stage ?? payload.status)
  const progressPercent = normalizeProgressPercent(payload.progress)
  const warnings = normalizeWarnings(payload)
  const status = typeof payload.status === 'string' ? payload.status.trim().toLowerCase() : ''
  const backendStatus = status || null
  const statusMessage = pickFirstString(payload as Record<string, unknown>, ['message', 'status_message']) ?? null
  const errorMessage = pickFirstString(payload as Record<string, unknown>, ['error_message', 'error']) ?? null

  return {
    stage,
    progressPercent,
    warnings,
    backendStatus,
    statusMessage,
    errorMessage,
    isFailed: stage === 'failed' || status === 'failed',
    isCompleted: stage === 'completed' || status === 'completed',
  }
}

async function pollBackendHealth() {
  const snapshot = await checkBackendHealth()
  return snapshot
}

export function useViralClipJob({ projectId, videoId }: UseViralClipJobArgs) {
  const [health, setHealth] = React.useState<BackendHealthSnapshot>({
    reachable: false,
    status: null,
    message: 'Checking backend availability...',
  })
  const [session, setSession] = React.useState<ViralClipJobSessionState>(createInitialSessionState)
  const sessionRef = React.useRef(session)
  const pollTimerRef = React.useRef<number | null>(null)
  const pollAbortRef = React.useRef<AbortController | null>(null)
  const pollStatusRef = React.useRef<(jobId: string) => void>(() => {})
  const mountedRef = React.useRef(false)
  const activeSessionKeyRef = React.useRef<string | null>(null)

  const canTrackSession = Boolean(projectId && videoId)

  const clearPolling = React.useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (pollAbortRef.current) {
      pollAbortRef.current.abort()
      pollAbortRef.current = null
    }
  }, [])

  const setSessionState = React.useCallback(
    (updater: React.SetStateAction<ViralClipJobSessionState>) => {
      setSession((current) => {
        const next = typeof updater === 'function' ? (updater as (value: ViralClipJobSessionState) => ViralClipJobSessionState)(current) : updater
        sessionRef.current = next
        return next
      })
    },
    [],
  )

  const persistSession = React.useCallback(
    (nextSession: ViralClipJobSessionState) => {
      if (!projectId || !videoId) return

      const key = sessionKey(projectId, videoId)
      const sessions = readSessionMap()

      if (nextSession.lifecycle === 'idle' && !nextSession.jobId) {
        if (sessions[key]) {
          delete sessions[key]
          writeSessionMap(sessions)
        }
        return
      }

      sessions[key] = {
        ...nextSession,
        projectId,
        videoId,
        savedAt: nowIso(),
      }
      writeSessionMap(sessions)
    },
    [projectId, videoId],
  )

  const schedulePoll = React.useCallback(
    (jobId: string, delayMs = POLL_INTERVAL_MS) => {
      clearPolling()
      pollTimerRef.current = window.setTimeout(() => {
        void pollStatusRef.current(jobId)
      }, delayMs)
    },
    [clearPolling],
  )

  const finalizeStatusState = React.useCallback(
    (jobId: string, statusPayload: ViralClipJobStatusResponse) => {
      const normalized = normalizeJobStatus(statusPayload)
      const updatedAt = nowIso()

      setSessionState((current) => {
        const next: ViralClipJobSessionState = {
          ...current,
          jobId,
          backendStage: normalized.stage,
          backendStatus: normalized.backendStatus,
          progressPercent: normalized.progressPercent,
          warnings: normalized.warnings,
          statusMessage: normalized.statusMessage,
          errorMessage: normalized.errorMessage,
          lifecycle: normalized.isFailed
            ? 'failed'
            : normalized.isCompleted
              ? 'completed'
              : current.lifecycle === 'submitting'
                ? 'submitted'
                : 'polling',
          lastUpdatedAt: updatedAt,
          startedAt: current.startedAt ?? updatedAt,
          completedAt: normalized.isCompleted || normalized.isFailed ? updatedAt : current.completedAt,
        }
        persistSession(next)
        return next
      })

      return normalized
    },
    [persistSession, setSessionState],
  )

  const fetchAndApplyResult = React.useCallback(
    async (jobId: string) => {
      const rawResponse = await getViralClipJobResult(jobId)
      const activeRequest = sessionRef.current.request
      const response = activeRequest
        ? await planModalTypographyForViralClips({
            result: rawResponse,
            request: activeRequest,
            previewTextChunks: (payload) => modalCore.previewTextChunks(payload),
          })
        : rawResponse
      const selectedClips = normalizeSelectedClips(response.selected_clips)
      const updatedAt = nowIso()

      setSessionState((current) => {
        const next: ViralClipJobSessionState = {
          ...current,
          lifecycle: 'completed',
          result: response,
          selectedClips,
          resultError: selectedClips.length > 0 ? null : 'The backend completed the job, but no selected clips were returned.',
          errorMessage: current.errorMessage,
          completedAt: current.completedAt ?? updatedAt,
          lastUpdatedAt: updatedAt,
        }
        persistSession(next)
        return next
      })

      return response
    },
    [persistSession, setSessionState],
  )

  const pollStatus = React.useCallback(
    async (jobId: string) => {
      if (!mountedRef.current) return

      if (pollAbortRef.current) {
        pollAbortRef.current.abort()
      }

      const abortController = new AbortController()
      pollAbortRef.current = abortController

      setSessionState((current) => ({
        ...current,
        lifecycle: current.lifecycle === 'submitting' ? 'submitted' : 'polling',
        jobId,
        lastUpdatedAt: nowIso(),
      }))

      try {
        const statusPayload = await getViralClipJobStatus(jobId)
        if (!mountedRef.current || abortController.signal.aborted) return

        const normalized = finalizeStatusState(jobId, statusPayload)

        if (normalized.isFailed) {
          clearPolling()
          return
        }

        if (normalized.isCompleted) {
          clearPolling()

          try {
            await fetchAndApplyResult(jobId)
          } catch (error) {
            if (!mountedRef.current) return
            setSessionState((current) => {
              const next: ViralClipJobSessionState = {
                ...current,
                lifecycle: 'completed',
                resultError:
                  error instanceof Error
                    ? error.message
                    : 'The backend completed the job, but the result payload could not be loaded.',
                lastUpdatedAt: nowIso(),
              }
              persistSession(next)
              return next
            })
          }
          return
        }

        schedulePoll(jobId)
      } catch (error) {
        if (!mountedRef.current || abortController.signal.aborted) return

        const nextMessage = error instanceof Error ? error.message : 'Unable to reach the backend job status endpoint.'
        setSessionState((current) => {
          const next: ViralClipJobSessionState = {
            ...current,
            lifecycle: 'polling',
            errorMessage: nextMessage,
            lastUpdatedAt: nowIso(),
          }
          persistSession(next)
          return next
        })

        schedulePoll(jobId, RETRY_INTERVAL_MS)
      }
    },
    [clearPolling, fetchAndApplyResult, finalizeStatusState, persistSession, schedulePoll, setSessionState],
  )

  React.useEffect(() => {
    pollStatusRef.current = pollStatus
  }, [pollStatus])

  const refreshBackendHealth = React.useCallback(async () => {
    const snapshot = await pollBackendHealth()
    if (!mountedRef.current) return snapshot
    setHealth(snapshot)
    return snapshot
  }, [])

  const loadPersistedSession = React.useCallback(() => {
    if (!projectId || !videoId) return null

    const key = sessionKey(projectId, videoId)
    const sessions = readSessionMap()
    const persisted = sessions[key] ?? null

    if (!persisted) {
      setSession(createInitialSessionState())
      sessionRef.current = createInitialSessionState()
      activeSessionKeyRef.current = key
      return null
    }

    const hydrated: ViralClipJobSessionState = {
      lifecycle: persisted.lifecycle ?? 'idle',
      jobId: persisted.jobId ?? null,
      request: persisted.request ?? null,
      backendStage: normalizeStage(persisted.backendStage),
      backendStatus: persisted.backendStatus ?? null,
      progressPercent:
        typeof persisted.progressPercent === 'number' && Number.isFinite(persisted.progressPercent)
          ? persisted.progressPercent
          : null,
      warnings: Array.isArray(persisted.warnings) ? persisted.warnings.filter((value): value is string => typeof value === 'string') : [],
      statusMessage: persisted.statusMessage ?? null,
      errorMessage: persisted.errorMessage ?? null,
      resultError: persisted.resultError ?? null,
      result: persisted.result ?? null,
      selectedClips: Array.isArray(persisted.selectedClips) ? persisted.selectedClips : [],
      startedAt: persisted.startedAt ?? null,
      completedAt: persisted.completedAt ?? null,
      lastUpdatedAt: persisted.lastUpdatedAt ?? null,
    }

    setSession(hydrated)
    sessionRef.current = hydrated
    activeSessionKeyRef.current = key
    return hydrated
  }, [projectId, videoId])

  const startJob = React.useCallback(
    async (payload: ViralClipJobRequest, options: ViralClipJobSubmissionOptions = {}) => {
      if (!projectId || !videoId) {
        throw new Error('Cannot launch a viral clip job without a project id and source video id.')
      }

      const nextRequest: ViralClipJobRequest = {
        ...payload,
        projectId,
        videoId,
      }

      clearPolling()
      const startedAt = nowIso()
      const optimisticSession: ViralClipJobSessionState = {
        ...createInitialSessionState(),
        lifecycle: 'submitting',
        request: nextRequest,
        startedAt,
        lastUpdatedAt: startedAt,
      }

      setSession(optimisticSession)
      sessionRef.current = optimisticSession

      try {
        const creationResponse = await createViralClipJob(nextRequest, {
          sourceVideoFile: options.sourceVideoFile ?? null,
          assetFiles: options.assetFiles ?? [],
        })
        const jobId = creationResponse.jobId
        const normalizedStage = normalizeStage(creationResponse.current_stage ?? creationResponse.stage ?? creationResponse.status)
        const updatedAt = nowIso()
        const submittedSession: ViralClipJobSessionState = {
          ...optimisticSession,
          lifecycle: 'submitted',
          jobId,
          backendStage: normalizedStage ?? 'queued',
          backendStatus: typeof creationResponse.status === 'string' ? creationResponse.status : 'queued',
          statusMessage: typeof creationResponse.message === 'string' ? creationResponse.message : null,
          warnings: Array.from(
            new Set([
              ...optimisticSession.warnings,
              ...toStringArray(creationResponse.warnings),
              ...toStringArray(creationResponse.warning),
            ]),
          ).slice(0, 12),
          errorMessage: null,
          resultError: null,
          lastUpdatedAt: updatedAt,
        }

        setSession(submittedSession)
        sessionRef.current = submittedSession
        persistSession(submittedSession)
        schedulePoll(jobId, 120)
        return jobId
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to create the viral clip job right now.'

        if ((nextRequest.providedTranscript?.length ?? 0) > 0) {
          try {
            const fallbackResponse = await planModalTypographyForViralClips({
              result: buildFallbackViralClipResult(nextRequest),
              request: nextRequest,
              previewTextChunks: (payload) => modalCore.previewTextChunks(payload),
            })
            const selectedClips = normalizeSelectedClips(fallbackResponse.selected_clips)
            if (!selectedClips.some((clip) => Boolean(clip.modal_text_chunk_plan))) {
              throw new Error('Modal did not return a usable typography plan for the resilience candidates.')
            }

            const completedAt = nowIso()
            const fallbackSession: ViralClipJobSessionState = {
              ...optimisticSession,
              lifecycle: 'completed',
              jobId: `modal-resilience-${Date.now()}`,
              backendStage: 'completed',
              backendStatus: 'completed_with_resilience_fallback',
              progressPercent: 100,
              warnings: [`Primary viral selection unavailable: ${message}`, 'Used local highlight timing and Modal typography planning.'],
              statusMessage: 'Modal typography completed on deterministic resilience candidates.',
              errorMessage: null,
              resultError: null,
              result: fallbackResponse,
              selectedClips,
              completedAt,
              lastUpdatedAt: completedAt,
            }
            setSession(fallbackSession)
            sessionRef.current = fallbackSession
            persistSession(fallbackSession)
            return fallbackSession.jobId!
          } catch (fallbackError) {
            const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Modal resilience planning failed.'
            const combinedMessage = `${message} ${fallbackMessage}`.trim()
            const failedSession: ViralClipJobSessionState = {
              ...optimisticSession,
              lifecycle: 'failed',
              errorMessage: combinedMessage,
              lastUpdatedAt: nowIso(),
            }
            setSession(failedSession)
            sessionRef.current = failedSession
            persistSession(failedSession)
            throw new Error(combinedMessage)
          }
        }

        const failedSession: ViralClipJobSessionState = {
          ...optimisticSession,
          lifecycle: 'failed',
          errorMessage: message,
          lastUpdatedAt: nowIso(),
        }
        setSession(failedSession)
        sessionRef.current = failedSession
        persistSession(failedSession)
        throw new Error(message)
      }
    },
    [clearPolling, persistSession, projectId, schedulePoll, videoId],
  )

  const refreshResult = React.useCallback(async () => {
    const jobId = sessionRef.current.jobId
    if (!jobId) {
      throw new Error('No viral clip job is currently available to refresh.')
    }

    try {
      const response = await fetchAndApplyResult(jobId)
      return response
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load the viral clip result payload.'
      setSessionState((current) => {
        const next: ViralClipJobSessionState = {
          ...current,
          lifecycle: current.lifecycle === 'failed' ? 'failed' : 'completed',
          resultError: message,
          lastUpdatedAt: nowIso(),
        }
        persistSession(next)
        return next
      })
      return null
    }
  }, [fetchAndApplyResult, persistSession, setSessionState])

  const refreshStatus = React.useCallback(async () => {
    const jobId = sessionRef.current.jobId
    if (!jobId) {
      throw new Error('No viral clip job is currently available to refresh.')
    }

    const statusPayload = await getViralClipJobStatus(jobId)
    finalizeStatusState(jobId, statusPayload)
    return statusPayload
  }, [finalizeStatusState])

  const reset = React.useCallback(() => {
    clearPolling()
    setSession(createInitialSessionState())
    sessionRef.current = createInitialSessionState()

    if (!projectId || !videoId) return
    const key = sessionKey(projectId, videoId)
    const sessions = readSessionMap()
    if (sessions[key]) {
      delete sessions[key]
      writeSessionMap(sessions)
    }
  }, [clearPolling, projectId, videoId])

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearPolling()
    }
  }, [clearPolling])

  React.useEffect(() => {
    void refreshBackendHealth()

    if (!canTrackSession) {
      clearPolling()
      setSession(createInitialSessionState())
      sessionRef.current = createInitialSessionState()
      activeSessionKeyRef.current = null
      return
    }

    const hydrated = loadPersistedSession()

    if (hydrated?.jobId && hydrated.lifecycle !== 'completed' && hydrated.lifecycle !== 'failed') {
      schedulePoll(hydrated.jobId, 0)
      return
    }

    if (hydrated?.jobId && hydrated.lifecycle === 'completed' && !hydrated.result) {
      void refreshResult()
    }
  }, [canTrackSession, clearPolling, loadPersistedSession, refreshBackendHealth, refreshResult, schedulePoll])

  React.useEffect(() => {
    if (!projectId || !videoId) return

    const nextKey = sessionKey(projectId, videoId)
    if (activeSessionKeyRef.current === nextKey) return

    activeSessionKeyRef.current = nextKey
  }, [projectId, videoId])

  React.useEffect(() => {
    if (!projectId || !videoId) return
    if (!mountedRef.current) return

    const nextState = sessionRef.current
    if (!nextState.jobId) return
    if (nextState.lifecycle === 'idle') return

    persistSession(nextState)
  }, [persistSession, projectId, videoId, session])

  const backendStage = session.backendStage
  const currentStageCopy = backendStage ? STAGE_COPY[backendStage] : null

  return {
    health,
    lifecycle: session.lifecycle,
    jobId: session.jobId,
    request: session.request,
    backendStage,
    backendStatus: session.backendStatus,
    stageLabel: currentStageCopy?.label ?? null,
    stageDetail: currentStageCopy?.detail ?? null,
    progressPercent: session.progressPercent,
    warnings: session.warnings,
    statusMessage: session.statusMessage,
    errorMessage: session.errorMessage,
    resultError: session.resultError,
    result: session.result,
    selectedClips: session.selectedClips,
    isPolling: session.lifecycle === 'polling' || session.lifecycle === 'submitted' || session.lifecycle === 'submitting',
    startJob,
    refreshBackendHealth,
    refreshStatus,
    refreshResult,
    reset,
  }
}
