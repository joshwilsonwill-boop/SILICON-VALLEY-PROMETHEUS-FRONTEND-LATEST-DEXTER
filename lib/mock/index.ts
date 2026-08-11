import type {
  AnimationPlan,
  ProcessingJob,
  ProcessingJobInput,
  Project,
  ProjectStatus,
} from '@/lib/types'
import { normalizeSourceProfile } from '@/lib/media/source-profile'
import { projects as projectManager } from '@/lib/projects'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'

const STORAGE = {
  projects: 'prometheus.projects.v1',
  jobsByProjectId: 'prometheus.jobsByProjectId.v1',
  activeStyleId: 'prometheus.activeStyleId.v1',
} as const

export const PROJECTS_UPDATED_EVENT = 'prometheus:projects-updated'

// Merged: added from teammate/main.
// The new editor route imports the client-side project singleton directly.
export { projectManager as projects }

function nowIso() {
  return new Date().toISOString()
}

function dispatchProjectsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT))
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function getActiveStyleId(): string | null {
  return readLocalStorageJSON<string>(STORAGE.activeStyleId)
}

export function setActiveStyleId(styleId: string | null) {
  // Merged: added from teammate/main.
  // Keep the project singleton in sync with the legacy mock storage helpers.
  projectManager.setActiveStyleId(styleId)

  if (!styleId) {
    writeLocalStorageJSON(STORAGE.activeStyleId, '')
    return
  }
  writeLocalStorageJSON(STORAGE.activeStyleId, styleId)
}

export function listProjects(): Project[] {
  return (readLocalStorageJSON<Project[]>(STORAGE.projects) ?? []).map(normalizeProject)
}

export function getMostRecentProject(): Project | null {
  const projects = listProjects()
  if (projects.length === 0) return null

  return [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null
}

export function resetProjectData(): void {
  writeLocalStorageJSON<Project[]>(STORAGE.projects, [])
  writeLocalStorageJSON<Record<string, ProcessingJob>>(STORAGE.jobsByProjectId, {})
  // Merged: added from teammate/main.
  projectManager.reset()
  dispatchProjectsUpdated()
}

// Merged: kept from HEAD.
// This helper remains the compatibility bridge for current upload/dashboard code.
export function upsertProject(project: Project): void {
  const normalizedProject = normalizeProject(project)
  const current = listProjects()
  const next = [normalizedProject, ...current.filter((p) => p.id !== normalizedProject.id)]
  writeLocalStorageJSON(STORAGE.projects, next)
  syncProjectManagerCache(normalizedProject)
  dispatchProjectsUpdated()
}

export function getProject(id: string): Project | null {
  return listProjects().find((p) => p.id === id) ?? null
}

export function renameProject(projectId: string, title: string): Project | null {
  const project = getProject(projectId)
  if (!project) return null

  const nextTitle = title.trim()
  const next: Project = {
    ...project,
    title: nextTitle.length > 0 ? nextTitle : 'Untitled Project',
    updatedAt: nowIso(),
  }
  upsertProject(next)
  return next
}

export function createProject(params?: {
  title?: string
  thumbnailUrl?: string
  previewKind?: 'video' | 'image'
  sourceProfile?: Project['sourceProfile']
  sourceAssetId?: string
}): Project {
  // Merged: kept from HEAD.
  const project = normalizeProject({
    id: uid('proj'),
    title: params?.title ?? 'Untitled Project',
    status: 'draft',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    thumbnailUrl: params?.thumbnailUrl ?? '',
    previewKind: params?.previewKind,
    sourceProfile: params?.sourceProfile,
    sourceAssetId: params?.sourceAssetId,
  })
  upsertProject(project)
  return project
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    sourceProfile: normalizeSourceProfile(project.sourceProfile),
  }
}

type JobsByProjectId = Record<string, ProcessingJob>

function readJobs(): JobsByProjectId {
  return readLocalStorageJSON<JobsByProjectId>(STORAGE.jobsByProjectId) ?? {}
}

function writeJobs(value: JobsByProjectId) {
  writeLocalStorageJSON(STORAGE.jobsByProjectId, value)
}

export function createProcessingJob(params: {
  projectId: string
  input: ProcessingJobInput
}): ProcessingJob {
  // Merged: kept from HEAD.
  // Current callers create a job first, then persist it with startProcessing(job).
  const startedAt = nowIso()
  return {
    id: uid('job'),
    projectId: params.projectId,
    status: 'running',
    createdAt: nowIso(),
    startedAt,
    steps: [
      { key: 'video-analysis', title: 'Video Analysis', status: 'running', progress: 0 },
      { key: 'scene-detection', title: 'Scene Detection', status: 'pending', progress: 0 },
      { key: 'audio-processing', title: 'Audio Processing', status: 'pending', progress: 0 },
      { key: 'ai-enhancement', title: 'AI Enhancement', status: 'pending', progress: 0 },
    ],
    input: params.input,
    artifacts: {
      transcript: [],
      scenes: [],
      highlights: [],
      brollSuggestions: [],
      styleId: params.input.styleId,
    },
    transcriptStatus: 'queued',
  }
}

