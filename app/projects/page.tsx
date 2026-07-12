'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Film,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Tags,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { ProjectsPageV2 } from '@/components/projects/projects-page-v2'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { BackButton } from '@/components/navigation/BackButton'
import { PrometheusShell } from '@/components/prometheus-shell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useBillingData } from '@/hooks/use-billing-data'
import { rememberCurrentPathForEditorReturn } from '@/lib/editor-navigation'
import { getJobStatus, listProjects as listMockProjects, upsertProject } from '@/lib/mock'
import { formatDurationSeconds, formatFileSize } from '@/lib/media/source-profile'
import { projects as projectManager, PROJECTS_UPDATED_EVENT } from '@/lib/projects'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'
import { formatStorage, getStorageLimit } from '@/lib/storage-limits'
import type { ProcessingJob, Project, ProjectExport } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EditorProvider, useEditor } from '@/components/editor/EditorContext'
import { ExportDrawer } from '@/components/editor/ExportDrawer'
import { CircularToast } from '@/components/editor/CircularToast'

type StatusFilter = 'all' | 'processing' | 'completed' | 'failed'
type SortKey = 'recent' | 'name' | 'duration' | 'size' | 'last-exported'
type AiTaskKey = 'motion' | 'audio' | 'color'
type AiTaskState = 'complete' | 'processing' | 'idle'

type DashboardProjectMetadata = {
  hiddenVersionIds?: string[]
  lastExportedAt?: string
  tags?: string[]
}

type VersionRecord = {
  id: string
  label: string
  relativeDate: string
  exactDate: string
  sizeLabel: string
  original?: boolean
}

const SORT_STORAGE_KEY = 'prometheus.projects.sort.v1'
const PROJECTS_STORAGE_KEY = 'prometheus.projects.v1'
const TAG_LIMIT = 3

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Recent' },
  { value: 'name', label: 'Name' },
  { value: 'duration', label: 'Duration' },
  { value: 'size', label: 'Size' },
  { value: 'last-exported', label: 'Last Exported' },
]

const AI_TASKS: Array<{ key: AiTaskKey; label: string; stepKey?: string }> = [
  { key: 'motion', label: 'Motion', stepKey: 'ai-enhancement' },
  { key: 'audio', label: 'Audio', stepKey: 'audio-processing' },
  { key: 'color', label: 'Color', stepKey: 'ai-enhancement' },
]

function normalizeProjectTitle(title: string) {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled Project'
}

function safeDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function relativeDate(value: string) {
  try {
    return formatDistanceToNow(safeDate(value), { addSuffix: true })
  } catch {
    return 'date unavailable'
  }
}

function exactDate(value: string) {
  try {
    return format(safeDate(value), "MMM d, yyyy 'at' h:mm a")
  } catch {
    return 'Date unavailable'
  }
}

function getProjectMetadata(project: Project): DashboardProjectMetadata {
  const editorState = project.editorState
  if (!editorState || typeof editorState !== 'object') return {}
  const dashboard = (editorState as { dashboard?: DashboardProjectMetadata }).dashboard
  return dashboard && typeof dashboard === 'object' ? dashboard : {}
}

function mergeProjectMetadata(project: Project, metadata: DashboardProjectMetadata): Project {
  const editorState = project.editorState && typeof project.editorState === 'object' ? project.editorState : {}
  return {
    ...project,
    editorState: {
      ...editorState,
      dashboard: {
        ...getProjectMetadata(project),
        ...metadata,
      },
    },
  }
}

function getProjectTags(project: Project) {
  return getProjectMetadata(project).tags?.slice(0, TAG_LIMIT) ?? []
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, TAG_LIMIT),
    ),
  )
}

function getProjectSizeBytes(project: Project) {
  return project.sourceProfile?.inspection?.fileSizeBytes ?? 0
}

function getProjectDurationSec(project: Project) {
  return project.sourceProfile?.inspection?.durationSec ?? 0
}

function getProjectStatus(project: Project, job: ProcessingJob | null, latestExport: ProjectExport | null): StatusFilter {
  if (latestExport?.status === 'failed' || job?.status === 'failed') return 'failed'
  if (project.status === 'processing' || job?.status === 'running' || latestExport?.status === 'pending' || latestExport?.status === 'processing') return 'processing'
  if (project.status === 'ready' || project.status === 'exported' || job?.status === 'completed' || latestExport?.status === 'completed') return 'completed'
  return 'all'
}

function getStepState(job: ProcessingJob | null, stepKey: string | undefined, fallbackStatus: Project['status']): AiTaskState {
  if (!stepKey) return fallbackStatus === 'ready' || fallbackStatus === 'exported' ? 'complete' : 'idle'
  const step = job?.steps.find((item) => item.key === stepKey)
  if (!step) return fallbackStatus === 'ready' || fallbackStatus === 'exported' ? 'complete' : 'idle'
  if (step.status === 'completed') return 'complete'
  if (step.status === 'running') return 'processing'
  return 'idle'
}

function getAiTaskStates(project: Project, job: ProcessingJob | null) {
  return AI_TASKS.reduce<Record<AiTaskKey, AiTaskState>>((acc, task) => {
    acc[task.key] = getStepState(job, task.stepKey, project.status)
    return acc
  }, {} as Record<AiTaskKey, AiTaskState>)
}

function writeProjects(projects: Project[]) {
  const ordered = [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  writeLocalStorageJSON<Project[]>(PROJECTS_STORAGE_KEY, ordered)
  ;(projectManager as unknown as { _projectsCache?: Project[] })._projectsCache = ordered
  window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT))
}

function readProjects() {
  const managerProjects = projectManager.list()
  if (managerProjects.length > 0) return managerProjects
  return listMockProjects()
}

function updateProjectLocally(projectId: string, updater: (project: Project) => Project) {
  const current = readProjects()
  const next = current.map((project) => (project.id === projectId ? updater(project) : project))
  writeProjects(next)
  const updated = next.find((project) => project.id === projectId) ?? null
  if (updated) upsertProject(updated)
  return updated
}

