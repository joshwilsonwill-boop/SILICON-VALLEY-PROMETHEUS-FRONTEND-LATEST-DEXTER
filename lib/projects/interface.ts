import { Project, ProjectStatus, ProcessingJob, ProcessingJobInput } from '../types'

/**
 * PROJECT LIFECYCLE INTERFACE
 *
 * This is a DEEP MODULE interface. It hides the complexity of:
 * - LocalStorage persistence (STORAGE_KEYS)
 * - Deterministic job simulation (getJobStatus)
 * - State machine transitions (draft -> processing -> ready)
 *
 * Callers only interact with the high-level Project domain.
 */

export interface ProjectManager {
  /**
   * Creates a new project in the 'draft' state.
   */
  create(params: ProjectCreateParams): Project

  /**
   * Retrieves a project by ID, including its current computed status.
   * If the project is 'processing', this call may trigger a status transition
   * based on elapsed time (in the mock implementation).
   */
  get(id: string): Project | null

  /**
   * Lists all projects, sorted by recency.
   */
  list(): Project[]

  /**
   * Updates project metadata.
   */
  update(id: string, updates: Partial<Project>): Project | null

  /**
   * Starts the processing pipeline for a project.
   * Transitions state to 'processing'.
   */
  process(id: string, input: ProcessingJobInput): ProcessingJob | null

  /**
   * Retrieves the current processing job for a project.
   * Returns null if no job exists or if the project is not in a state that supports jobs.
   */
  getJob(projectId: string): ProcessingJob | null

  /** Persists authoritative backend analysis for editor consumers. */
  upsertJob(job: ProcessingJob): void

  /**
   * Wipes all project data (used for local dev/testing).
   */
  reset(): void

  /**
   * Active Style management.
   */
  getActiveStyleId(): string | null
  setActiveStyleId(styleId: string | null): void

  /**
   * Artifact management.
   */
  setAnimationPlan(projectId: string, plan: any): void
}

export interface ProjectCreateParams {
  title?: string
  thumbnailUrl?: string
  previewKind?: 'video' | 'image'
  sourceAssetId?: string
}
