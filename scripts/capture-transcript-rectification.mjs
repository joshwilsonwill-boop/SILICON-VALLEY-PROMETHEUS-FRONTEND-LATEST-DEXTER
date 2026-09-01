import { mkdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:\\Users\\HomePC\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe'
const root = process.cwd()
const outDir = join(root, 'artifacts', 'transcript-rectification')
const brainDir = 'C:\\Users\\HomePC\\.gemini\\antigravity-cli\\brain\\b6193a5d-6214-4db9-9aef-dcd3738d8d46'

await mkdir(outDir, { recursive: true })

const projectId = 'testing'
const assetId = 'asset-dan-martell'
const now = new Date().toISOString()

const project = {
  id: projectId,
  title: 'testing',
  status: 'ready',
  createdAt: now,
  updatedAt: now,
  thumbnailUrl: '/library/scrollbar.mp4',
  previewKind: 'video',
  sourceAssetId: assetId,
  sourceProfile: {
    label: 'Dan Martell, Scared of Achieving SHORT VER',
  },
}

// Emulate the exact previous state where localStorage held the legacy mock sentences
const mockJob = {
  id: 'job-dan-martell',
  projectId,
  status: 'running',
  createdAt: now,
  startedAt: now,
  input: { fileName: 'Dan Martell, Scared of Achieving SHORT VER.mp4', fileSizeBytes: 12450000, mimeType: 'video/mp4' },
  steps: [
    { key: 'video-analysis', title: 'Video Analysis', status: 'completed', progress: 1 },
    { key: 'scene-detection', title: 'Scene Detection', status: 'completed', progress: 1 },
    { key: 'audio-processing', title: 'Audio Processing', status: 'completed', progress: 1 },
    { key: 'ai-enhancement', title: 'AI Enhancement', status: 'completed', progress: 1 },
  ],
  artifacts: {
    transcript: [
      { id: 'ts-0', startMs: 0, endMs: 7500, speaker: 'Host', text: "It doesn't matter if you are in your first job." },
      { id: 'ts-1', startMs: 9000, endMs: 16500, speaker: 'Guest', text: 'Structure over surface is what makes the message stick.' },
      { id: 'ts-2', startMs: 18000, endMs: 25500, speaker: 'Host', text: 'Retrieval is the skill people actually remember.' },
    ],
    scenes: [],
    highlights: [],
    brollSuggestions: [],
  },
  transcriptStatus: 'completed',
  transcriptProvider: 'mock',
  transcriptText: "It doesn't matter if you are in your first job. Structure over surface is what makes the message stick. Retrieval is the skill people actually remember.",
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const context = await browser.newContext({
  viewport: { width: 1536, height: 960 },
  deviceScaleFactor: 1,
})

const page = await context.newPage()

// Intercept routes
await page.route(`**/api/projects/${projectId}`, async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ project }) })
})

await page.route(`**/api/projects/${projectId}/assets`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      asset: { id: assetId, filename: 'Dan Martell, Scared of Achieving SHORT VER.mp4', mime_type: 'video/mp4' },
      source: { url: '/library/scrollbar.mp4', expiresIn: 3600 },
    }),
  })
})

await page.route(`**/api/assets/${assetId}/transcript`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'idle' }),
  })
})

// Seed local storage with legacy mock data
await page.addInitScript(({ project, mockJob, projectId }) => {
  localStorage.setItem('prometheus.projects.v1', JSON.stringify([project]))
  localStorage.setItem('prometheus.jobsByProjectId.v1', JSON.stringify({ [projectId]: mockJob }))
  localStorage.setItem('projects', JSON.stringify([project]))
  localStorage.setItem('jobs', JSON.stringify({ [projectId]: mockJob }))
}, { project, mockJob, projectId })

console.log('Navigating to editor...')
await page.goto(`http://localhost:3005/editor/${projectId}?tab=Motion&devAuthBypass=1`, {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
})

// Wait for the empty state or UI elements to appear
await page.waitForTimeout(3000)

const snapshotPath = join(outDir, 'dan-martell-rectified.png')
const panelSnapshotPath = join(outDir, 'transcript-panel-rectified.png')

await page.screenshot({ path: snapshotPath, fullPage: true })

const transcriptAside = page.locator('aside').filter({ hasText: 'Transcript' }).first()
if (await transcriptAside.isVisible().catch(() => false)) {
  await transcriptAside.screenshot({ path: panelSnapshotPath })
}

// Copy to brain artifacts
try {
  await copyFile(snapshotPath, join(brainDir, 'dan-martell-rectified.png'))
  await copyFile(panelSnapshotPath, join(brainDir, 'transcript-panel-rectified.png'))
} catch (e) {
  console.warn('Could not copy to brainDir:', e.message)
}

console.log('Snapshots captured successfully:', {
  full: snapshotPath,
  panel: panelSnapshotPath,
})

await browser.close()
