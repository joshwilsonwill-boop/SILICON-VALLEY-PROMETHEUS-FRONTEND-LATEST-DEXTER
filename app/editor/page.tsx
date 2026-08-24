'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { getMostRecentProject, upsertProject } from '@/lib/mock'
import { InlineLoadingAnimation } from '@/components/loading-animation'

export default function EditorIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    let active = true

    const resolveProjectAndRedirect = async () => {
      const requestedTab = normalizeRequestedWorkspaceTab(searchParams.get('tab'))
      const tabSuffix = requestedTab ? `?tab=${requestedTab}` : ''

      // 1. Check local mock storage first for instant redirection
      const recentProject = getMostRecentProject()
      if (recentProject && recentProject.id) {
        router.replace(`/editor/${recentProject.id}${tabSuffix}`)
        return
      }

      // 2. Query API for existing projects on the account
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const data = await res.json()
          const apiProjects = Array.isArray(data?.projects) ? data.projects : []
          if (apiProjects.length > 0) {
            const first = apiProjects[0]
            upsertProject(first)
            if (active) {
              router.replace(`/editor/${first.id}${tabSuffix}`)
              return
            }
          }
        }
      } catch (err) {
        console.warn('[editor] Failed to fetch projects list:', err)
      }

      // 3. If account has no projects (e.g. brand new user like ItalianIngress@gmail.com), create a new project
      try {
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Untitled Project' }),
        })
        if (createRes.ok) {
          const createData = await createRes.json()
          if (createData?.project?.id) {
            upsertProject(createData.project)
            if (active) {
              router.replace(`/editor/${createData.project.id}${tabSuffix}`)
              return
            }
          }
        }
      } catch (err) {
        console.warn('[editor] Failed to create starter project:', err)
      }

      // 4. Client-side fallback if offline/disconnected
      const fallbackId = `proj_${Date.now()}`
      const now = new Date().toISOString()
      const fallbackProject = {
        id: fallbackId,
        title: 'Untitled Project',
        status: 'draft' as const,
        createdAt: now,
        updatedAt: now,
      }
      upsertProject(fallbackProject)
      if (active) {
        router.replace(`/editor/${fallbackId}${tabSuffix}`)
      }
    }

    void resolveProjectAndRedirect()

    return () => {
      active = false
    }
  }, [router, searchParams])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
      <InlineLoadingAnimation size={48} label="Entering the editorial chamber" />
    </div>
  )
}

function normalizeRequestedWorkspaceTab(value: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'editor') return 'Editor'
  if (normalized === 'music') return 'Music'
  if (normalized === 'motion') return 'Motion'
  return null
}
