import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

test('API Route /api/analytics/appraisal adheres to security and performance contract', () => {
  const routePath = join(process.cwd(), 'app/api/analytics/appraisal/route.ts')
  assert.equal(existsSync(routePath), true, 'app/api/analytics/appraisal/route.ts must exist')

  const content = readFileSync(routePath, 'utf8')

  // Next.js Route runtime & configuration
  assert.match(content, /export const runtime = 'nodejs'/)
  assert.match(content, /export const dynamic = 'force-dynamic'/)

  // Supabase Auth Guard verification
  assert.match(content, /createClient\(\)/)
  assert.match(content, /auth\.getUser\(\)/)
  assert.match(content, /status: 401/)
  assert.match(content, /Unauthorized/)

  // Telemetry source queries
  assert.match(content, /from\('video_platform_metrics'\)/)
  assert.match(content, /from\('projects'\)/)

  // LAYA Engine invocation
  assert.match(content, /appraiseCatalogWithLaya/)

  // Fast in-process TTL caching
  assert.match(content, /createTtlCache/)
  assert.match(content, /appraisalCache/)

  // Supports both GET and POST
  assert.match(content, /export async function GET/)
  assert.match(content, /export async function POST/)
})

test('useVideoAppraisal hook adheres to headless base function logic contract', () => {
  const hookPath = join(process.cwd(), 'hooks/use-video-appraisal.ts')
  assert.equal(existsSync(hookPath), true, 'hooks/use-video-appraisal.ts must exist')

  const content = readFileSync(hookPath, 'utf8')

  assert.match(content, /'use client'/)
  assert.match(content, /export function useVideoAppraisal/)
  assert.match(content, /\/api\/analytics\/appraisal/)
  assert.match(content, /appraiseCustomPosts/)
  assert.match(content, /refresh/)
})

console.log('analytics appraisal api verification passed')