function removeProjectsLocally(projectIds: Set<string>) {
  writeProjects(readProjects().filter((project) => !projectIds.has(project.id)))
}

function createShareUrl(projectId: string) {
  if (typeof window === 'undefined') return `/editor/${projectId}`
  return `${window.location.origin}/editor/${projectId}`
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const element = document.createElement('textarea')
  element.value = value
  element.setAttribute('readonly', '')
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  document.body.appendChild(element)
  element.select()
  document.execCommand('copy')
  document.body.removeChild(element)
}

function buildVersionHistory(project: Project, latestExport: ProjectExport | null): VersionRecord[] {
  const metadata = getProjectMetadata(project)
  const hidden = new Set(metadata.hiddenVersionIds ?? [])
  const size = getProjectSizeBytes(project)
  const updatedAt = latestExport?.completedAt ?? metadata.lastExportedAt ?? project.updatedAt
  const versions: VersionRecord[] = [
    {
      id: `${project.id}-v3`,
      label: latestExport?.preset ? `${latestExport.preset} Export` : '4K Export',
      relativeDate: relativeDate(updatedAt),
      exactDate: exactDate(updatedAt),
      sizeLabel: formatFileSize(latestExport?.fileSizeBytes ?? Math.max(size * 0.56, 45 * 1024 * 1024)),
    },
    {
      id: `${project.id}-v2`,
      label: 'TikTok Repurpose',
      relativeDate: relativeDate(new Date(safeDate(project.updatedAt).getTime() - 24 * 60 * 60 * 1000).toISOString()),
      exactDate: exactDate(new Date(safeDate(project.updatedAt).getTime() - 24 * 60 * 60 * 1000).toISOString()),
      sizeLabel: formatFileSize(Math.max(size * 0.08, 45 * 1024 * 1024)),
    },
    {
      id: `${project.id}-v1`,
      label: 'Original Upload',
      relativeDate: relativeDate(project.createdAt),
      exactDate: exactDate(project.createdAt),
      sizeLabel: formatFileSize(Math.max(size, 1)),
      original: true,
    },
  ]

  return versions.filter((version) => version.original || !hidden.has(version.id))
}

function getTagClassName(index: number) {
  const classes = [
    'border-[#6366f1]/36 bg-[#6366f1]/14 text-[#c7d2fe]',
    'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    'border-amber-500/20 bg-amber-500/10 text-amber-400',
  ]
  return classes[index % classes.length]!
}

function isInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

function ProjectsLoadingState() {
  return (
    <div className="flex min-h-[28rem] items-center justify-center">
      <InlineLoadingAnimation size={72} label="Loading projects" />
    </div>
  )
}

