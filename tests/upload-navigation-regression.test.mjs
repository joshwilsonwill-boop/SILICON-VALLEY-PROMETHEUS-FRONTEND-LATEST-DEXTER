import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

assert.equal(existsSync(join(root, 'supabase/migrations/20260715000100_restore_project_source_asset_link.sql')), true)

const migration = read('supabase/migrations/20260715000100_restore_project_source_asset_link.sql')
const registrationRoute = read('app/api/projects/[id]/assets/route.ts')
const modal = read('components/ui/glass-upload-modal-view.tsx')
const mobileNav = read('app/components/mobile/MobileNavDrawer.tsx')
const navigation = read('lib/navigation.ts')
const studioUpload = read('components/video-upload-interface.tsx')
const projectUpload = read('components/editor/editor-new-project-upload-dialog.tsx')

assert.match(migration, /add column if not exists source_asset_id uuid/i)
assert.match(migration, /source_assets_insert_own/i)
assert.match(registrationRoute, /\.upsert\(/)
assert.match(registrationRoute, /sourceAssetId: assetId/)
assert.match(modal, /Drop video to stage it/)
assert.doesNotMatch(modal, /addSourceMode|onImportSourceLink|onSourceUrlChange|sourceUrlValue/)
assert.doesNotMatch(studioUpload, /SourceRetentionNotice/)
assert.match(projectUpload, /Uploading video/)
assert.doesNotMatch(projectUpload, /Preparing secure upload channel|Cloudflare R2|Cancel Upload/)
assert.match(navigation, /Analytics/)
assert.match(mobileNav, /LiquidGlassButton/)
