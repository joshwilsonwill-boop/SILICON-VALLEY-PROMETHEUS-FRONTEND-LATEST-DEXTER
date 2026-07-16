import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { MB, describeAttachment } from '@/lib/editor/chat-attachment'
import { formatSourceStatus } from '@/lib/editor/media-metadata'

assert.deepEqual(
  describeAttachment({ name: 'frame.png', size: 20 * MB, type: 'image/png' }),
  { kind: 'image', valid: true },
)
const oversizedImage = describeAttachment({ name: 'frame.png', size: 20 * MB + 1, type: 'image/png' })
assert.equal(oversizedImage.valid, false)
if (!oversizedImage.valid) assert.equal(oversizedImage.message, 'Image too large. Maximum size is 20MB.')
assert.deepEqual(
  describeAttachment({ name: 'clip.mp4', size: 100 * MB, type: 'video/mp4' }),
  { kind: 'video', valid: true },
)
const oversizedVideo = describeAttachment({ name: 'clip.mp4', size: 100 * MB + 1, type: 'video/mp4' })
assert.equal(oversizedVideo.valid, false)
if (!oversizedVideo.valid) assert.equal(oversizedVideo.message, 'Video too large. Maximum size is 100MB.')
assert.deepEqual(
  formatSourceStatus({ duration: 32.4, height: 1080, size: 4_194_304, width: 1920 }),
  { duration: '00:32', fileSize: '4 MB', resolution: '1920 × 1080' },
)
assert.deepEqual(formatSourceStatus({}), { duration: '—', fileSize: '—', resolution: '—' })

const read = (path: string) => readFileSync(path, 'utf8')
const sidebar = read('components/editor/EditorHamburgerSidebar.tsx')
const shell = read('components/editor/EditorRouteShell.tsx')
const command = read('components/editor/CommandZone.tsx')
const player = read('app/editor/components/mobile-video-player.tsx')

assert.doesNotMatch(sidebar, />\s*Prometheus\s*</)
assert.match(sidebar, /aria-label="Prometheus"/)
assert.match(command, /fixed bottom-\[calc\(env\(safe-area-inset-bottom\)\+1\.5rem\)\] left-1\/2/)
assert.match(shell, /pb-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\]/)
assert.match(player, /role="switch"/)
assert.match(player, /loop=\{autoplayEnabled\}/)

const analytics = read('components/editor/panels/AnalyticsPanel.tsx')
const status = read('components/editor/panels/StatusPanel.tsx')
const audioStore = read('app/editor/stores/audio-store.ts')
const editorPage = read('app/editor/[id]/page.tsx')
const editorShell = read('components/editor/EditorRouteShell.tsx')

assert.match(analytics, /No analytics available yet\. Post your video to see performance metrics\./)
assert.doesNotMatch(analytics, /Hook strength|Retention forecast|Export health/)
assert.doesNotMatch(status, /00:18|Source adaptive|42 MB/)
assert.match(status, /SourceStatus/)
assert.match(audioStore, /export function stopEditorMedia\(\)/)
assert.match(editorPage, /setEditorSourceStatus\(/)
assert.match(editorShell, /useEditorSourceStatus\(/)

const musicShell = editorShell + read('app/editor/components/sidebar-drawer.tsx') + read('app/editor/hooks/use-r2-music.ts')
const exportPanel = read('components/editor/panels/ExportPanel.tsx')
assert.match(musicShell, /Loading music library\.\.\./)
assert.match(musicShell, /Couldn't load music\./)
assert.match(musicShell, /onClick=\{fetchTracks\}/)
assert.doesNotMatch(musicShell, /Syncing R2 library|R2 bucket|Cloudflare/)
assert.match(exportPanel, /downloadMedia\(/)
