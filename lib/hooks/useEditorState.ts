'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDurableJob } from '@/hooks/use-durable-job'
import { 
  getProject, 
  getJobStatus, 
  upsertProject, 
} from '@/lib/mock'
import { getRememberedEditorReturnPath, clearPendingEditorNavigation } from '@/lib/editor-navigation'
import { 
  Project, 
  ProcessingJob, 
  ProjectExport, 
  HeaderNavMode, 
  LeftTabKey, 
  BottomMode,
  AnimationPlan,
  CinematicAssetRegistry,
  ViralClipTargetPlatform
} from '@/lib/types'
import type { QueuedPreviewRevisionState, FrameAssistSubmission } from '@/lib/editorial-frame/types'
import { VIRAL_CLIP_PLATFORM_DEFAULT, SHOULD_PREFETCH_EDITOR_SUPPORT_ROUTES } from '@/lib/constants'
import { buildEditDNAProfile } from '@/lib/editorial-frame/edit-dna-router'
import { compileEditBrief } from '@/lib/editorial-frame/edit-brief-compiler'
import { createProcessingJob, startProcessing, setJobAnimationPlan } from '@/lib/mock'

export interface EditorState {
  projectId: string
  project: Project | null
  setProject: React.Dispatch<React.SetStateAction<Project | null>>
  job: ProcessingJob | null
  setJob: React.Dispatch<React.SetStateAction<ProcessingJob | null>>
  currentJobId: string | null
  setCurrentJobId: React.Dispatch<React.SetStateAction<string | null>>
  jobProgress: number
  jobStatus: string | undefined
  dbJob: any
  jobError: string | null
  jobConnectionState: string
  saveStatus: 'saved' | 'saving' | 'error'
  setSaveStatus: React.Dispatch<React.SetStateAction<'saved' | 'saving' | 'error'>>
  isEditorBootReady: boolean
  setIsEditorBootReady: React.Dispatch<React.SetStateAction<boolean>>
  leftTab: LeftTabKey
  setLeftTab: React.Dispatch<React.SetStateAction<LeftTabKey>>
  activeWorkspaceTab: HeaderNavMode
  setActiveWorkspaceTab: React.Dispatch<React.SetStateAction<HeaderNavMode>>
  bottomMode: BottomMode
  setBottomMode: React.Dispatch<React.SetStateAction<BottomMode>>
  isEditingTitle: boolean
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>
  tempTitle: string
  setTempTitle: React.Dispatch<React.SetStateAction<string>>
  latestExport: ProjectExport | null
  setLatestExport: React.Dispatch<React.SetStateAction<ProjectExport | null>>
  isLeftPanelCollapsed: boolean
  setIsLeftPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  isDeferredChromeReady: boolean
  setIsDeferredChromeReady: React.Dispatch<React.SetStateAction<boolean>>
  isAiLampOpen: boolean
  setIsAiLampOpen: React.Dispatch<React.SetStateAction<boolean>>
  isExporting: boolean
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>
  isDownloading: boolean
  setIsDownloading: React.Dispatch<React.SetStateAction<boolean>>
  isDownloadDialogOpen: boolean
  setIsDownloadDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  sourceAssetLabel: string | null
  setSourceAssetLabel: React.Dispatch<React.SetStateAction<string | null>>
  cinematicRegistry: CinematicAssetRegistry | null
  setCinematicRegistry: React.Dispatch<React.SetStateAction<CinematicAssetRegistry | null>>
  viralClipTargetPlatform: ViralClipTargetPlatform
  setViralClipTargetPlatform: React.Dispatch<React.SetStateAction<ViralClipTargetPlatform>>
  titleInputRef: React.RefObject<HTMLInputElement | null>
  chatComposerPortal: HTMLDivElement | null
  setChatComposerPortal: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>
  inspectorViewportRef: React.RefObject<HTMLDivElement | null>
  lastTranscriptSyncTimeRef: React.MutableRefObject<number>
  progressPercent: number
  
  // Chat / Command Overlay
  chatDraft: string
  setChatDraft: React.Dispatch<React.SetStateAction<string>>
  isComposerOpen: boolean
  setIsComposerOpen: React.Dispatch<React.SetStateAction<boolean>>
  isCommandOverlayOpen: boolean
  setIsCommandOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>
  queuedPreviewRevision: QueuedPreviewRevisionState | null
  setQueuedPreviewRevision: React.Dispatch<React.SetStateAction<QueuedPreviewRevisionState | null>>
  pendingReplies: number
  setPendingReplies: React.Dispatch<React.SetStateAction<number>>

