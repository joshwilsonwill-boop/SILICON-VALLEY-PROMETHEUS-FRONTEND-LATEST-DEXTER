import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const thumbnailEngine = read('lib/thumbnails/thumbnail-engine.ts')
const aiCurateRoute = read('app/api/projects/[id]/thumbnails/ai-curate/route.ts')
const thumbnailStudio = read('components/editor/ThumbnailStudioModal.tsx')
const thumbnailWorkspace = read('components/editor/thumbnail-studio/ThumbnailWorkspace.tsx')
const masterReview = read('components/editor/MasterVideoReviewModal.tsx')
const editorPage = read('app/editor/[id]/page.tsx')
const editorHeader = read('components/editor/EditorHeader.tsx')

// ThumbnailEngine checks
assert.match(thumbnailEngine, /export class ThumbnailEngine/)
assert.match(thumbnailEngine, /captureFrameFromVideo/)
assert.match(thumbnailEngine, /extractCandidateFrames/)
assert.match(thumbnailEngine, /renderThumbnail/)
assert.match(thumbnailEngine, /draw(Foreground)?Typography/)

// AI Curate route checks
assert.match(aiCurateRoute, /GoogleGenerativeAI/)
assert.match(aiCurateRoute, /gemini-2\.5-flash/)
assert.match(aiCurateRoute, /hookTitles/)
assert.match(aiCurateRoute, /candidateScores/)

// Thumbnail Studio UI checks
assert.match(thumbnailStudio, /ThumbnailStudioModal/)
assert.match(thumbnailStudio, /ThumbnailEngine/)
assert.match(thumbnailWorkspace, /Creative direction/)
assert.match(thumbnailWorkspace, /Download image/)
assert.match(thumbnailStudio, /generatedDataUrl/)
assert.match(thumbnailWorkspace, /Save Project Cover/)
assert.match(thumbnailWorkspace, /props\.generatedUrl \?\? source\?\.dataUrl/)
assert.match(thumbnailWorkspace, /'Frame preview'/)
assert.doesNotMatch(thumbnailWorkspace, /renderStudioDraft|Layout preview/)

// Master Video Review checks
assert.match(masterReview, /MasterVideoReviewModal/)
assert.match(masterReview, /Master Video Review/)
assert.match(masterReview, /Original Source/)
assert.match(masterReview, /Split Compare/)

// Page & Header integration checks
assert.match(editorPage, /ThumbnailStudioModal/)
assert.match(editorPage, /MasterVideoReviewModal/)
assert.match(editorPage, /isThumbnailStudioOpen/)
assert.match(editorPage, /isMasterReviewOpen/)
assert.match(editorHeader, /onOpenThumbnailStudio/)
assert.match(editorHeader, /onOpenMasterReview/)

console.log('Thumbnail Studio and Master Video Review regression checks passed!')
