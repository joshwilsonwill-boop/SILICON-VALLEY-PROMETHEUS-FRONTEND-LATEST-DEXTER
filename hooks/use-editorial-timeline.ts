'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { getEditorialTimelineController } from '@/lib/editor/editorial-timeline-client'

/** Both Music and Motion subscribe to the same project-scoped saved edit. */
export function useEditorialTimeline() {
  const params = useParams<{ id?: string }>()
  const projectId = params?.id ?? ''
  const controller = React.useMemo(() => getEditorialTimelineController(projectId), [projectId])
  const snapshot = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot)
  return { ...snapshot, projectId, patch: controller.patch, retry: controller.retry }
}
