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
import { getRememberedEditorReturnPath } from '@/lib/editor-navigation'
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
import { VIRAL_CLIP_PLATFORM_DEFAULT } from '@/lib/constants'

export function useEditorState() {
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

  const { 
    processingJob: realTimeJob, 
    progress: jobProgress, 
    status: jobStatus, 
    job: dbJob,
    error: jobError 
  } = useDurableJob(currentJobId)

  // Sync real-time job state
  React.useEffect(() => {
    if (realTimeJob) {
      setJob(realTimeJob)
    }
  }, [realTimeJob])

  const lastTranscriptSyncTimeRef = React.useRef<number>(0)

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
    lastTranscriptSyncTimeRef,
    progressPercent
  }
}
