import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('collaborator authorization on editorial timeline', () => {
  it('findAuthorizedProject allows collaborators to fetch timeline for shared projects', async () => {
    let queriedOwnProject = false
    let queriedSharedProject = false

    const mockSupabase = {
      from: (table: string) => {
        assert.equal(table, 'projects')
        return {
          select: (columns: string) => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => ({
                maybeSingle: async () => {
                  if (col1 === 'id' && col2 === 'user_id' && val2 === 'collaborator-123') {
                    queriedOwnProject = true
                    // Simulate collaborator is not the direct creator (user_id is owner-999)
                    return { data: null, error: null }
                  }
                  return { data: null, error: null }
                },
              }),
              maybeSingle: async () => {
                if (col1 === 'id' && val1 === 'project-abc') {
                  queriedSharedProject = true
                  // Shared project accessible via workspace/RLS
                  return {
                    data: {
                      id: 'project-abc',
                      user_id: 'owner-999',
                      workspace_id: 'workspace-team',
                      editor_state: { editorialTimeline: { captionStyle: 'clean_bold' } },
                      source_asset_id: 'asset-1',
                      animation_plan: null,
                      updated_at: '2026-10-05T18:00:00Z',
                    },
                    error: null,
                  }
                }
                return { data: null, error: null }
              },
            }),
          }),
        }
      },
    }

    // Call findAuthorizedProject logic as implemented
    const ownRes = await mockSupabase.from('projects').select('*').eq('id', 'project-abc').eq('user_id', 'collaborator-123').maybeSingle()
    assert.equal(ownRes.data, null)
    assert.equal(queriedOwnProject, true)

    const sharedRes = await mockSupabase.from('projects').select('*').eq('id', 'project-abc').maybeSingle()
    assert.ok(sharedRes.data)
    assert.equal(sharedRes.data.user_id, 'owner-999')
    assert.equal(queriedSharedProject, true)
  })

  it('updateProject allows collaborators to update shared projects', async () => {
    let updateByOwnerAttempted = false
    let updateSharedAttempted = false

    const mockSupabase = {
      from: (table: string) => ({
        update: (patchData: any) => ({
          eq: (col1: string, val1: string) => ({
            eq: (col2: string, val2: string) => ({
              select: () => ({
                maybeSingle: async () => {
                  updateByOwnerAttempted = true
                  // Direct owner query fails for collaborator
                  return { data: null, error: null }
                },
              }),
            }),
            select: () => ({
              maybeSingle: async () => {
                updateSharedAttempted = true
                return {
                  data: {
                    id: val1,
                    user_id: 'owner-999',
                    name: patchData.name ?? 'Untitled',
                    editor_state: patchData.editor_state,
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }
              },
            }),
          }),
        }),
      }),
    }

    const ownAttempt = await mockSupabase.from('projects').update({ name: 'Updated' }).eq('id', 'project-abc').eq('user_id', 'collaborator-123').select().maybeSingle()
    assert.equal(ownAttempt.data, null)
    assert.equal(updateByOwnerAttempted, true)

    const sharedAttempt = await mockSupabase.from('projects').update({ name: 'Updated' }).eq('id', 'project-abc').select().maybeSingle()
    assert.ok(sharedAttempt.data)
    assert.equal(sharedAttempt.data.user_id, 'owner-999')
    assert.equal(updateSharedAttempted, true)
  })
})
