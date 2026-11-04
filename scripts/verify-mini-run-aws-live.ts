import { readFile } from 'node:fs/promises'
import { proxyMiniRunRequest } from '../lib/server/mini-run-proxy'

async function main() {
  const envText = await readFile('.env.local', 'utf8')
  const assignment = envText.match(/^\s*MINI_RUN_AWS_API_URL\s*=\s*(.*?)\s*$/m)
  const baseUrl = assignment?.[1]?.replace(/^['"]|['"]$/g, '').replace(/\/$/, '')

  if (!baseUrl || !baseUrl.startsWith('https://')) {
    throw new Error('MINI_RUN_AWS_API_URL must contain an HTTPS endpoint in .env.local')
  }

  async function request(pathSegments: string[], init: RequestInit = {}, accessToken?: string) {
    const response = await proxyMiniRunRequest({
      request: new Request('https://prometheus.example.test/api/mini-run/probe', {
        ...init,
        signal: AbortSignal.timeout(20_000),
      }),
      pathSegments,
      env: { MINI_RUN_AWS_API_URL: baseUrl },
      accessToken,
    })
    const body = await response.json().catch(() => ({})) as Record<string, unknown>
    return { response, body }
  }

  const health = await request(['health'], {}, 'codex-integrity-probe-token')
  if (
    health.response.status !== 200 ||
    health.body.ok !== true ||
    health.body.deployment !== 'aws-lambda' &&
    health.body.deployment !== 'aws-lambda-image'
  ) {
    throw new Error(`AWS health assertion failed (HTTP ${health.response.status})`)
  }

  const unauthenticatedJobResponse = await fetch(`${baseUrl}/api/pipeline/job/codex-integrity-probe`, {
    signal: AbortSignal.timeout(20_000),
  })
  const unauthenticatedJobBody = await unauthenticatedJobResponse.json().catch(() => ({})) as Record<string, unknown>
  if (
    unauthenticatedJobResponse.status !== 401 ||
    unauthenticatedJobBody.error !== 'user_authentication_required'
  ) {
    throw new Error(`Unauthenticated job guard failed (HTTP ${unauthenticatedJobResponse.status})`)
  }

  const chunk = await request(['api', 'pipeline', 'chunk'], {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      words: [
        { text: 'Prometheus', start_ms: 0, end_ms: 400 },
        { text: 'AWS', start_ms: 400, end_ms: 800 },
      ],
    }),
  }, 'codex-integrity-probe-token')
  if (chunk.response.status !== 200 || chunk.body.ok !== true || chunk.body.chunkCount !== 1) {
    throw new Error(`Chunk route assertion failed (HTTP ${chunk.response.status})`)
  }

  console.log('Mini-Run AWS live gateway checks passed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Mini-Run AWS live gateway check failed')
  process.exitCode = 1
})
