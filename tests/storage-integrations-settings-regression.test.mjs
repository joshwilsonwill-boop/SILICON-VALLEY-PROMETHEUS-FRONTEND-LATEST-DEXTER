import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const settingsPage = read('app/settings/page.tsx')
const socialPanel = read('components/settings/connected-accounts-panel.tsx')
const oauthCallback = read('app/api/oauth/[provider]/callback/route.ts')

assert.match(
  settingsPage,
  /StorageIntegrationsPanel/,
  'Settings must render the functional storage integrations panel instead of Mock badges.',
)
assert.match(
  settingsPage,
  /grid-cols-1[\s\S]*lg:grid-cols-2/,
  'Settings must use a constrained single-column grid on mobile.',
)
const storagePanel = read('components/settings/storage-integrations-panel.tsx')
assert.match(
  storagePanel,
  /flex flex-col items-stretch[\s\S]*sm:flex-row sm:items-center sm:justify-between/,
  'Storage integration rows must stack their action below details on mobile.',
)
assert.match(storagePanel, /w-full[\s\S]*sm:w-auto/, 'Storage actions must remain fully visible on mobile.')
assert.match(
  socialPanel,
  /STORAGE_PROVIDER_IDS/,
  'The shared provider registry must retain storage provider IDs for filtered rendering.',
)
assert.match(
  socialPanel,
  /SOCIAL_PLATFORMS/,
  'Social Accounts must filter storage providers at render time.',
)
assert.match(
  socialPanel,
  /Storage integrations moved to \/settings/, 
  'The social panel must document the storage-integration relocation.',
)
assert.match(
  socialPanel,
  /bg-white\/10 hover:bg-white\/20 border border-white\/20 text-white font-medium rounded-lg px-4 py-2/,
  'Disconnected actions must use the accessible high-contrast button treatment.',
)
assert.match(
  socialPanel,
  /bg-emerald-500\/20 border border-emerald-500\/40 text-emerald-400/,
  'Connected actions must be visually distinct.',
)
assert.match(
  socialPanel,
  /focus-visible:ring-2 focus-visible:ring-white\/30/,
  'Connection actions must expose a keyboard focus ring.',
)
assert.match(
  oauthCallback,
  /provider === 'google_drive' \|\| provider === 'dropbox'/,
  'Storage OAuth callbacks must use the Settings destination.',
)

console.log('storage integrations settings regression checks passed')