  handleWorkspaceTabChange: (name: string) => void
  handleTitleStartEdit: () => void
  handleTitleSave: () => Promise<void>
  handleTitleKeyDown: (e: React.KeyboardEvent) => void
  handleBackNavigation: () => void
  handleAiChatOpen: () => void
  handleAiMusicOpen: () => void
  handleAutoSave: (editorState: any) => Promise<void>
  handleAutoSaveAnimationPlan: (animationPlan: AnimationPlan) => Promise<void>
  handlePrepareExport: () => Promise<void>
  handleComposerSubmit: (submission: FrameAssistSubmission) => Promise<void>
  handleOverlaySubmit: (submission: FrameAssistSubmission) => Promise<void>
  stopPendingReplies: () => void
  clearQueuedPreviewRevision: () => void
}

export function useEditorState(): EditorState {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id

  const [project, setProject] = React.useState<Project | null>(null)
  const [job, setJob] = React.useState<ProcessingJob | null>(null)
  const [currentJobId, setCurrentJobId] = React.useState<string | null>(null)
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'error'>('saved')
  const [isEditorBootReady, setIsEditorBootReady] = React.useState(false)
  const [leftTab, setLeftTab] = React.useState<LeftTabKey>('chat')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = React.useState<HeaderNavMode>('Editor')
  const [bottomMode, setBottomMode] = React.useState<BottomMode>('Original')
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [tempTitle, setTempTitle] = React.useState('')
  const [latestExport, setLatestExport] = React.useState<ProjectExport | null>(null)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = React.useState(false)
  const [isDeferredChromeReady, setIsDeferredChromeReady] = React.useState(false)
  const [isAiLampOpen, setIsAiLampOpen] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false)
  const [sourceAssetLabel, setSourceAssetLabel] = React.useState<string | null>(null)
  const [cinematicRegistry, setCinematicRegistry] = React.useState<CinematicAssetRegistry | null>(null)
  const [viralClipTargetPlatform, setViralClipTargetPlatform] = React.useState<ViralClipTargetPlatform>(VIRAL_CLIP_PLATFORM_DEFAULT)

  // Chat / Command Overlay state
  const [chatDraft, setChatDraft] = React.useState('')
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [isCommandOverlayOpen, setIsCommandOverlayOpen] = React.useState(false)
  const [queuedPreviewRevision, setQueuedPreviewRevision] = React.useState<QueuedPreviewRevisionState | null>(null)
  const [pendingReplies, setPendingReplies] = React.useState(0)

  // Refs and Portals
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const [chatComposerPortal, setChatComposerPortal] = React.useState<HTMLDivElement | null>(null)
  const inspectorViewportRef = React.useRef<HTMLDivElement | null>(null)
  const lastTranscriptSyncTimeRef = React.useRef<number>(0)

  const { 
    processingJob: realTimeJob, 
    progress: jobProgress, 
    status: jobStatus, 
    job: dbJob,
    error: jobError,
    connectionState: jobConnectionState,
  } = useDurableJob(currentJobId)

  // Sync real-time job state
  React.useEffect(() => {
    if (realTimeJob) {
      setJob(realTimeJob)
    }
  }, [realTimeJob])

  // Effects
  React.useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [isEditingTitle])

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input/textarea
      if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        toast.info('Undo triggered')
        // Insert actual undo logic here when backend supports it
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // e.preventDefault() // Optional, prevents default browser back navigation
        toast.info('Delete triggered')
        // Insert asset deletion logic here when backend supports it
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  React.useEffect(() => {
    clearPendingEditorNavigation(`/editor/${projectId}`)
  }, [projectId])

  React.useEffect(() => {
    let active = true
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (res.ok) {
          const { project: apiProject } = await res.json()
          if (active && apiProject) {
            setProject(apiProject)
            upsertProject(apiProject)
          }
        }
      } catch (err) {
        console.error('Failed to fetch project from API:', err)
      }
    }
    fetchProject()
    return () => { active = false }
  }, [projectId])

  React.useEffect(() => {
    const loadLatestExport = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/exports/latest`)
        const data = await res.json()
        if (res.ok && data.export) {
          setLatestExport(data.export)
        }
      } catch (err) {
        console.warn('Failed to load latest export:', err)
      }
    }
    void loadLatestExport()
  }, [projectId])

  React.useLayoutEffect(() => {
    let active = true
    let intervalId: number | null = null

    const syncState = () => {
      if (!active) return

      const nextProject = getProject(projectId)
      const nextJob = getJobStatus(projectId)

      setProject(nextProject)
      
      if (!currentJobId) {
        setJob(nextJob)
      }

      setIsEditorBootReady(true)

      const now = Date.now()
      if (
        nextProject?.sourceAssetId && 
        nextJob?.transcriptStatus && 
        (nextJob.transcriptStatus === 'queued' || nextJob.transcriptStatus === 'transcribing') &&
        now - lastTranscriptSyncTimeRef.current > 6000
      ) {
        lastTranscriptSyncTimeRef.current = now
        void fetch(`/api/assets/${nextProject.sourceAssetId}/transcript/sync`, { method: 'POST' })
          .then(res => res.json())
          .then(data => {
             console.debug('[Editor] Transcript sync result:', data.status)
          })
          .catch(err => console.warn('[Editor] Transcript sync failed:', err))
      }

      if (nextJob?.status === 'completed' && intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    syncState()
    intervalId = window.setInterval(syncState, 900)

    return () => {
      active = false
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [projectId, currentJobId])

  React.useEffect(() => {
    let rafId = 0
    let timeoutId = 0

    rafId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        setIsDeferredChromeReady(true)
      }, 140)
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [])

  React.useEffect(() => {
    let active = true

    void fetch('/api/cinematic/assets', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load cinematic assets (${response.status}).`)
        }
        return (await response.json()) as CinematicAssetRegistry
      })
      .then((registry) => {
        if (!active) return
        setCinematicRegistry(registry)
      })
      .catch(() => {
        if (!active) return
        setCinematicRegistry(null)
      })

    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (!SHOULD_PREFETCH_EDITOR_SUPPORT_ROUTES) return
    void router.prefetch('/projects')
  }, [router])

  // Handlers
  const handleWorkspaceTabChange = React.useCallback((name: string) => {
    if (name !== 'Music' && name !== 'Editor') return
    setActiveWorkspaceTab(name as HeaderNavMode)
    if (name === 'Music') {
      setBottomMode('Music')
    }
  }, [])

  const handleTitleStartEdit = React.useCallback(() => {
    setTempTitle(project?.title || '')
    setIsEditingTitle(true)
  }, [project?.title])

  const handleTitleSave = React.useCallback(async () => {
    if (!project) return
    const nextTitle = tempTitle.trim()
    if (!nextTitle || nextTitle === project.title) {
      setIsEditingTitle(false)
      return
    }

    try {
      setSaveStatus('saving')
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      })

      if (!res.ok) throw new Error('Failed to update title')
      
      const { project: updatedProject } = await res.json()
      setProject(updatedProject)
      upsertProject(updatedProject)
      setSaveStatus('saved')
      toast.success('Project renamed')
    } catch (err) {
      console.error('Title update failed:', err)
      setSaveStatus('error')
      toast.error('Failed to rename project')
    } finally {
      setIsEditingTitle(false)
    }
  }, [project, projectId, tempTitle])

  const handleTitleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setIsEditingTitle(false)
  }, [handleTitleSave])

  const handleBackNavigation = React.useCallback(() => {
    const rememberedPath = getRememberedEditorReturnPath()
    if (rememberedPath && rememberedPath !== `/editor/${projectId}` && !rememberedPath.startsWith('/editor/')) {
      router.push(rememberedPath)
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push('/')
  }, [projectId, router])

  const handleAiChatOpen = React.useCallback(() => {
    setIsAiLampOpen(false)
    setIsLeftPanelCollapsed(false)
    setLeftTab('chat')
    setActiveWorkspaceTab('Editor')
    setBottomMode('Original')
  }, [])

  const handleAiMusicOpen = React.useCallback(() => {
    setIsAiLampOpen(false)
    setActiveWorkspaceTab('Music')
    setBottomMode('Music')
  }, [])

  const handleAutoSave = React.useCallback(async (editorState: any) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorState }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveStatus('error')
    }
  }, [projectId])

  const handleAutoSaveAnimationPlan = React.useCallback(async (animationPlan: AnimationPlan) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animationPlan }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
    } catch (err) {
      console.error('Auto-save animation plan failed:', err)
      setSaveStatus('error')
    }
  }, [projectId])

  const handlePrepareExport = React.useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: 'default', metadata: { source: 'editor_prepare_export' } }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to initialize export')
      setLatestExport(payload.export || null)
      toast.success('Export job queued')
    } catch (err: any) {
      console.error('Export error:', err)
      toast.error('Could not queue export')
    } finally {
      setIsExporting(false)
    }
  }, [projectId, isExporting])

  const handleComposerSubmit = React.useCallback(async (submission: FrameAssistSubmission) => {
    // 1. Instantly clear the draft
    setChatDraft('')
    // 2. Collapse the bubble
    setIsComposerOpen(false)
    // 3. Morph into command overlay
    setIsCommandOverlayOpen(true)
    
    console.log('[Editor] Chat handoff to overlay:', submission)
  }, [])

  const handleOverlaySubmit = React.useCallback(async (submission: FrameAssistSubmission) => {
    // 1. Gracefully close the overlay
    setIsCommandOverlayOpen(false)
    
    setPendingReplies((prev) => prev + 1)
    try {
      const sourceList = job?.input.sources ?? []
      const styleId = submission.revisionRequest.metadata?.styleId ?? 'default'

      const editDNA = buildEditDNAProfile(submission.revisionRequest.metadata)
      const editBrief = compileEditBrief({
        metadata: submission.revisionRequest.metadata,
        editDNA,
        transcriptText: job?.transcriptText,
        transcriptStatus: job?.transcriptStatus,
        videoDurationSeconds: project?.sourceProfile?.inspection.durationSec ?? undefined,
        projectTitle: project?.title,
      })

      const nextJob = createProcessingJob({
        projectId,
        input: {
          prompt: submission.rawText,
          sources: sourceList,
          styleId: styleId,
          metadata: submission.revisionRequest.metadata,
          editDNA,
        },
      })
      
      nextJob.editBrief = editBrief
      nextJob.previewProgressSteps = editBrief.progressSteps

      const startedJob = startProcessing(nextJob)
      setJob(startedJob)

      // 2. Trigger backend to create new Supabase durable job
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type: 'ai_enhancement',
          metadata: {
            input: nextJob.input,
            editBrief: nextJob.editBrief,
            previewProgressSteps: nextJob.previewProgressSteps,
            artifacts: nextJob.artifacts,
            transcriptStatus: nextJob.transcriptStatus,
            transcriptText: nextJob.transcriptText,
          }
        })
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Failed to create durable job')
      }

      // 3. Immediately mount/appear DurableJobProgress by setting currentJobId
      console.log('[Editor] Durable job created:', data.id)
      setCurrentJobId(data.id)
      
      toast.success('Creative direction applied')
    } catch (err: any) {
      console.error('[Editor] Overlay submission failed:', err)
      toast.error('Failed to apply direction')
    } finally {
      setPendingReplies((prev) => Math.max(0, prev - 1))
    }
  }, [projectId, project, job, setCurrentJobId, setJob])

  const stopPendingReplies = React.useCallback(() => {
    setPendingReplies(0)
  }, [])

  const clearQueuedPreviewRevision = React.useCallback(() => {
    setQueuedPreviewRevision(null)
  }, [])

  const progressPercent = React.useMemo(() => {
    if (!job?.steps.length) return 0
    return Math.round((job.steps.reduce((sum, step) => sum + step.progress, 0) / job.steps.length) * 100)
  }, [job])

  return {
    projectId,
    project,
    setProject,
    job,
    setJob,
    currentJobId,
    setCurrentJobId,
    jobProgress,
    jobStatus,
    dbJob,
    jobError,
    jobConnectionState,
    saveStatus,
    setSaveStatus,
    isEditorBootReady,
    setIsEditorBootReady,
    leftTab,
    setLeftTab,
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    bottomMode,
    setBottomMode,
    isEditingTitle,
    setIsEditingTitle,
    tempTitle,
    setTempTitle,
    latestExport,
    setLatestExport,
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,
    isDeferredChromeReady,
    setIsDeferredChromeReady,
    isAiLampOpen,
    setIsAiLampOpen,
    isExporting,
    setIsExporting,
    isDownloading,
    setIsDownloading,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    sourceAssetLabel,
    setSourceAssetLabel,
    cinematicRegistry,
    setCinematicRegistry,
    viralClipTargetPlatform,
    setViralClipTargetPlatform,
    titleInputRef,
    chatComposerPortal,
    setChatComposerPortal,
    inspectorViewportRef,
    lastTranscriptSyncTimeRef,
    progressPercent,
    
    // Chat / Command Overlay
    chatDraft,
    setChatDraft,
    isComposerOpen,
    setIsComposerOpen,
    isCommandOverlayOpen,
    setIsCommandOverlayOpen,
    queuedPreviewRevision,
    setQueuedPreviewRevision,
    pendingReplies,
    setPendingReplies,

    handleWorkspaceTabChange,
    handleTitleStartEdit,
    handleTitleSave,
    handleTitleKeyDown,
    handleBackNavigation,
    handleAiChatOpen,
    handleAiMusicOpen,
    handleAutoSave,
    handleAutoSaveAnimationPlan,
    handlePrepareExport,
    handleComposerSubmit,
    handleOverlaySubmit,
    stopPendingReplies,
    clearQueuedPreviewRevision
  }
}
