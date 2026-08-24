import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium } from '@playwright/test'

const root = process.cwd()
const proofDir = join(root, 'artifacts', 'transcript-proof')
const liveResponsePath = join(process.env.TEMP, 'prometheus-transcript-proof', 'response.json')
const liveTranscript = JSON.parse(await readFile(liveResponsePath, 'utf8'))
const projectId = 'transcript-proof-project'
const assetId = 'transcript-proof-asset'
const now = new Date().toISOString()

await mkdir(proofDir, { recursive: true })

const project = {
  id: projectId,
  title: 'Live transcription verification',
  status: 'ready',
  createdAt: now,
  updatedAt: now,
  thumbnailUrl: '/library/scrollbar.mp4',
  previewKind: 'video',
  sourceAssetId: assetId,
}
const job = {
  id: 'transcript-proof-job',
  projectId,
  status: 'completed',
  createdAt: now,
  startedAt: now,
  completedAt: now,
  input: { fileName: 'prometheus-proof.wav', fileSizeBytes: 385836, mimeType: 'audio/wav' },
  steps: [
    { key: 'video-analysis', title: 'Video Analysis', status: 'completed', progress: 1 },
    { key: 'scene-detection', title: 'Scene Detection', status: 'completed', progress: 1 },
    { key: 'audio-processing', title: 'Audio Processing', status: 'completed', progress: 1 },
    { key: 'ai-enhancement', title: 'AI Enhancement', status: 'completed', progress: 1 },
  ],
  artifacts: { transcript: liveTranscript.segments, scenes: [], highlights: [], brollSuggestions: [] },
  transcriptStatus: 'completed',
  transcriptProvider: 'groq',
  transcriptText: liveTranscript.text,
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.route(`**/api/projects/${projectId}`, async (route) => {
  if (route.request().method() === 'PATCH') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ project }) })
    return
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ project }) })
})
await page.route(`**/api/projects/${projectId}/assets`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      asset: { id: assetId, filename: 'prometheus-proof.wav', mime_type: 'video/mp4' },
      source: { url: '/library/scrollbar.mp4', expiresIn: 3600 },
    }),
  })
})
await page.route(`**/api/assets/${assetId}/transcript`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'completed', segments: liveTranscript.segments }),
  })
})
await page.addInitScript(({ project, job, projectId }) => {
  localStorage.setItem('prometheus.projects.v1', JSON.stringify([project]))
  localStorage.setItem('prometheus.jobsByProjectId.v1', JSON.stringify({ [projectId]: job }))
}, { project, job, projectId })

await page.goto(`http://localhost:3000/editor/${projectId}?tab=Motion`, { waitUntil: 'domcontentloaded' })
const transcriptPanel = page.locator('aside').filter({ hasText: 'Prometheus transcription is complete.' }).first()
await transcriptPanel.getByText('Prometheus transcription is complete.', { exact: true }).waitFor({ state: 'visible', timeout: 60_000 })
await transcriptPanel.getByText(/motion workspace now shows real time stamped speech/i).waitFor({ state: 'visible' })
if (await page.getByText('Transcribing with Prometheus AI...').isVisible().catch(() => false)) {
  throw new Error('Motion remained in the transcribing state after completed segments arrived.')
}

await page.screenshot({ path: join(proofDir, 'motion-transcript-complete.png'), fullPage: true })
await transcriptPanel.screenshot({ path: join(proofDir, 'motion-transcript-panel.png') })

console.log(JSON.stringify({
  screenshot: join(proofDir, 'motion-transcript-complete.png'),
  panelScreenshot: join(proofDir, 'motion-transcript-panel.png'),
  text: liveTranscript.text,
  segments: liveTranscript.segments.length,
}, null, 2))

await browser.close()
