import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const projects = read('components/projects/projects-page-editorial.tsx')
assert.match(projects, /import \{ useRouter \} from 'next\/navigation'/)
assert.match(projects, /rememberCurrentPathForEditorReturn\(\)/)
assert.match(projects, /router\.push\(`\/editor\/\$\{project\.id\}`\)/)
assert.doesNotMatch(projects, /onOpen=\{\(\) => setDetailProject\(project\)\}/)

const music = read('components/editor/music-tab-panel.tsx')
assert.match(music, /My Music/)
assert.match(music, /Tap to upload/)
assert.match(music, /New folder/)
assert.match(music, /accept="audio\/\*"/)

const suggestions = read('components/editor/ai-chat-suggestions.tsx')
assert.match(suggestions, /y: \[30, 8, 0\]/)
assert.match(suggestions, /filter: \["blur\(12px\)", "blur\(4px\)", "blur\(0px\)"\]/)

const editorLoading = read('components/editor/editor-loading-screen.tsx')
assert.doesNotMatch(editorLoading, /Preparing the editor workspace/)

const uploadInterface = read('components/video-upload-interface.tsx')
assert.doesNotMatch(uploadInterface, /CinematicLogoLoader/)
assert.match(uploadInterface, /<InlineLoadingAnimation size=\{28\} label="Preparing your project"/)

console.log('editorial workspace regression checks passed')
