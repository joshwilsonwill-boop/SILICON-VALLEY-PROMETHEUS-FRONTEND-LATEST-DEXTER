#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenTokens = ['dev-audit-user-001', 'audit@prometheus.local', 'dev-access-token-audit-001']
const buildDirectories = ['.next/server', '.next/static']

if (process.env.NODE_ENV === 'production' && process.env.DEV_AUTH_BYPASS === 'true') {
  console.error('FATAL: DEV_AUTH_BYPASS is enabled in a production build.')
  process.exit(1)
}

function getJavaScriptFiles(directory) {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return getJavaScriptFiles(path)
    return entry.isFile() && path.endsWith('.js') ? [path] : []
  })
}

for (const file of buildDirectories.flatMap(getJavaScriptFiles)) {
  const content = readFileSync(file, 'utf8')
  const token = forbiddenTokens.find((candidate) => content.includes(candidate))

  if (token) {
    console.error(`FATAL: Dev bypass token "${token}" found in built output: ${file}`)
    process.exit(1)
  }
}

console.log('No dev bypass tokens found in production build output.')
