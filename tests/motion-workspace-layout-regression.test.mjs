import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const workspace = read('components/editor/motion-edit-workspace.tsx')
const routeShell = read('components/editor/EditorRouteShell.tsx')
const editorPage = read('app/editor/[id]/page.tsx')
const globals = read('app/globals.css')

assert.doesNotMatch(workspace, /prometheus:motion-chamber/)
assert.doesNotMatch(routeShell, /prometheus:motion-chamber|motionChamberActive/)
assert.match(routeShell, /<EditorTopBar/)

assert.match(workspace, /bg-\[length:7px_7px\] opacity-\[0\.24\]/)
assert.doesNotMatch(workspace, /background-size:40px_40px/)
assert.match(workspace, /\[container-type:size\]/)
assert.match(workspace, /100cqw,calc\(100cqh\*var\(--motion-preview-aspect\)\)/)
assert.match(workspace, /w-\[clamp\(250px,24vw,340px\)\]/)

assert.match(globals, /\[data-motion-chamber\] > section\[aria-label='Video timeline'\]/)
assert.match(editorPage, /relative h-full min-h-0 overflow-hidden bg-black/)
assert.match(editorPage, /activeWorkspaceTab === 'Motion' && 'hidden'/)