function OriginalProjectsPage() {
  const router = useRouter()
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)
  const { usage } = useBillingData()
  const { setShowExport } = useEditor()

  const [projects, setProjects] = React.useState<Project[]>([])
  const [latestExports, setLatestExports] = React.useState<Record<string, ProjectExport | null>>({})
  const [jobsByProjectId, setJobsByProjectId] = React.useState<Record<string, ProcessingJob | null>>({})
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [tagFilter, setTagFilter] = React.useState<string | null>(null)
  const [sortKey, setSortKey] = React.useState<SortKey>('recent')
  const [isLoading, setIsLoading] = React.useState(true)
  const [brokenPreviewIds, setBrokenPreviewIds] = React.useState<Record<string, true>>({})
  const [expandedVersions, setExpandedVersions] = React.useState<Record<string, boolean>>({})
  const [editingTitleId, setEditingTitleId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState('')
  const [tagEditorId, setTagEditorId] = React.useState<string | null>(null)
  const [tagDraft, setTagDraft] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set())
  const [deleteTarget, setDeleteTarget] = React.useState<Project | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [exportSettingsProject, setExportSettingsProject] = React.useState<Project | null>(null)
  const [actionSheetProject, setActionSheetProject] = React.useState<Project | null>(null)
  const [activityCollapsed, setActivityCollapsed] = React.useState(false)
  const [bulkTagValue, setBulkTagValue] = React.useState('')

  const refreshProjects = React.useCallback(() => {
    const loaded = readProjects()
    setProjects(loaded)
    setJobsByProjectId(
      loaded.reduce<Record<string, ProcessingJob | null>>((acc, project) => {
        acc[project.id] = getJobStatus(project.id) ?? projectManager.getJob(project.id)
        return acc
      }, {}),
    )
  }, [])

  React.useEffect(() => {
    setSortKey(readLocalStorageJSON<SortKey>(SORT_STORAGE_KEY) ?? 'recent')
    const timer = window.setTimeout(() => {
      refreshProjects()
      setIsLoading(false)
    }, 600)

    window.addEventListener(PROJECTS_UPDATED_EVENT, refreshProjects)
    window.addEventListener('storage', refreshProjects)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(PROJECTS_UPDATED_EVENT, refreshProjects)
      window.removeEventListener('storage', refreshProjects)
    }
  }, [refreshProjects])

  React.useEffect(() => {
    writeLocalStorageJSON(SORT_STORAGE_KEY, sortKey)
  }, [sortKey])

  React.useEffect(() => {
    if (projects.length === 0) return
    let disposed = false

    async function loadLatestExports() {
      const results: Record<string, ProjectExport | null> = {}
      await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await fetch(`/api/projects/${project.id}/exports/latest`, { cache: 'no-store' })
            if (!response.ok) return
            const data = (await response.json().catch(() => null)) as { export?: ProjectExport | null } | null
            results[project.id] = data?.export ?? null
          } catch {
            results[project.id] = null
          }
        }),
      )
      if (!disposed) setLatestExports(results)
    }

    void loadLatestExports()

    return () => {
      disposed = true
    }
  }, [projects])

  const allTags = React.useMemo(() => {
    return Array.from(new Set(projects.flatMap((project) => getProjectTags(project)))).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const counts = React.useMemo(() => {
    return STATUS_FILTERS.reduce<Record<StatusFilter, number>>((acc, filter) => {
      acc[filter.value] = projects.filter((project) => {
        if (filter.value === 'all') return true
        return getProjectStatus(project, jobsByProjectId[project.id] ?? null, latestExports[project.id] ?? null) === filter.value
      }).length
      return acc
    }, { all: 0, processing: 0, completed: 0, failed: 0 })
  }, [jobsByProjectId, latestExports, projects])

  const filteredProjects = React.useMemo(() => {
    const safeQuery = query.trim().toLowerCase()

    const filtered = projects.filter((project) => {
      const tags = getProjectTags(project)
      const matchesQuery =
        !safeQuery ||
        project.title.toLowerCase().includes(safeQuery) ||
        tags.some((tag) => tag.toLowerCase().includes(safeQuery))
      const matchesStatus =
        statusFilter === 'all' ||
        getProjectStatus(project, jobsByProjectId[project.id] ?? null, latestExports[project.id] ?? null) === statusFilter
      const matchesTag = !tagFilter || tags.includes(tagFilter)
      return matchesQuery && matchesStatus && matchesTag
    })

    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return a.title.localeCompare(b.title)
      if (sortKey === 'duration') return getProjectDurationSec(b) - getProjectDurationSec(a)
      if (sortKey === 'size') return getProjectSizeBytes(b) - getProjectSizeBytes(a)
      if (sortKey === 'last-exported') {
        const aTime = Date.parse(getProjectMetadata(a).lastExportedAt ?? latestExports[a.id]?.completedAt ?? a.updatedAt)
        const bTime = Date.parse(getProjectMetadata(b).lastExportedAt ?? latestExports[b.id]?.completedAt ?? b.updatedAt)
        return bTime - aTime
      }
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    })
  }, [jobsByProjectId, latestExports, projects, query, sortKey, statusFilter, tagFilter])

  const selectedProjects = React.useMemo(
    () => projects.filter((project) => selectedIds.has(project.id)),
    [projects, selectedIds],
  )

  const storageUsedBytes = usage.storageBytes
  const storageLimitBytes = usage.storageLimit || getStorageLimit('free')
  const storagePercent = Math.min(100, Math.max(2, (storageUsedBytes / storageLimitBytes) * 100))

  const recentActivity = React.useMemo(() => {
    return [...projects]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 6)
      .map((project) => {
        const job = jobsByProjectId[project.id] ?? null
        const exportRecord = latestExports[project.id] ?? null
        if (exportRecord?.status === 'completed') {
          return `You exported "${project.title}" in ${exportRecord.preset || '4K'} — ${relativeDate(exportRecord.completedAt ?? exportRecord.updatedAt)}`
        }
        if (job?.status === 'completed') {
          return `AI motion graphics completed for "${project.title}" — ${relativeDate(job.createdAt)}`
        }
        return `New project "${project.title}" uploaded — ${relativeDate(project.createdAt)}`
      })
  }, [jobsByProjectId, latestExports, projects])

  const openEditor = React.useCallback(
    (projectId: string, task?: string) => {
      rememberCurrentPathForEditorReturn()
      router.push(task ? `/editor/${projectId}?task=${task}` : `/editor/${projectId}`)
    },
    [router],
  )

  const openProjectBody = React.useCallback(
    (project: Project) => {
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
        setActionSheetProject(project)
        return
      }
      openEditor(project.id)
    },
    [openEditor],
  )

  const optimisticUpdateProject = React.useCallback((projectId: string, updater: (project: Project) => Project) => {
    setProjects((current) => current.map((project) => (project.id === projectId ? updater(project) : project)))
    const updated = updateProjectLocally(projectId, updater)
    return updated
  }, [])

  const saveTitle = React.useCallback(() => {
    if (!editingTitleId) return
    const nextTitle = normalizeProjectTitle(editingTitle)
    optimisticUpdateProject(editingTitleId, (project) => ({
      ...project,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    }))
    setEditingTitleId(null)
    toast.success('Saved')
  }, [editingTitle, editingTitleId, optimisticUpdateProject])

  const saveTags = React.useCallback(
    (projectId: string, value: string) => {
      const nextTags = parseTags(value)
      optimisticUpdateProject(projectId, (project) => mergeProjectMetadata(project, { tags: nextTags }))
      setTagEditorId(null)
      setTagDraft('')
      toast.success('Tags updated')
    },
    [optimisticUpdateProject],
  )

  const duplicateProject = React.useCallback(
    (project: Project) => {
      const created = projectManager.create({
        title: `${project.title} (Copy)`,
        thumbnailUrl: project.thumbnailUrl,
        previewKind: project.previewKind,
        sourceAssetId: project.sourceAssetId,
      })
      const cloned: Project = {
        ...created,
        status: project.status,
        sourceProfile: project.sourceProfile,
        editorState: project.editorState,
        animationPlan: project.animationPlan,
        updatedAt: new Date().toISOString(),
      }
      upsertProject(cloned)
      refreshProjects()
      toast.success('Project duplicated')
    },
    [refreshProjects],
  )

  const deleteProjects = React.useCallback((ids: Set<string>) => {
    removeProjectsLocally(ids)
    setSelectedIds((current) => new Set(Array.from(current).filter((id) => !ids.has(id))))
    refreshProjects()
  }, [refreshProjects])

  const hideVersion = React.useCallback(
    (project: Project, version: VersionRecord) => {
      if (version.original) {
        toast.info('Original upload cannot be deleted')
        return
      }
      const metadata = getProjectMetadata(project)
      const hidden = new Set(metadata.hiddenVersionIds ?? [])
      hidden.add(version.id)
      optimisticUpdateProject(project.id, (current) =>
        mergeProjectMetadata(current, { hiddenVersionIds: Array.from(hidden) }),
      )
      toast.success('Version removed')
    },
    [optimisticUpdateProject],
  )

  const shareProject = React.useCallback(async (project: Project) => {
    await copyToClipboard(createShareUrl(project.id))
    toast.success('Link copied')
  }, [])

  const exportProject = React.useCallback(
    (project: Project) => {
      optimisticUpdateProject(project.id, (current) =>
        mergeProjectMetadata(current, { lastExportedAt: new Date().toISOString() }),
      )
      setExportSettingsProject(null)
      setShowExport(true)
    },
    [optimisticUpdateProject, setShowExport],
  )

  const bulkApplyTag = React.useCallback(() => {
    const tag = bulkTagValue.trim()
    if (!tag || selectedIds.size === 0) return
    selectedProjects.forEach((project) => {
      const nextTags = Array.from(new Set([tag, ...getProjectTags(project)])).slice(0, TAG_LIMIT)
      optimisticUpdateProject(project.id, (current) => mergeProjectMetadata(current, { tags: nextTags }))
    })
    setBulkTagValue('')
    toast.success('Tag added to selected projects')
  }, [bulkTagValue, optimisticUpdateProject, selectedIds.size, selectedProjects])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isInputTarget(event.target)) return
      if (event.key === '/') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setQuery('')
        setTagFilter(null)
        setActionSheetProject(null)
        setDeleteTarget(null)
        setBulkDeleteOpen(false)
        setExportSettingsProject(null)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setSelectedIds(new Set(filteredProjects.map((project) => project.id)))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filteredProjects])

  const hasActiveFilter = query.trim().length > 0 || statusFilter !== 'all' || Boolean(tagFilter)
  const isEmpty = !isLoading && projects.length === 0
  const isFilteredEmpty = !isLoading && projects.length > 0 && filteredProjects.length === 0

  return (
    <PrometheusShell>
      <div className="min-h-full px-3 py-3 text-white md:px-4 md:py-4">
        <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1780px] overflow-hidden rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(19,20,26,0.9)_0%,rgba(9,10,13,0.94)_100%)] shadow-[0_48px_120px_-64px_rgba(0,0,0,0.94),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-3xl">
          <section className="min-h-[calc(100vh-2rem)] px-4 py-5 md:px-6">
            <DashboardHeader
              allTags={allTags}
              counts={counts}
              onNewProject={() => router.push('/')}
              onSelectStatus={setStatusFilter}
              onSelectTag={setTagFilter}
              onSortChange={setSortKey}
              selectedStatus={statusFilter}
              selectedTag={tagFilter}
              sortKey={sortKey}
            />

            <StorageMeter
              storageLimitBytes={storageLimitBytes}
              storagePercent={storagePercent}
              storageUsedBytes={storageUsedBytes}
            />

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <SearchBar
                  inputRef={searchInputRef}
                  query={query}
                  onClear={() => setQuery('')}
                  onQueryChange={setQuery}
                />

                <div className="mt-5">
                  {isLoading ? (
                    <ProjectsLoadingState />
                  ) : isEmpty ? (
                    <EmptyState onUpload={() => router.push('/')} />
                  ) : isFilteredEmpty ? (
                    <EmptyFilterState
                      query={query}
                      onClear={() => {
                        setQuery('')
                        setStatusFilter('all')
                        setTagFilter(null)
                      }}
                    />
                  ) : (
                    <ProjectGrid
                      brokenPreviewIds={brokenPreviewIds}
                      expandedVersions={expandedVersions}
                      jobsByProjectId={jobsByProjectId}
                      latestExports={latestExports}
                      editingTitle={editingTitle}
                      editingTitleId={editingTitleId}
                      projects={filteredProjects}
                      selectedIds={selectedIds}
                      tagDraft={tagDraft}
                      tagEditorId={tagEditorId}
                      onActionSheet={setActionSheetProject}
                      onBodyClick={openProjectBody}
                      onDeleteProject={setDeleteTarget}
                      onDuplicateProject={duplicateProject}
                      onEditProject={(project) => openEditor(project.id)}
                      onExportProject={setExportSettingsProject}
                      onHideVersion={hideVersion}
                      onOpenEditorTask={openEditor}
                      onPreviewError={(projectId) =>
                        setBrokenPreviewIds((current) => ({
                          ...current,
                          [projectId]: true,
                        }))
                      }
                      onRenameCancel={() => setEditingTitleId(null)}
                      onRenameChange={setEditingTitle}
                      onRenameCommit={saveTitle}
                      onRenameStart={(project) => {
                        setEditingTitleId(project.id)
                        setEditingTitle(project.title)
                      }}
                      onSelectToggle={(projectId) => {
                        setSelectedIds((current) => {
                          const next = new Set(current)
                          if (next.has(projectId)) next.delete(projectId)
                          else next.add(projectId)
                          return next
                        })
                      }}
                      onShareProject={shareProject}
                      onTagChange={setTagDraft}
                      onTagCommit={saveTags}
                      onTagStart={(project) => {
                        setTagEditorId(project.id)
                        setTagDraft(getProjectTags(project).join(', '))
                      }}
                      onToggleVersions={(projectId) =>
                        setExpandedVersions((current) => ({ ...current, [projectId]: !current[projectId] }))
                      }
                    />
                  )}
                </div>
              </div>

              <RecentActivityFeed
                activities={recentActivity}
                collapsed={activityCollapsed}
                onToggle={() => setActivityCollapsed((current) => !current)}
              />
            </div>
          </section>
        </div>
      </div>

      <DeleteConfirmationModal
        bulkCount={bulkDeleteOpen ? selectedIds.size : 0}
        project={deleteTarget}
        open={Boolean(deleteTarget) || bulkDeleteOpen}
        onClose={() => {
          setDeleteTarget(null)
          setBulkDeleteOpen(false)
        }}
        onConfirm={() => {
          if (bulkDeleteOpen) {
            deleteProjects(selectedIds)
            setBulkDeleteOpen(false)
            toast.success('Selected projects deleted')
            return
          }
          if (!deleteTarget) return
          deleteProjects(new Set([deleteTarget.id]))
          setDeleteTarget(null)
          toast.success('Project deleted')
        }}
      />

      <ExportSettingsModal
        project={exportSettingsProject}
        onClose={() => setExportSettingsProject(null)}
        onExport={exportProject}
      />

      <MobileActionSheet
        project={actionSheetProject}
        onClose={() => setActionSheetProject(null)}
        onDelete={(project) => {
          setActionSheetProject(null)
          setDeleteTarget(project)
        }}
        onDuplicate={duplicateProject}
        onEdit={(project) => openEditor(project.id)}
        onExport={(project) => {
          setActionSheetProject(null)
          setExportSettingsProject(project)
        }}
        onRepurpose={(project) => openEditor(project.id, 'repurpose')}
        onShare={shareProject}
      />

      <FloatingBulkActionBar
        bulkTagValue={bulkTagValue}
        count={selectedIds.size}
        onBulkTagChange={setBulkTagValue}
        onBulkTagCommit={bulkApplyTag}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() => setBulkDeleteOpen(true)}
        onExport={() => toast.success('Batch export queued')}
        selectedProjects={selectedProjects}
      />
    </PrometheusShell>
  )
}

