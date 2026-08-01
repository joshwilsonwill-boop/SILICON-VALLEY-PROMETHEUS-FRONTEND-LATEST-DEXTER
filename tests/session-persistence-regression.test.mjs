import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Regression: chat history must restore, sources must survive navigation,
// chat must paint above the sidebar, and the music tab must use the cinematic loader.
const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

// 1. Chat history: re-selecting the active session must reload messages, never blank them.
const aiChat = read('hooks/use-ai-chat.ts')
assert.match(aiChat, /const loadSessionMessages = useCallback/, 'useAIChat must expose a reusable session loader.')
assert.match(aiChat, /sessionId === currentSessionIdRef\.current[\s\S]*loadSessionMessages\(sessionId\)/, 'selectSession must reload when the clicked session is already active.')
assert.match(aiChat, /console\.warn\("\[use-ai-chat\] history load failed"/, 'History load failures must be logged, not swallowed silently.')

// 2. Sources: editor re-picks must also upload to R2 so media survives hard navigation.
const editorPage = read('app/editor/[id]/page.tsx')
assert.match(editorPage, /import \{ uploadProjectSourceMultipart \} from '@\/lib\/r2\/multipart-client'/, 'Editor must import the R2 multipart uploader.')
assert.match(editorPage, /const uploadSourceAssetToCloud = React\.useCallback/, 'Editor must define the background cloud-upload helper.')
assert.match(editorPage, /void uploadSourceAssetToCloud\(/, 'Re-picking a source must fire the background R2 upload.')

// 3. Sources: studio uploads must also persist bytes to IndexedDB for instant restore.
const uploadInterface = read('components/video-upload-interface.tsx')
assert.match(uploadInterface, /import \{ persistSourceAsset \} from "@\/lib\/source-asset-store";/, 'Studio upload must import persistSourceAsset.')
assert.match(uploadInterface, /resolvedSourceAssetId = await persistSourceAsset\(selectedSourceFile\)/, 'Studio upload must persist source bytes to IndexedDB and thread the id into the R2 upload.')

// 4. Stacking: main must not trap the chat overlay below the sidebar rail.
const shell = read('components/editor/EditorRouteShell.tsx')
assert.doesNotMatch(shell, /<main className="relative z-10/, 'Main must not create a stacking context that traps the chat overlay.')

// 5. Music loader: cinematic logo loader everywhere, no orphaned eyesore copy.
const musicTab = read('components/editor/music-tab-panel.tsx')
assert.equal(musicTab.includes('Preparing Cloudflare'), false, 'The music tab must never show the orphaned "Preparing Cloudflare" copy.')
assert.match(musicTab, /CinematicLogoLoader variant="overlay"/, 'The music tab must use the cinematic overlay loader while the catalog prepares.')
assert.match(musicTab, /cachedCatalogTracks/, 'The music catalog must be cached at module level so remounts skip the loader.')

assert.equal(existsSync(join(root, 'components/loading-animation/cinematic-logo-loader.tsx')), true, 'The cinematic loader component must exist.')
assert.equal(existsSync(join(root, 'public/branding/prometheus-logo-cinematic.webm')), true, 'The cinematic logo video must ship in public/branding.')

const loader = read('components/loading-animation/cinematic-logo-loader.tsx')
assert.doesNotMatch(loader, /prometheus-logo-no-bg\.png/, 'The loader must not flash a static logo before the video starts.')
assert.doesNotMatch(loader, /mix-blend-screen|drop-shadow|radial-gradient/, 'The alpha video must render without blend tricks, glow, or a synthetic backdrop.')
assert.match(loader, /cubic-bezier\(0?\.22,\s*0?\.61,\s*0?\.36,\s*1\)/, 'The loader exit must keep its calm cinematic easing.')
assert.doesNotMatch(loader, /blur\(/, 'The loader must not bloom into a light halo during its exit.')
assert.match(loader, /\.prom-cine-overlay\s*\{\s*background:\s*transparent;/, 'The loader overlay must remain visually transparent.')

console.log('session-persistence-regression: all checks passed.')
