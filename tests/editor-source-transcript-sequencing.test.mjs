import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const editor = read('app/editor/[id]/page.tsx')
const assetCommitRoute = read('app/api/projects/[id]/assets/route.ts')
const motionWorkspace = read('components/editor/motion-edit-workspace.tsx')

// A local preview is available before its R2-backed source asset exists. It
// must never be treated as proof that a transcript can be requested.
assert.doesNotMatch(
  editor,
  /if \(!previewUrl \|\| previewKind !== 'video' \|\| job\?\.artifacts\?\.transcript\?\.length\) return\s+void requestAssemblyAITranscription\(\)/,
  'Preview readiness must not automatically request a transcript.',
)

// The durable asset commit is the single place that starts the transcript job.
assert.match(assetCommitRoute, /let transcriptDispatch/)
assert.match(assetCommitRoute, /await startSourceAssetTranscription\(/)

// Motion uses the same project picker and receives the project transcript.
assert.match(editor, /onPickSource=\{openInlineSourcePicker\}/)
assert.match(editor, /transcriptSegments=\{motionTranscriptSegments\}/)
assert.match(motionWorkspace, /return Array\.isArray\(transcriptSegments\) \? transcriptSegments : \[\]/)
assert.match(
  editor,
  /artifacts: \{ \.\.\.current\.artifacts, transcript: \[\] \}/,
  'Replacing the source must clear transcript segments from the previous source.',
)

console.log('editor source and transcript sequencing checks passed')