function DashboardHeader({
  allTags,
  counts,
  onNewProject,
  onSelectStatus,
  onSelectTag,
  onSortChange,
  selectedStatus,
  selectedTag,
  sortKey,
}: {
  allTags: string[]
  counts: Record<StatusFilter, number>
  onNewProject: () => void
  onSelectStatus: (value: StatusFilter) => void
  onSelectTag: (value: string | null) => void
  onSortChange: (value: SortKey) => void
  selectedStatus: StatusFilter
  selectedTag: string | null
  sortKey: SortKey
}) {
  return (
    <header className="border-b border-white/12 pb-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton />
          <div className="min-w-0 pt-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Manage source videos, AI tasks, exports, collections, and client-ready versions from one production console.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
          <label className="flex h-10 items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.05] px-3 text-sm text-white/62 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.9)]">
            <SlidersHorizontal className="size-4" />
            <span className="text-white/42">Sort by</span>
            <select
              value={sortKey}
              onChange={(event) => onSortChange(event.target.value as SortKey)}
              className="bg-transparent text-white outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#0a0a0d] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            onClick={onNewProject}
            className="h-10 rounded-[18px] border-[#6366f1]/80 bg-[#6366f1] px-5 text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)] transition-all duration-150 ease-out hover:-translate-y-1 hover:border-[#818cf8] hover:bg-[#5558e8]"
          >
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onSelectStatus(filter.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12]',
              selectedStatus === filter.value
                ? 'border-[#6366f1]/36 bg-[#6366f1]/14 text-[#c7d2fe] shadow-[0_0_30px_rgba(99,102,241,0.24)]'
                : 'border-white/14 bg-white/[0.03] text-white/62 hover:text-white',
            )}
          >
            {filter.label}
            <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/50">{counts[filter.value]}</span>
          </button>
        ))}
        {allTags.length > 0 ? <div className="mx-1 h-5 w-px bg-white/12" /> : null}
        {allTags.map((tag, index) => (
          <button
            key={tag}
            type="button"
            onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12]',
              selectedTag === tag ? getTagClassName(index) : 'border-white/14 bg-white/[0.03] text-white/62 hover:text-white',
            )}
          >
            <Tags className="size-3" />
            {tag}
          </button>
        ))}
      </div>
    </header>
  )
}

