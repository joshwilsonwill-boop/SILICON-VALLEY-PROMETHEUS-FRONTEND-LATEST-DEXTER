import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const exportPanel = read('components/editor/panels/ExportPanel.tsx')
const browserDownload = read('lib/editor/browser-download.ts')

assert.match(exportPanel, /const handleDownload = async \(\) =>/)
assert.match(exportPanel, /await downloadMedia\(mediaUrl, 'prometheus-export\.mp4'\)/)
assert.match(exportPanel, /catch \(error\)/)
assert.match(exportPanel, /normalizeUxError\(error, 'export'\)/)
assert.match(exportPanel, /aria-live="polite"/)
assert.match(exportPanel, /disabled=\{!mediaUrl \|\| exportStatus === 'loading'\}/)
assert.match(exportPanel, /aria-pressed=\{selectedResolution === resolution\.id\}/)
assert.match(exportPanel, /aria-pressed=\{active\}/)

assert.match(browserDownload, /isCrossOriginHttpUrl/)
assert.match(browserDownload, /window\.setTimeout\(\(\) => URL\.revokeObjectURL\(objectUrl\)/)
