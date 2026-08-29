import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveProjectForSourceUpload } from '../lib/editor/source-upload-project'
import type { Project } from '../lib/types'

const project = { id: 'project-1', title: 'Existing project' } as Project

test('uses the hydrated project without making a second request', async () => {
  let requests = 0
  const resolved = await resolveProjectForSourceUpload({
    project,
    projectId: project.id,
    fetchProject: async () => {
      requests += 1
      return project
    },
  })

  assert.equal(resolved, project)
  assert.equal(requests, 0)
})

test('recovers the project when upload begins during hydration', async () => {
  let requestedId = ''
  const resolved = await resolveProjectForSourceUpload({
    project: null,
    projectId: project.id,
    fetchProject: async (projectId) => {
      requestedId = projectId
      return project
    },
  })

  assert.equal(requestedId, project.id)
  assert.equal(resolved, project)
})

test('returns null when the project cannot be recovered', async () => {
  const resolved = await resolveProjectForSourceUpload({
    project: null,
    projectId: project.id,
    fetchProject: async () => null,
  })

  assert.equal(resolved, null)
})