function StorageMeter({
  storageLimitBytes,
  storagePercent,
  storageUsedBytes,
}: {
  storageLimitBytes: number
  storagePercent: number
  storageUsedBytes: number
}) {
  return (
    <a
      href="/settings/billing"
      className="mt-5 block rounded-[18px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12]"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-white">Storage</span>
        <span className="text-white/50">{formatStorage(storageUsedBytes)} of {formatStorage(storageLimitBytes)} used</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#6366f1] shadow-[0_0_30px_rgba(99,102,241,0.24)] transition-transform duration-150 ease-out"
          style={{ width: `${storagePercent}%` }}
        />
      </div>
    </a>
  )
}

function SearchBar({
  inputRef,
  onClear,
  onQueryChange,
  query,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onClear: () => void
  onQueryChange: (value: string) => void
  query: string
}) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search projects or tags"
        className="h-11 rounded-[18px] border-white/16 bg-white/[0.06] pl-10 pr-10 text-sm text-white/90 placeholder:text-white/42"
      />
      {query ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-white/42 transition-all duration-150 ease-out hover:bg-white/[0.06] hover:text-white"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

function ProjectGrid(props: {
  brokenPreviewIds: Record<string, true>
  editingTitle: string
  editingTitleId: string | null
  expandedVersions: Record<string, boolean>
  jobsByProjectId: Record<string, ProcessingJob | null>
  latestExports: Record<string, ProjectExport | null>
  onActionSheet: (project: Project) => void
  onBodyClick: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onDuplicateProject: (project: Project) => void
  onEditProject: (project: Project) => void
  onExportProject: (project: Project) => void
  onHideVersion: (project: Project, version: VersionRecord) => void
  onOpenEditorTask: (projectId: string, task?: string) => void
  onPreviewError: (projectId: string) => void
  onRenameCancel: () => void
  onRenameChange: (value: string) => void
  onRenameCommit: () => void
  onRenameStart: (project: Project) => void
  onSelectToggle: (projectId: string) => void
  onShareProject: (project: Project) => void
  onTagChange: (value: string) => void
  onTagCommit: (projectId: string, value: string) => void
  onTagStart: (project: Project) => void
  onToggleVersions: (projectId: string) => void
  projects: Project[]
  selectedIds: Set<string>
  tagDraft: string
  tagEditorId: string | null
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {props.projects.map((project) => (
        <ProjectCard key={project.id} project={project} {...props} />
      ))}
    </div>
  )
}

function ProjectCard({
  brokenPreviewIds,
  editingTitle,
  editingTitleId,
  expandedVersions,
  jobsByProjectId,
  latestExports,
  onActionSheet,
  onBodyClick,
  onDeleteProject,
  onDuplicateProject,
  onEditProject,
  onExportProject,
  onHideVersion,
  onOpenEditorTask,
  onPreviewError,
  onRenameCancel,
  onRenameChange,
  onRenameCommit,
  onRenameStart,
  onSelectToggle,
  onShareProject,
  onTagChange,
  onTagCommit,
  onTagStart,
  onToggleVersions,
  project,
  selectedIds,
  tagDraft,
  tagEditorId,
}: React.ComponentProps<typeof ProjectGrid> & { project: Project }) {
  const job = jobsByProjectId[project.id] ?? null
  const latestExport = latestExports[project.id] ?? null
  const versions = buildVersionHistory(project, latestExport)
  const tags = getProjectTags(project)
  const aiStates = getAiTaskStates(project, job)
  const isSelected = selectedIds.has(project.id)
  const status = getProjectStatus(project, job, latestExport)
  const createdTitle = exactDate(project.createdAt)
  const sizeLabel = getProjectSizeBytes(project) > 0 ? formatFileSize(getProjectSizeBytes(project)) : 'Size pending'
  const durationLabel =
    getProjectDurationSec(project) > 0 ? formatDurationSeconds(getProjectDurationSec(project)) : 'Duration pending'

  return (
    <article
      className={cn(
        'group relative flex min-h-[30rem] flex-col overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#111116]/[0.82] p-3 text-white shadow-[0_34px_90px_-58px_rgba(0,0,0,0.95)] transition-all duration-150 ease-out supports-[backdrop-filter]:bg-white/[0.03] supports-[backdrop-filter]:backdrop-blur-[24px]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_38%,rgba(99,102,241,0.045)_100%)] before:opacity-90 before:content-[\'\']',
        'after:pointer-events-none after:absolute after:inset-px after:rounded-[25px] after:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.035)] after:content-[\'\']',
        isSelected && 'border-[#6366f1]/34 shadow-[0_42px_110px_-58px_rgba(99,102,241,0.68),0_34px_90px_-58px_rgba(0,0,0,0.95)]',
        'hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.045]',
      )}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
          <button
            type="button"
            aria-label={`Select ${project.title}`}
            onClick={(event) => {
              event.stopPropagation()
              onSelectToggle(project.id)
            }}
            className={cn(
              'flex size-8 items-center justify-center rounded-full border border-white/12 bg-black/60 text-white/0 opacity-100 backdrop-blur-md transition-all duration-150 ease-out hover:border-white/[0.12] sm:opacity-0 sm:group-hover:opacity-100',
              isSelected && 'border-[#6366f1]/36 bg-[#6366f1]/14 text-[#c7d2fe] opacity-100',
            )}
          >
            {isSelected ? <Check className="size-4" /> : null}
          </button>
          <button
            type="button"
            aria-label="Open project actions"
            onClick={(event) => {
              event.stopPropagation()
              onActionSheet(project)
            }}
            className="flex size-8 items-center justify-center rounded-full border border-white/12 bg-black/60 text-white/62 backdrop-blur-md transition-all duration-150 ease-out hover:border-white/[0.12] hover:text-white md:hidden"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onBodyClick(project)}
          className="relative block aspect-video overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03] text-left"
        >
          {project.thumbnailUrl && !brokenPreviewIds[project.id] ? (
            project.previewKind === 'video' ? (
              <video
                src={project.thumbnailUrl}
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => onPreviewError(project.id)}
                className="h-full w-full object-cover opacity-[0.85] transition-transform duration-150 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              // Local project thumbnails can be blob/data URLs from the upload flow, so next/image is not a safe fit here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.thumbnailUrl}
                alt={project.title}
                onError={() => onPreviewError(project.id)}
                className="h-full w-full object-cover opacity-[0.85] transition-transform duration-150 ease-out group-hover:scale-[1.04]"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0)_52%),linear-gradient(165deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.02)_68%)]">
              {status === 'processing' ? (
                <InlineLoadingAnimation size={20} label={`Processing ${project.title}`} />
              ) : (
                <Film className="size-12 text-white/20" />
              )}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(0,0,0,0)_28%,rgba(0,0,0,0.38)_100%)]" />
        </button>

        <div className="flex flex-1 flex-col pt-4">
          <div className="flex items-start justify-between gap-3">
            {editingTitleId === project.id ? (
              <Input
                autoFocus
                value={editingTitle}
                onBlur={onRenameCommit}
                onChange={(event) => onRenameChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onRenameCommit()
                  if (event.key === 'Escape') onRenameCancel()
                }}
                className="h-9 rounded-[14px] border-white/16 bg-white/[0.06] text-sm text-white/90"
              />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onRenameStart(project)
                }}
                className="min-w-0 touch-manipulation truncate text-left text-lg font-semibold text-white"
                title="Click to rename"
                aria-label={`Rename ${project.title}`}
              >
                {project.title}
              </button>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleVersions(project.id)
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#6366f1]/36 bg-[#6366f1]/14 px-2.5 py-1 text-xs font-semibold text-[#c7d2fe] shadow-[0_0_30px_rgba(99,102,241,0.24)] transition-all duration-150 ease-out hover:-translate-y-1"
              title="Show version history"
            >
              v{versions.length}
              <ChevronDown className={cn('size-3 transition-transform duration-150 ease-out', expandedVersions[project.id] && 'rotate-180')} />
            </button>
          </div>

          <div className="mt-2 text-xs leading-5 text-white/50">
            <span>{durationLabel}</span>
            <span className="mx-2 text-white/20">•</span>
            <span>{sizeLabel}</span>
            <span className="mx-2 text-white/20">•</span>
            <span title={createdTitle}>{relativeDate(project.createdAt)}</span>
          </div>

          <AiTaskRow projectId={project.id} states={aiStates} onOpenTask={onOpenEditorTask} />

          <div className="mt-3 min-h-8">
            {tagEditorId === project.id ? (
              <Input
                autoFocus
                value={tagDraft}
                onBlur={() => onTagCommit(project.id, tagDraft)}
                onChange={(event) => onTagChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onTagCommit(project.id, tagDraft)
                  if (event.key === 'Escape') onTagCommit(project.id, tags.join(', '))
                }}
                placeholder="Client A, Q3 Campaign"
                className="h-8 rounded-[14px] border-white/16 bg-white/[0.06] text-xs text-white/90"
              />
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onTagStart(project)
                }}
                className="flex flex-wrap gap-1.5 text-left"
                title="Edit tags"
              >
                {tags.length > 0 ? (
                  tags.map((tag, index) => (
                    <span key={tag} className={cn('rounded-full border px-2 py-1 text-[10px] font-medium', getTagClassName(index))}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/42">Add tags</span>
                )}
              </button>
            )}
          </div>

          {expandedVersions[project.id] ? (
            <VersionTimeline
              project={project}
              versions={versions}
              onCopy={async (version) => {
                await copyToClipboard(`${createShareUrl(project.id)}?version=${version.id}`)
                toast.success('Version link copied')
              }}
              onDelete={(version) => onHideVersion(project, version)}
            />
          ) : null}

          <QuickActionChips
            project={project}
            status={status}
            onDelete={onDeleteProject}
            onDuplicate={onDuplicateProject}
            onEdit={onEditProject}
            onExport={onExportProject}
            onRepurpose={(item) => onOpenEditorTask(item.id, 'repurpose')}
            onShare={onShareProject}
          />
        </div>
      </div>
      <button
        type="button"
        aria-label={`Delete ${project.title}`}
        onClick={(event) => {
          event.stopPropagation()
          onDeleteProject(project)
        }}
        className={cn(
          'absolute left-3 top-3 z-30 grid size-9 place-items-center rounded-full border border-white/10 bg-black/54 text-white/42 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-white md:text-white/30 md:group-hover:text-white/72',
          status === 'failed' && 'border-red-400/22 bg-red-500/10 text-red-100 md:text-red-100',
        )}
      >
        <Trash2 className="size-4" />
      </button>
    </article>
  )
}

