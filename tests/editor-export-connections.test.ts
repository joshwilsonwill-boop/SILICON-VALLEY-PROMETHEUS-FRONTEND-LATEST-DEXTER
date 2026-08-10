import assert from 'node:assert/strict'

import {
  isExportProviderConnected,
  normalizeExportConnections,
} from '@/lib/editor/export-connections'

function run() {
  const apiPayload = {
    success: true,
    userId: 'user-1',
    connections: [
      { id: 'connection-1', provider: 'youtube', connected: true },
      { id: 'connection-2', provider: 'tiktok', connected: false },
    ],
  }

  const connections = normalizeExportConnections(apiPayload)

  assert.equal(connections.length, 2)
  assert.equal(isExportProviderConnected(connections, 'youtube'), true)
  assert.equal(isExportProviderConnected(connections, 'tiktok'), false)
  assert.deepEqual(normalizeExportConnections({ success: false, error: { message: 'Unauthorized' } }), [])
  assert.deepEqual(normalizeExportConnections(null), [])
}

run()
