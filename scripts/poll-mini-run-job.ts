import { request as httpsRequest } from 'node:https'

import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const jobId = process.argv[2]
if (!jobId) throw new Error('Usage: tsx scripts/poll-mini-run-job.ts <job-id>')

const required = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function getJobStatus(url: string) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = httpsRequest(url, {
      method: 'GET',
      family: 4,
      timeout: 180_000,
      headers: {
        'Modal-Key': required('MODAL_PROXY_KEY'),
        'Modal-Secret': required('MODAL_PROXY_SECRET'),
      },
    }, (response) => {
      if (response.statusCode === 303 && response.headers.location) {
        response.resume()
        resolve({
          state: 'completed',
          outputUrl: new URL(response.headers.location, url).toString(),
        })
        return
      }
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.once('end', () => {
        try {
          resolve(JSON.parse(text) as Record<string, unknown>)
        } catch {
          reject(new Error(`Mini-Run job response was not JSON (HTTP ${response.statusCode}).`))
        }
      })
    })
    request.once('timeout', () => request.destroy(new Error('Mini-Run job status request timed out.')))
    request.once('error', reject)
    request.end()
  })
}

function stateOf(status: Record<string, unknown>) {
  const nested = (status.returnvalue ?? status.response ?? {}) as Record<string, unknown>
  return String(status.state ?? status.status ?? nested.state ?? nested.status ?? 'unknown').toLowerCase()
}

function outputUrl(status: Record<string, unknown>) {
  const nested = (status.returnvalue ?? status.response ?? {}) as Record<string, unknown>
  return typeof status.outputUrl === 'string' ? status.outputUrl : typeof nested.outputUrl === 'string' ? nested.outputUrl : null
}

async function main() {
  const baseUrl = required('MINI_RUN_BACKEND_URL').replace(/\/+$/, '')
  const url = `${baseUrl}/api/pipeline/job/${encodeURIComponent(jobId)}`

  for (let attempt = 1; attempt <= 180; attempt += 1) {
    const status = await getJobStatus(url)
    const state = stateOf(status)
    console.info(JSON.stringify({ event: 'status', attempt, state }))

    if (['completed', 'success', 'finished'].includes(state)) {
      const url = outputUrl(status)
      if (!url) throw new Error('Mini-Run completed without outputUrl.')
      console.info(JSON.stringify({ event: 'completed', jobId, outputUrl: url }))
      return
    }
    if (['failed', 'error'].includes(state)) {
      const nested = (status.returnvalue ?? status.response ?? {}) as Record<string, unknown>
      throw new Error(typeof status.failedReason === 'string' ? status.failedReason : typeof nested.error === 'string' ? nested.error : 'Mini-Run failed.')
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000))
  }
  throw new Error('Mini-Run polling timed out after 15 minutes.')
}

void main()
