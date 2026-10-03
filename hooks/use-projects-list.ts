'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ProjectListItem } from '@/lib/projects/types'
import { requestProjectDeletion } from '@/components/projects/project-actions'

const PROJECTS_QUERY_KEY = ['projects']

async function parseJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null
}

export function useProjectsList() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/projects', { cache: 'no-store' })
      const payload = await parseJson<{ success?: boolean; projects?: ProjectListItem[]; error?: { message?: string } }>(response)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Failed to load projects')
      }

      return payload.projects ?? []
    },
    staleTime: 30_000,
    refetchInterval: (query) => {
      const projects = query.state.data as ProjectListItem[] | undefined
      if (projects?.some((project) => project.status === 'rendering')) return 5_000
      return false
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => requestProjectDeletion(id),
    onSuccess: async (_data, id) => {
      queryClient.setQueryData<ProjectListItem[]>(PROJECTS_QUERY_KEY, (current) => current?.filter((project) => project.id !== id))
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' })
      const payload = await parseJson<{ success?: boolean; project?: ProjectListItem; error?: { message?: string } }>(response)
      if (!response.ok || !payload?.success || !payload.project) {
        throw new Error(payload?.error?.message || 'Failed to duplicate project')
      }
      return payload.project
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    deleteProject: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    duplicateProject: duplicateMutation.mutateAsync,
    isDuplicating: duplicateMutation.isPending,
    hasProjects: (query.data ?? []).length > 0,
    mostRecentProject: query.data?.[0] ?? null,
  }
}
