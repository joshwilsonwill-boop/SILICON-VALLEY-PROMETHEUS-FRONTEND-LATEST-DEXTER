import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const workspace = readFileSync(join(process.cwd(), 'components/editor/motion-edit-workspace.tsx'), 'utf8')

assert.match(workspace, /role="separator"/)
assert.match(workspace, /aria-label="Resize timeline panel"/)
assert.match(workspace, /cursor-row-resize/)
assert.match(workspace, /startTimelineResize/)
assert.match(workspace, /moveTimelineResize/)
assert.match(workspace, /endTimelineResize/)
assert.match(workspace, /TIMELINE_COLLAPSE_THRESHOLD/)
assert.match(workspace, /event\.key === 'ArrowUp'/)
assert.match(workspace, /event\.key === 'Enter'/)
assert.match(workspace, /style=\{\{ height: timelineHeight \}\}/)