function AiTaskRow({
  onOpenTask,
  projectId,
  states,
}: {
  onOpenTask: (projectId: string, task?: string) => void
  projectId: string
  states: Record<AiTaskKey, AiTaskState>
}) {
  return (
    <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/38">AI Tasks</div>
      <div className="grid grid-cols-3 gap-2">
        {AI_TASKS.map((task) => {
          const state = states[task.key]
          return (
            <button
              key={task.key}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenTask(projectId, task.key)
              }}
              className="flex items-center gap-1.5 rounded-full text-[11px] text-white/58 transition-colors duration-150 ease-out hover:text-white"
              title={`Open ${task.label} task`}
            >
              {state === 'processing' ? (
                <InlineLoadingAnimation size={12} label={`Processing ${task.label} task`} />
              ) : (
                <span
                  className={cn(
                    'size-2.5 rounded-full border border-white/20 bg-transparent',
                    state === 'complete' && 'border-[#6366f1]/36 bg-[#6366f1] shadow-[0_0_30px_rgba(99,102,241,0.24)]',
                  )}
                />
              )}
              {task.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function QuickActionChips({
  onDelete,
  onDuplicate,
  onEdit,
  onExport,
  onRepurpose,
  onShare,
  project,
  status,
}: {
  onDelete: (project: Project) => void
  onDuplicate: (project: Project) => void
  onEdit: (project: Project) => void
  onExport: (project: Project) => void
  onRepurpose: (project: Project) => void
  onShare: (project: Project) => void
  project: Project
  status: StatusFilter
}) {
  const actions = [
    { label: 'Edit', icon: ExternalLink, onClick: onEdit },
    { label: 'Repurpose', icon: Wand2, onClick: onRepurpose },
    { label: 'Export', icon: Download, onClick: onExport },
    { label: 'Share', icon: Share2, onClick: onShare },
    { label: 'Duplicate', icon: Copy, onClick: onDuplicate },
    { label: 'Delete', icon: Trash2, onClick: onDelete },
  ]

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-2 justify-center gap-1.5 opacity-0 transition-all duration-150 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 md:flex',
        status === 'failed' && 'pointer-events-auto translate-y-0 opacity-100',
      )}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          title={action.label}
          onClick={(event) => {
            event.stopPropagation()
            action.onClick(project)
          }}
          className="flex size-9 items-center justify-center rounded-full border border-white/12 bg-black/60 text-white/72 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-white"
        >
          <action.icon className="size-4" />
        </button>
      ))}
    </div>
  )
}

