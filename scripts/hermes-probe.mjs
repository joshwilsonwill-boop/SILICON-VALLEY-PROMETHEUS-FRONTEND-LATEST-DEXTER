import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

function readEnvFile(path) {
  try { return readFileSync(path, 'utf8').split('\n') } catch { return [] }
}

function envValue(lines, name) {
  const line = lines.find((entry) => entry.startsWith(name + '='))
  if (!line) return ''
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

const envLines = readEnvFile(resolve(repoRoot, '.env.local'))
const geminiKey = envValue(envLines, 'GEMINI_API_KEY')
console.log('GEMINI_API_KEY loaded:', geminiKey ? `yes (${geminiKey.slice(0, 6)}…${geminiKey.slice(-4)})` : 'NO — missing')

if (geminiKey) {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': geminiKey } })
    if (res.ok) {
      const data = await res.json()
      const names = (data.models || []).map((m) => m.name.replace('models/', '')).sort()
      console.log('AVAILABLE MODELS:', names.length)
      console.log(names.filter((n) => /flash|pro/i.test(n)).join('\n'))
    } else {
      console.log('models listing rejected HTTP', res.status, (await res.text()).slice(0, 200))
    }
  } catch (error) { console.log('models listing error:', error instanceof Error ? error.message : String(error)) }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent('Reply with exactly: OK')
    console.log('GEMINI (gemini-flash-latest) ✓  reply:', JSON.stringify(result.response.text()))
  } catch (error) {
    console.log('GEMINI FAILED ✗ :', error instanceof Error ? error.message : String(error))
  }
}
