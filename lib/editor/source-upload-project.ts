import type { Project } from '@/lib/types'

export async function resolveProjectForSourceUpload({
  project,
  projectId,
  fetchProject,
  maxAttempts = 3,
  retryDelayMs = 250,
}: {
  project: Project | null
  projectId: string
  fetchProject: (projectId: string) => Promise<Project | null>
  maxAttempts?: number
  retryDelayMs?: number
}): Promise<Project | null> {
  if (project) return project
  if (!projectId) return null

  const attempts = Math.max(1, Math.floor(maxAttempts))
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const recovered = await fetchProject(projectId)
    if (recovered) return recovered
    if (attempt < attempts - 1 && retryDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  return null
}

export function retainHydratedProject(
  current: Project | null,
  cached: Project | null,
): Project | null {
  return cached ?? current
}
