import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run() {
  const analyticsPagePath = 'app/analytics/page.tsx'
  const analyticsModulePath = 'components/analytics/PrometheusAnalytics.tsx'
  const analyticsApiPath = 'app/api/analytics/video-performance/route.ts'

  assert.equal(existsSync(join(root, analyticsPagePath)), true)
  assert.equal(existsSync(join(root, analyticsModulePath)), true)
  assert.equal(existsSync(join(root, analyticsApiPath)), true)

  const analyticsPage = read(analyticsPagePath)
  const analyticsModule = read(analyticsModulePath)

  assert.match(analyticsPage, /PrometheusAnalytics/)
  assert.match(analyticsPage, /components\/analytics\/PrometheusAnalytics/)

  assert.match(analyticsModule, /export function PrometheusAnalytics/)
  assert.match(analyticsModule, /\/api\/analytics\/video-performance/)
  assert.match(analyticsModule, /function TypewriterCustomFallback/)
  assert.match(analyticsModule, /function TextIlluminateFallback/)
  assert.match(analyticsModule, /function SpectraNoise/)
  assert.doesNotMatch(analyticsModule, /function ScrollTextTube/)
  assert.match(analyticsModule, /function TiltSignalCard/)
  assert.match(analyticsModule, /function RecentAssetsGrid/)
  assert.match(analyticsModule, /function MetricSparkline/)
  assert.match(analyticsModule, /function ReachCurveChart/)
  assert.match(analyticsModule, /mockMetrics/)
  assert.match(analyticsModule, /mockChartData/)
  assert.match(analyticsModule, /mockAssets/)
  assert.match(analyticsModule, /mockTopSignal/)
  assert.match(analyticsModule, /PERFORMANCE/)
  assert.match(analyticsModule, /Cross-platform telemetry, distilled\./)
  assert.match(analyticsModule, /mt-3 block text-\[14px\]/)
  assert.match(analyticsModule, /REACH CURVE/)
  assert.match(analyticsModule, /TOP SIGNAL/)
  assert.match(analyticsModule, /RECENT ASSETS/)
  assert.doesNotMatch(analyticsModule, /EVOLVE/)
  assert.doesNotMatch(analyticsModule, /INTERFACE/)
  assert.doesNotMatch(analyticsModule, /IMMERSION/)
  assert.doesNotMatch(analyticsModule, /VELOCITY/)
  assert.doesNotMatch(analyticsModule, /PRECISION/)
  assert.doesNotMatch(analyticsModule, /CRAFT/)
  assert.match(analyticsModule, /Awaiting signal\.\.\./)
  assert.match(analyticsModule, /strokeDashoffset/)
  assert.match(analyticsModule, /perspective\(800px\)/)
  assert.match(analyticsModule, /rotateX\(var\(--rx\)\) rotateY\(var\(--ry\)\)/)
  assert.match(analyticsModule, /onDragStart/)
  assert.match(analyticsModule, /onDragOver/)
  assert.match(analyticsModule, /onDrop/)
  assert.match(analyticsModule, /rgba\(160,\s*180,\s*140,\s*0\.025\)/)
  assert.match(analyticsModule, /rgba\(160,\s*210,\s*220,\s*0\.9\)/)
  assert.match(analyticsModule, /cubic-bezier\(0\.25,\s*0\.46,\s*0\.45,\s*0\.94\)/)
  assert.match(analyticsModule, /rounded-\[12px\]/)

  assert.doesNotMatch(analyticsModule, /VIDEO TELEMETRY/)
  assert.doesNotMatch(analyticsModule, /Derived until backend metrics land/)
  assert.doesNotMatch(analyticsModule, /Refresh/)
  assert.doesNotMatch(analyticsModule, /bg-emerald|emerald-500|text-emerald|#7ff2d4|#76a7ff|bg-purple|text-purple|bg-blue|text-blue/)
  assert.doesNotMatch(analyticsModule, /font-bold|font-semibold/)
  assert.doesNotMatch(analyticsModule, /rounded-\[8px\]|rounded-\[16px\]|rounded-2xl/)

  const analyticsApi = read(analyticsApiPath)
  assert.match(analyticsApi, /auth\.getUser\(\)/)
  assert.match(analyticsApi, /video_platform_metrics/)
  assert.match(analyticsApi, /needsConnections/)

  const sidebar = read('components/sidebar/AwwwardsSidebar.tsx')
  assert.match(sidebar, /href: "\/analytics"/)
  assert.equal(sidebar.includes('/dashboard?panel=analytics'), false)
}

run()
