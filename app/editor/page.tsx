'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { getMostRecentProject } from '@/lib/mock'

export default function EditorIndexPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const recentProject = getMostRecentProject()
    const requestedTab = normalizeRequestedWorkspaceTab(searchParams.get('tab'))
    const tabSuffix = requestedTab ? `?tab=${requestedTab}` : ''
    router.replace(recentProject ? `/editor/${recentProject.id}${tabSuffix}` : '/')
  }, [router, searchParams])

  return null
}

function normalizeRequestedWorkspaceTab(value: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'editor') return 'Editor'
  if (normalized === 'music') return 'Music'
  if (normalized === 'motion') return 'Motion'
  return null
}
