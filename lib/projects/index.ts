import {
  Project,
  ProcessingJob,
  ProcessingJobInput,
  ProjectStatus,
} from '../types'
import { readLocalStorageJSON, writeLocalStorageJSON } from '../storage'
import { ProjectManager, ProjectCreateParams } from './interface'

const STORAGE = {
  projects: 'prometheus.projects.v1',
  jobsByProjectId: 'prometheus.jobsByProjectId.v1',
  activeStyleId: 'prometheus.activeStyleId.v1',
} as const

export const PROJECTS_UPDATED_EVENT = 'prometheus:projects-updated'

export class BrowserProjectManager implements ProjectManager {
  private _projectsCache: Project[] | null = null
  private _jobsCache: Record<string, ProcessingJob> | null = null

  private dispatchUpdate() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT))
  }

  create(params: ProjectCreateParams): Project {
    const project: Project = {
      id: this.uid('proj'),
      title: params.title ?? 'Untitled Project',
      status: 'draft',
      createdAt: this.nowIso(),
      updatedAt: this.nowIso(),
      thumbnailUrl: params.thumbnailUrl ?? '',
      previewKind: params.previewKind,
      sourceAssetId: params.sourceAssetId,
    }
    this.upsertProject(project)
    this.dispatchUpdate()
    return project
  }

  get(id: string): Project | null {
    const projects = this.list()
    const project = projects.find((p) => p.id === id) ?? null
    if (!project) return null

    // Compute derived status if processing
    if (project.status === 'processing') {
      const job = this.getJob(id)
      if (job && job.status === 'completed') {
        const updatedProject: Project = { ...project, status: 'ready', updatedAt: this.nowIso() }
        this.upsertProject(updatedProject)
        this.dispatchUpdate()
        return updatedProject
      }
    }

    return project
  }

  list(): Project[] {
    if (this._projectsCache) return this._projectsCache

    const raw = readLocalStorageJSON<Project[]>(STORAGE.projects)
    const projects = Array.isArray(raw) ? raw : []
    this._projectsCache = [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return this._projectsCache
  }

  update(id: string, updates: Partial<Project>): Project | null {
    const projects = this.list()
    const index = projects.findIndex((p) => p.id === id)
    if (index < 0) return null

    const project = projects[index]!
    const next: Project = {
      ...project,
      ...updates,
      updatedAt: this.nowIso(),
    }

    const nextList = [next, ...projects.filter((p) => p.id !== id)]
    this._projectsCache = nextList.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    writeLocalStorageJSON(STORAGE.projects, this._projectsCache)

    this.dispatchUpdate()
    return next
  }

  process(id: string, input: ProcessingJobInput): ProcessingJob | null {
    const project = this.get(id)
    if (!project) return null

    const existing = this.readJobs()[id]
    const job = existing
      ? {...existing, input: {...input}, artifacts: {...existing.artifacts, styleId: input.styleId}}
      : this.createPendingJob(id, input)
    const jobs = this.readJobs()
    jobs[id] = job
    this.writeJobs(jobs)

    this.update(id, { status: 'processing' })
    return job
  }

  getJob(projectId: string): ProcessingJob | null {
    const jobs = this.readJobs()
    const job = jobs[projectId]
    if (!job) return null

    return job
  }

  upsertJob(job: ProcessingJob): void {
    const jobs = this.readJobs()
    jobs[job.projectId] = job
    this.writeJobs(jobs)
    this.dispatchUpdate()
  }

  reset(): void {
    this._projectsCache = []
    this._jobsCache = {}
    writeLocalStorageJSON(STORAGE.projects, [])
    writeLocalStorageJSON(STORAGE.jobsByProjectId, {})
    writeLocalStorageJSON(STORAGE.activeStyleId, '')
    this.dispatchUpdate()
  }

  getActiveStyleId(): string | null {
    return readLocalStorageJSON<string>(STORAGE.activeStyleId)
  }

  setActiveStyleId(styleId: string | null): void {
    if (!styleId) {
      writeLocalStorageJSON(STORAGE.activeStyleId, '')
    } else {
      writeLocalStorageJSON(STORAGE.activeStyleId, styleId)
    }
    this.dispatchUpdate()
  }

  setAnimationPlan(projectId: string, plan: any): void {
    const jobs = this.readJobs()
    const job = jobs[projectId]
    if (!job) return

    const next: ProcessingJob = {
      ...job,
      artifacts: {
        ...job.artifacts,
        animationPlan: plan,
      },
    }

    jobs[projectId] = next
    this.writeJobs(jobs)
    this.dispatchUpdate()
  }

  // --- PRIVATE HELPERS ---

  private uid(prefix: string) {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
  }

  private nowIso() {
    return new Date().toISOString()
  }

  private upsertProject(project: Project): void {
    const current = this.list()
    const next = [project, ...current.filter((p) => p.id !== project.id)]
    this._projectsCache = next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    writeLocalStorageJSON(STORAGE.projects, this._projectsCache)
  }

  private readJobs(): Record<string, ProcessingJob> {
    if (this._jobsCache) return this._jobsCache
    this._jobsCache = readLocalStorageJSON<Record<string, ProcessingJob>>(STORAGE.jobsByProjectId) ?? {}
    return this._jobsCache
  }

  private writeJobs(value: Record<string, ProcessingJob>) {
    this._jobsCache = value
    writeLocalStorageJSON(STORAGE.jobsByProjectId, value)
  }

  private createPendingJob(projectId: string, input: ProcessingJobInput): ProcessingJob {
    const startedAt = this.nowIso()
    return {
      id: this.uid('job'),
      projectId,
      status: 'running',
      createdAt: this.nowIso(),
      startedAt,
      steps: [
        { key: 'video-analysis', title: 'Video Analysis', status: 'running', progress: 0 },
        { key: 'scene-detection', title: 'Scene Detection', status: 'pending', progress: 0 },
        { key: 'audio-processing', title: 'Audio Processing', status: 'pending', progress: 0 },
        { key: 'ai-enhancement', title: 'AI Enhancement', status: 'pending', progress: 0 },
      ],
      input,
      artifacts: {
        transcript: [],
        scenes: [],
        highlights: [],
        brollSuggestions: [],
        styleId: input.styleId,
      },
      transcriptStatus: 'queued',
    }
  }
}

// Singleton export for easy use across the app
export const projects = new BrowserProjectManager()