// Merged: kept from HEAD and added teammate/main's newer signature.
export function startProcessing(job: ProcessingJob): ProcessingJob
export function startProcessing(projectId: string, input: ProcessingJobInput): ProcessingJob | null
export function startProcessing(
  jobOrProjectId: ProcessingJob | string,
  input?: ProcessingJobInput,
): ProcessingJob | null {
  if (typeof jobOrProjectId === 'string') {
    if (!input) return null
    return projectManager.process(jobOrProjectId, input)
  }

  const job = jobOrProjectId
  const jobs = readJobs()
  jobs[job.projectId] = job
  writeJobs(jobs)
  syncProjectManagerJobCache(jobs)

  const project = getProject(job.projectId)
  if (project) {
    upsertProject({ ...project, status: 'processing', updatedAt: nowIso() })
  }
  return job
}

export function setJobAnimationPlan(projectId: string, animationPlan: AnimationPlan) {
  const jobs = readJobs()
  const job = jobs[projectId]
  if (!job) return null

  const next: ProcessingJob = {
    ...job,
    artifacts: {
      ...job.artifacts,
      animationPlan,
    },
  }

  jobs[projectId] = next
  writeJobs(jobs)
  syncProjectManagerJobCache(jobs)
  projectManager.setAnimationPlan(projectId, animationPlan)
  return next
}

const STEP_DURATIONS_MS: Record<ProcessingJob['steps'][number]['key'], number> = {
  'video-analysis': 2600,
  'scene-detection': 2400,
  'audio-processing': 2200,
  'ai-enhancement': 2800,
}

export function getJobStatus(projectId: string): ProcessingJob | null {
  const jobs = readJobs()
  const job = jobs[projectId]
  if (!job) return null

  const startedAtMs = Date.parse(job.startedAt)
  const elapsedMs = Math.max(0, Date.now() - startedAtMs)

  let cursor = 0
  const updatedSteps = job.steps.map((step) => {
    const d = STEP_DURATIONS_MS[step.key]
    const stepStart = cursor
    const stepEnd = cursor + d
    cursor = stepEnd

    if (elapsedMs < stepStart) {
      return { ...step, status: 'pending' as const, progress: 0 }
    }
    if (elapsedMs >= stepEnd) {
      return { ...step, status: 'completed' as const, progress: 1 }
    }
    const progress = clamp01((elapsedMs - stepStart) / d)
    return { ...step, status: 'running' as const, progress }
  })

  // Mock transcription finishing when audio-processing is done (or after 5s)
  let transcriptStatus = job.transcriptStatus
  let transcriptText = job.transcriptText
  
  if (elapsedMs > 5000 && transcriptStatus !== 'completed') {
    transcriptStatus = 'completed'
    transcriptText = job.artifacts.transcript.map(s => s.text).join(' ')
  }

  const allDone = updatedSteps.every((s) => s.status === 'completed')
  const status: ProcessingJob['status'] = allDone ? 'completed' : 'running'

  const next: ProcessingJob = { 
    ...job, 
    steps: updatedSteps, 
    status,
    transcriptStatus,
    transcriptText
  }
  jobs[projectId] = next
  writeJobs(jobs)
  syncProjectManagerJobCache(jobs)

  const project = getProject(projectId)
  if (project) {
    const nextStatus: ProjectStatus = allDone ? 'ready' : 'processing'
    if (project.status !== nextStatus) {
      upsertProject({ ...project, status: nextStatus, updatedAt: nowIso() })
    }
  }

  return next
}

function syncProjectManagerCache(project: Project) {
  // Merged: added from teammate/main.
  // MockProjectManager owns an in-memory cache; update it when legacy helpers write localStorage.
  const manager = projectManager as unknown as {
    upsertProject?: (value: Project) => void
    dispatchUpdate?: () => void
  }

  manager.upsertProject?.(project)
  manager.dispatchUpdate?.()
}

function syncProjectManagerJobCache(jobs: JobsByProjectId) {
  // Merged: added from teammate/main.
  // TS private is runtime-visible here; this keeps projects.getJob() aligned with old helpers.
  ;(projectManager as unknown as { _jobsCache?: JobsByProjectId })._jobsCache = jobs
}