function VersionTimeline({
  onCopy,
  onDelete,
  project,
  versions,
}: {
  onCopy: (version: VersionRecord) => void
  onDelete: (version: VersionRecord) => void
  project: Project
  versions: VersionRecord[]
}) {
  return (
    <div className="mt-3 space-y-2 rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
      {versions.map((version, index) => (
        <div key={version.id} className="flex items-center gap-3 text-xs">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/54">
            v{versions.length - index}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-white/86">{version.label}</div>
            <div className="truncate text-white/42" title={version.exactDate}>
              {version.relativeDate} — {version.sizeLabel}
            </div>
          </div>
          <button type="button" title="Download version" className="text-white/42 transition-colors duration-150 ease-out hover:text-white">
            <Download className="size-3.5" />
          </button>
          <button
            type="button"
            title="Copy share link"
            onClick={(event) => {
              event.stopPropagation()
              onCopy(version)
            }}
            className="text-white/42 transition-colors duration-150 ease-out hover:text-white"
          >
            <Share2 className="size-3.5" />
          </button>
          <button
            type="button"
            title={version.original ? 'Original upload cannot be deleted' : `Delete ${version.label}`}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(version)
            }}
            className={cn(
              'text-white/42 transition-colors duration-150 ease-out hover:text-white',
              !version.original && 'hover:text-rose-400',
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <div className="sr-only">Version history for {project.title}</div>
    </div>
  )
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex min-h-[32rem] flex-col items-center justify-center rounded-[26px] border border-white/[0.06] bg-[#111116]/[0.82] px-6 text-center supports-[backdrop-filter]:bg-white/[0.03] supports-[backdrop-filter]:backdrop-blur-[24px]">
      <Film className="size-12 text-white/20" />
      <h2 className="mt-5 text-xl font-semibold text-white">No projects yet</h2>
      <p className="mt-2 text-sm text-white/50">Upload your first video to start editing with AI.</p>
      <Button
        type="button"
        onClick={onUpload}
        className="mt-6 h-11 rounded-[16px] border-[#6366f1]/80 bg-[#6366f1] px-5 text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)] transition-all duration-150 ease-out hover:-translate-y-1 hover:border-[#818cf8] hover:bg-[#5558e8]"
      >
        <Plus className="size-4" />
        Upload Video
      </Button>
    </div>
  )
}

function EmptyFilterState({ onClear, query }: { onClear: () => void; query: string }) {
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-[26px] border border-white/[0.06] bg-white/[0.03] px-6 text-center">
      <Search className="size-10 text-white/20" />
      <h2 className="mt-5 text-xl font-semibold text-white">No projects match {query ? `"${query}"` : 'this view'}</h2>
      <p className="mt-2 text-sm text-white/50">Clear filters or search a different client, campaign, or project name.</p>
      <Button type="button" variant="secondary" className="mt-6" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  )
}

function RecentActivityFeed({
  activities,
  collapsed,
  onToggle,
}: {
  activities: string[]
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-5 rounded-[26px] border border-white/[0.06] bg-[#111116]/[0.82] p-5 supports-[backdrop-filter]:bg-white/[0.03] supports-[backdrop-filter]:backdrop-blur-[24px]">
        <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left">
          <span className="text-sm font-semibold text-white">Recent Activity</span>
          <ChevronDown className={cn('size-4 text-white/42 transition-transform duration-150 ease-out', collapsed && '-rotate-90')} />
        </button>
        {!collapsed ? (
          <div className="mt-4 space-y-3">
            {(activities.length > 0 ? activities : ['No activity yet. Upload a source to start the production log.']).map((activity) => (
              <div key={activity} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/58">
                {activity}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function DeleteConfirmationModal({
  bulkCount,
  onClose,
  onConfirm,
  open,
  project,
}: {
  bulkCount: number
  onClose: () => void
  onConfirm: () => void
  open: boolean
  project: Project | null
}) {
  const title = bulkCount > 0 ? `Delete ${bulkCount} selected projects?` : `Delete '${project?.title ?? 'Project'}'?`

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[24px] border-white/10 bg-[#0a0a0d] text-white">
        <DialogHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-lg text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/50">
            This project and all its versions will be permanently removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExportSettingsModal({
  onClose,
  onExport,
  project,
}: {
  onClose: () => void
  onExport: (project: Project) => void
  project: Project | null
}) {
  return (
    <Dialog open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/10 bg-[#0a0a0d] text-white">
        <DialogHeader>
          <DialogTitle>Export settings</DialogTitle>
          <DialogDescription className="text-white/60">
            Choose export quality for {project?.title ?? 'this project'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-6 py-4">
          {['4K UHD • MP4 • High quality', '8K master • ProRes • Archive', 'TikTok repurpose • 9:16 • Fast'].map((option) => (
            <label key={option} className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-sm text-white/72">
              <input name="export-option" type="radio" defaultChecked={option.startsWith('4K')} />
              {option}
            </label>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => project && onExport(project)}>
            Queue Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MobileActionSheet({
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
  onExport,
  onRepurpose,
  onShare,
  project,
}: {
  onClose: () => void
  onDelete: (project: Project) => void
  onDuplicate: (project: Project) => void
  onEdit: (project: Project) => void
  onExport: (project: Project) => void
  onRepurpose: (project: Project) => void
  onShare: (project: Project) => void
  project: Project | null
}) {
  const actions = [
    { label: 'Edit', icon: ExternalLink, onClick: onEdit },
    { label: 'Repurpose', icon: Wand2, onClick: onRepurpose },
    { label: 'Export', icon: Download, onClick: onExport },
    { label: 'Share', icon: Share2, onClick: onShare },
    { label: 'Duplicate', icon: Copy, onClick: onDuplicate },
    { label: 'Delete', icon: Trash2, onClick: onDelete },
  ]

  return (
    <Sheet open={Boolean(project)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="max-w-sm border-white/10 bg-[#0a0a0d]/95">
        <SheetHeader>
          <SheetTitle>{project?.title ?? 'Project actions'}</SheetTitle>
          <SheetDescription>Run one-click production actions.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-2 p-6">
          {project
            ? actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick(project)
                    if (action.label !== 'Delete' && action.label !== 'Export') onClose()
                  }}
                  className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-white/72 transition-all duration-150 ease-out hover:-translate-y-1 hover:border-white/[0.12] hover:text-white"
                >
                  <action.icon className="size-4" />
                  {action.label}
                </button>
              ))
            : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FloatingBulkActionBar({
  bulkTagValue,
  count,
  onBulkTagChange,
  onBulkTagCommit,
  onClear,
  onDelete,
  onExport,
  selectedProjects,
}: {
  bulkTagValue: string
  count: number
  onBulkTagChange: (value: string) => void
  onBulkTagCommit: () => void
  onClear: () => void
  onDelete: () => void
  onExport: () => void
  selectedProjects: Project[]
}) {
  if (count === 0) return null

  return (
    <div className="fixed inset-x-3 bottom-4 z-40 mx-auto max-w-3xl rounded-[24px] border border-white/12 bg-[#111116]/[0.92] p-3 shadow-[0_34px_90px_-58px_rgba(0,0,0,0.95)] backdrop-blur-[24px]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-2 text-sm text-white/72">
          <input type="checkbox" checked readOnly />
          {count} projects selected
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={bulkTagValue}
            onChange={(event) => onBulkTagChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onBulkTagCommit()}
            placeholder="Add tag"
            className="h-9 w-32 rounded-[14px]"
          />
          <Button type="button" variant="secondary" size="sm" onClick={onBulkTagCommit}>
            Add Tag
          </Button>
          <Button type="button" size="sm" onClick={onExport}>
            Export Selected
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            Delete Selected ({count})
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="sr-only">{selectedProjects.map((project) => project.title).join(', ')}</div>
    </div>
  )
}

export default function ProjectsPageWrapper(props: any) {
  return (
    <EditorProvider>
      <ProjectsPageV2 {...props} />
      <ExportDrawer />
      <CircularToast />
    </EditorProvider>
  )
}
