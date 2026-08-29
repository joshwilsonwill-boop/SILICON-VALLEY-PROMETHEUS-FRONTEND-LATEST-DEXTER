import type { Project } from '@/lib/types'

export async function resolveProjectForSourceUpload({
  project,
  projectId,
  fetchProject,
}: {
  project: Project | null
  projectId: string
  fetchProject: (projectId: string) => Promise<Project | null>
}): Promise<Project | null> {
  if (project) return project
  if (!projectId) return null
  return fetchProject(projectId)
}
