import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

function run() {
  const componentPath = 'components/editor/PrometheusChat.tsx'
  assert.equal(existsSync(join(root, componentPath)), true)

  const component = read(componentPath)
  const editorPage = read('app/editor/[id]/page.tsx')
  const inlineLoader = read('components/loading-animation/InlineLoadingAnimation.tsx')
  const canvasLoader = read('components/loading-animation/LoadingAnimation.tsx')

  assert.match(component, /export type PrometheusChatMessage/)
  assert.match(component, /messages:\s*PrometheusChatMessage\[\]/)
  assert.match(component, /onSend:\s*\(message:\s*string\)/)
  assert.match(component, /export function PrometheusChat/)
  assert.match(component, /Ask Prometheus\.\.\./)
  assert.match(component, /getChatGreeting/)
  assert.match(component, /var\(--font-elegist\)/)
  assert.match(component, /max-w-3xl/)
  assert.match(component, /Collapse editorial chat/)
  assert.match(component, /thinking/i)
  assert.match(component, /demoMessages/)
  assert.doesNotMatch(component, /AIChatOrb|SpectraNoiseFallback|LiquidMetalFallback/)
  assert.doesNotMatch(component, /InlineLoadingAnimation|prometheus-luxury-gradient-field/)
  assert.doesNotMatch(component, /New chat|Generate Code|Launch App|UI Components|Theme Ideas|Image Assets/)
  assert.doesNotMatch(component, /ImageIcon|Mic|actions\.map/)

  assert.match(inlineLoader, /return null/)
  assert.match(canvasLoader, /return null/)
  assert.doesNotMatch(canvasLoader, /<canvas|<video|requestAnimationFrame/)

  assert.match(editorPage, /PrometheusChat/)
  assert.match(editorPage, /editorOverlayMessages/)
}

run()