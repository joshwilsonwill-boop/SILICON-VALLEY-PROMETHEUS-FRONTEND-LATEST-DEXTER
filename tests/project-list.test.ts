import assert from 'node:assert/strict'

import { mapProjectRowToListItem, normalizeProjectCardStatus } from '@/lib/projects/project-list'

function run() {
  assert.equal(normalizeProjectCardStatus('draft', null), 'draft')
  assert.equal(normalizeProjectCardStatus('processing', null), 'rendering')
  assert.equal(normalizeProjectCardStatus('ready', null), 'completed')
  assert.equal(normalizeProjectCardStatus('draft', 'failed'), 'failed')

  const mapped = mapProjectRowToListItem(
    {
      id: 'proj_1',
      user_id: 'user_1',
      name: 'Launch Cut',
      status: 'processing',
      thumbnail_url: 'https://cdn.example.com/thumb.jpg',
      source_asset_id: 'asset_1',
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-10T01:00:00.000Z',
      source_profile: {
        inspection: {
          durationSec: 42,
          width: 1920,
          height: 1080,
          fps: 30,
        },
      },
      editor_state: {
        projectDescription: 'Premium launch reel',
      },
    },
    {
      project_id: 'proj_1',
      progress: 45,
      status: 'processing',
    },
  )

  assert.equal(mapped.title, 'Launch Cut')
  assert.equal(mapped.description, 'Premium launch reel')
  assert.equal(mapped.status, 'rendering')
  assert.equal(mapped.progress, 45)
  assert.equal(mapped.duration, 42)
  assert.equal(mapped.width, 1920)
  assert.equal(mapped.sourceAssetId, 'asset_1')
}

run()
