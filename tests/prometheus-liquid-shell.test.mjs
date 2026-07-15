import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

for (const path of [
  'lib/navigation.ts',
  'components/ui/liquid-glass-button.tsx',
  'components/ui/glass-sphere-avatar.tsx',
  'components/ui/user-profile-popup.tsx',
  'components/sidebar/prometheus-dashboard-sidebar.tsx',
]) assert.equal(existsSync(join(root, path)), true)

const navigation = read('lib/navigation.ts')
const mobileSidebar = read('components/dashboard/mobile-sidebar.tsx')
const uploadView = read('components/ui/glass-upload-modal-view.tsx')
const studioUpload = read('components/video-upload-interface.tsx')
const dashboard = read('app/(dashboard)/page-v2.tsx')

assert.match(navigation, /label: 'Analytics'/)
assert.match(mobileSidebar, /LiquidGlassButton/)
assert.match(mobileSidebar, /GlassSphereAvatar/)
assert.match(mobileSidebar, /label="Analytics"/)
assert.match(mobileSidebar, /UserProfilePopup/)
assert.match(uploadView, /Drop video to stage it/)
assert.doesNotMatch(uploadView, /SourceRetentionNotice/)
assert.doesNotMatch(uploadView, /Paste source/)
assert.doesNotMatch(uploadView, /LinkIcon/)
assert.doesNotMatch(studioUpload, /Preparing secure upload channel/)
assert.doesNotMatch(studioUpload, /Finalizing uploaded parts in Cloudflare R2/)
assert.match(dashboard, /PrometheusDashboardSidebar/)
