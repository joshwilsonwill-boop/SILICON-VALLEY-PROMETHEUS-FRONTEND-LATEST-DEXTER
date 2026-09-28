import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'

const portServer = createServer()
portServer.listen(0, '127.0.0.1')
await once(portServer, 'listening')
const port = portServer.address().port
await new Promise((resolve) => portServer.close(resolve))

const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', String(port)],
  { stdio: 'ignore', env: process.env },
)

try {
  let response
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      response = await fetch('http://127.0.0.1:' + port + '/studio', {
        signal: AbortSignal.timeout(5_000),
      })
      break
    } catch {
      if (server.exitCode !== null) throw new Error('Production server exited before startup')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  if (!response?.ok) throw new Error('Studio did not return a successful production response')

  const csp = response.headers.get('content-security-policy') ?? ''
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1]
  if (!nonce) throw new Error('Response CSP is missing a script nonce')

  const html = await response.text()
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map((match) => match[1])
    .filter((attributes) => !/\bsrc\s*=/.test(attributes))
  if (inlineScripts.length === 0) throw new Error('No inline bootstrap scripts were found')
  if (inlineScripts.some((attributes) => !attributes.includes('nonce="' + nonce + '"'))) {
    throw new Error('Production bootstrap script is missing the response CSP nonce')
  }

  console.log('PRODUCTION CSP PASS')
} finally {
  server.kill()
}
