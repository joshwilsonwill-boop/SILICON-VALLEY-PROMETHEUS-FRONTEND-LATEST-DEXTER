import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

assert.equal(existsSync(join(root, 'lib/supabase/profile.ts')), true)
assert.equal(existsSync(join(root, 'app/api/profile/username/route.ts')), true)
assert.equal(existsSync(join(root, 'app/api/profile/display-name/route.ts')), true)
assert.equal(existsSync(join(root, 'app/api/profile/avatar/route.ts')), true)

const hook = read('hooks/use-profile.ts')
const settings = read('app/settings/profile/page.tsx')
const mobileChat = read('components/editor/prometheus-chat-mobile.tsx')
const usernameRoute = read('app/api/profile/username/route.ts')
const displayNameRoute = read('app/api/profile/display-name/route.ts')
const avatarRoute = read('app/api/profile/avatar/route.ts')

assert.match(hook, /username/)
assert.match(hook, /updateUsername/)
assert.match(hook, /updateDisplayName/)
assert.match(hook, /updateAvatar/)
assert.match(hook, /onAuthStateChange/)
assert.match(settings, /updateUsername\(getValues\('username'\)\)/)
assert.match(settings, /updateDisplayName\(getValues\('displayName'\)\)/)
assert.match(settings, /updateAvatar\(croppedFile\)/)
assert.doesNotMatch(settings, /uploadAvatarToR2/)
assert.match(usernameRoute, /from\('profiles'\)\s*\.upsert/)
assert.match(displayNameRoute, /from\('profiles'\)\s*\.upsert/)
assert.match(avatarRoute, /uploadAvatarObject/)
assert.doesNotMatch(avatarRoute, /supabase\.storage/)
assert.match(mobileChat, /profile\?\.avatar_url/)
assert.match(mobileChat, /Hi, \{greetingName\}/)
