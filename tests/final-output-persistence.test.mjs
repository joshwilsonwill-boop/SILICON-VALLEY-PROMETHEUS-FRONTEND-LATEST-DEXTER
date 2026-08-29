import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(path, 'utf8')

test('migration scopes render receipts to project owners and source assets', () => {
  const sql = read('supabase/migrations/20260829000000_project_render_receipts.sql')
  assert.match(sql, /create table if not exists public\.project_render_receipts/)
  assert.match(sql, /source_asset_id uuid references public\.source_assets/)
  assert.match(sql, /unique \(project_id, source_asset_id, job_id\)/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /auth\.uid\(\) = user_id/)
})

test('receipt service always filters by user and current source', () => {
  const source = read('lib/server/project-render-receipts.ts')
  assert.match(source, /\.eq\('user_id', input\.userId\)/)
  assert.match(source, /\.eq\('source_asset_id', input\.sourceAssetId\)/)
  assert.match(source, /\.order\('created_at', \{ ascending: false \}\)/)
})

test('both dispatch routes persist project render receipts', () => {
  for (const path of ['app/api/projects/[id]/assets/route.ts', 'app/api/mini-run/dispatch/route.ts']) {
    const source = read(path)
    assert.match(source, /recordProjectRenderDispatch/)
    assert.match(source, /sourceAssetId:/)
    assert.match(source, /jobId:/)
  }
})
