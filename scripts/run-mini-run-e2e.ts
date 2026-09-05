import { randomUUID } from 'node:crypto'
import { access, stat } from 'node:fs/promises'
import { request as httpsRequest } from 'node:https'
import path from 'node:path'

import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const sourcePath = process.argv[2]
const sourceDurationMs = Number(process.argv[3])
const sourceWidth = Number(process.argv[4])
const sourceHeight = Number(process.argv[5])
const existingSourceKey = process.argv[6]?.trim()

if (!sourcePath || !Number.isFinite(sourceDurationMs) || !Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight)) {
  throw new Error('Usage: tsx scripts/run-mini-run-e2e.ts <source-path> <duration-ms> <width> <height>')
}

const required = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

const statusValue = (payload: Record<string, unknown>) =>
  String(payload.state ?? payload.status ?? (payload.returnvalue as Record<string, unknown> | undefined)?.state ?? 'unknown').toLowerCase()

const outputUrl = (payload: Record<string, unknown>) => {
  const nested = (payload.returnvalue ?? payload.response ?? {}) as Record<string, unknown>
  return typeof payload.outputUrl === 'string' ? payload.outputUrl : typeof nested.outputUrl === 'string' ? nested.outputUrl : null
}

async function requestJson(url: string, init: RequestInit, timeoutMs = 120_000) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = httpsRequest(url, {
      method: init.method ?? 'GET',
      headers: init.headers,
      family: 4,
      timeout: timeoutMs,
    }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.once('end', () => {
        let body: Record<string, unknown> = {}
        try {
          body = JSON.parse(text) as Record<string, unknown>
        } catch {
          // Preserve the HTTP failure below even when an upstream error is not JSON.
        }
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(typeof body.error === 'string' ? body.error : `Request failed with HTTP ${response.statusCode}.`))
          return
        }
        resolve(body)
      })
    })
    request.once('timeout', () => request.destroy(new Error(`Request timed out after ${Math.round(timeoutMs / 1_000)} seconds: ${url}`)))
    request.once('error', reject)
    if (typeof init.body === 'string') request.write(init.body)
    request.end()
  })
}

async function main() {
  await access(sourcePath)
  const sourceStats = await stat(sourcePath)
  const bucket = process.env.R2_BUCKET_SOURCES?.trim() || 'prometheus-sources'
  const sourceKey = existingSourceKey || `mini-run-e2e/${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomUUID()}-${path.basename(sourcePath)}`
  const jobId = randomUUID()

  const { uploadFileToR2 } = await import('../lib/r2/upload-file')
  const { buildMiniRunSourceUrl } = await import('../lib/server/mini-run-dispatch')
  const { buildMiniRunRenderPayload } = await import('../lib/server/mini-run-render-payload')

  if (existingSourceKey) {
    console.info(`Reusing staged source ${bucket}/${sourceKey}`)
  } else {
    console.info(`Uploading ${(sourceStats.size / 1024 / 1024).toFixed(1)} MB source to ${bucket}/${sourceKey}`)
    await uploadFileToR2(sourcePath, bucket, sourceKey, 'video/mp4')
  }
  const signedSourceUrl = await buildMiniRunSourceUrl(bucket, sourceKey)

  const payload = buildMiniRunRenderPayload({
    sourceUrl: signedSourceUrl,
    source: { durationMs: sourceDurationMs, width: sourceWidth, height: sourceHeight },
    shot: {
      pipeline: 'maul',
      sourceStartMs: 0,
      sourceEndMs: 30_000,
      targetChunkWords: 3,
      maxChunkWords: 5,
      canvasWidth: 1080,
      canvasHeight: 1920,
      songPolicy: 'disabled',
    },
    jobId,
  })

  const baseUrl = required('MINI_RUN_BACKEND_URL').replace(/\/+$/, '')
  const headers = {
    'Content-Type': 'application/json',
    'Modal-Key': required('MODAL_PROXY_KEY'),
    'Modal-Secret': required('MODAL_PROXY_SECRET'),
  }
  const submitted = await requestJson(`${baseUrl}/api/pipeline/render`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }, 15 * 60_000)
  const renderJobId = typeof submitted.jobId === 'string' && submitted.jobId ? submitted.jobId : jobId
  console.info(JSON.stringify({ event: 'submitted', renderJobId, sourceKey, requestedDurationMs: 30_000 }))

  for (let attempt = 1; attempt <= 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5_000))
    const status = await requestJson(`${baseUrl}/api/pipeline/job/${encodeURIComponent(renderJobId)}`, { headers })
    const state = statusValue(status)
    console.info(JSON.stringify({ event: 'status', attempt, state }))

    if (['completed', 'success', 'finished'].includes(state)) {
      const finalOutputUrl = outputUrl(status)
      if (!finalOutputUrl) throw new Error('Render completed without outputUrl.')
      console.info(JSON.stringify({ event: 'completed', renderJobId, sourceKey, outputUrl: finalOutputUrl }))
      return
    }
    if (['failed', 'error'].includes(state)) {
      throw new Error(typeof status.failedReason === 'string' ? status.failedReason : typeof status.error === 'string' ? status.error : 'Mini-Run render failed.')
    }
  }

  throw new Error('Mini-Run render polling timed out after 15 minutes.')
}

void main()
