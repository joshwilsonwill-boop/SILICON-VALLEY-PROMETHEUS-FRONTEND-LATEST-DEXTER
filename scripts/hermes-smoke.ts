/**
 * Hermes smoke test — live back-and-forth against Gemini.
 * Run: npx tsx scripts/hermes-smoke.ts
 * Uses the real GEMINI_API_KEY (.env.local), real knowledge + in-memory memory,
 * and Gemini function-calling (model asks → executor answers → model replies).
 * Drive honours HERMES_DRIVE_TOKEN; MiniRun is a harness stub.
 */

import { readFileSync } from 'node:fs'
import { runHermesTurn } from '@/lib/hermes/gemini'
import { hermesSystemPrompt, HERMES_IDENTITY } from '@/lib/hermes/identity'
import {
  extractSalientSnippets,
  InMemoryHermesMemoryStore,
  recallHermesMemory,
  renderMemoryBlock,
  type HermesMemoryEntry,
} from '@/lib/hermes/memory'
import { HERMES_TOOL_DEFINITIONS } from '@/lib/hermes/tool-definitions'
import { retrievePrometheusKnowledge } from '@/lib/prometheus-assistant/retrieval'

function envValue(lines: string[], name: string): string {
  const line = lines.find((entry) => entry.startsWith(name + '='))
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : ''
}

const geminiKey = envValue(readFileSync('.env.local', 'utf8').split('\n'), 'GEMINI_API_KEY')
if (!geminiKey) {
  console.error('GEMINI_API_KEY not found in .env.local — cannot run the smoke test.')
  process.exit(1)
}

const USER = 'smoke-owner'
const SESSION = 'smoke-session'
const store = new InMemoryHermesMemoryStore()

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_hermes_knowledge':
      return { matches: retrievePrometheusKnowledge(String(args.query ?? ''), 6).map((m) => ({ title: m.title, score: m.score, content: m.content.slice(0, 200) })) }
    case 'hermes_recall_memory': {
      const recalled = recallHermesMemory(await store.load(USER), String(args.query ?? ''), 5)
      return { snippets: recalled.map((e) => e.text), recalled: recalled.length }
    }
    case 'list_google_drive_videos': {
      const token = process.env.HERMES_DRIVE_TOKEN
      if (!token) return { needsGoogleDrive: true, message: 'Drive not connected in the harness.' }
      try {
        const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType)', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return { needsGoogleDrive: true, message: `Drive rejected token (HTTP ${res.status}).` }
        const data = (await res.json()) as { files?: unknown[] }
        return { files: data.files ?? [], count: (data.files ?? []).length, truncated: false }
      } catch (error) {
        return { needsGoogleDrive: true, message: error instanceof Error ? error.message : String(error) }
      }
    }
    case 'dispatch_mini_run':
      return { status: 'queued', jobId: 'harness_job_1', pipelineJobId: 'hp_1', note: 'harness stub' }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

async function runTurn(transcript: string, priorAssistant?: string) {
  const memoryBlock = renderMemoryBlock(await store.load(USER))
  const systemPrompt = hermesSystemPrompt({ userName: 'Owen', brand: 'Prometheus', memoryBlock, driveConnected: false })
  const history = priorAssistant ? [{ role: 'assistant' as const, content: priorAssistant }] : []

  const turn = await runHermesTurn({
    apiKey: geminiKey,
    systemPrompt,
    userMessage: transcript,
    history,
    tools: HERMES_TOOL_DEFINITIONS,
    executeTool,
  })

  const snippets = extractSalientSnippets(transcript).filter(Boolean)
  if (snippets.length) {
    const existing = await store.load(USER)
    await store.save(USER, [
      ...existing,
      ...snippets.map(
        (text, index): HermesMemoryEntry => ({
          id: `${USER}:${SESSION}:${Date.now()}:${index}`,
          userId: USER,
          sessionId: SESSION,
          text,
          kind: 'fact',
          createdAt: new Date().toISOString(),
          lastTouchedAt: new Date().toISOString(),
        }),
      ),
    ])
  }

  return { transcript, reply: turn.text, rounds: turn.rounds, tools: turn.results.map((tool) => ({ name: tool.name, args: tool.args, value: tool.value })) }
}

async function main() {
  await store.save(USER, [
    { id: `${USER}:seed:1`, userId: USER, sessionId: SESSION, text: 'Prefers fast cuts and punchy 9:16 hooks, with captions burned in.', kind: 'preference', createdAt: new Date().toISOString(), lastTouchedAt: new Date().toISOString() },
    { id: `${USER}:seed:2`, userId: USER, sessionId: SESSION, text: 'The brand is Prometheus and the tone should feel premium and modern.', kind: 'fact', createdAt: new Date().toISOString(), lastTouchedAt: new Date().toISOString() },
  ])

  console.log('=== HERMES SMOKE TEST (live Gemini) ===')
  console.log('agent:', JSON.stringify({ name: HERMES_IDENTITY.name, gender: HERMES_IDENTITY.gender, tagline: HERMES_IDENTITY.tagline }))
  console.log('model: gemini-2.5-flash default (HERMES_MODEL overrides)\n')

  const turn1 = await runTurn('What does the Prometheus knowledge say about pacing a strong hook for a 9:16 short?')
  console.log('--- TURN 1 (knowledge tool) ---')
  console.log('SPEAKER:', turn1.transcript)
  console.log('ROUNDS:', turn1.rounds)
  console.log('TOOLS USED:')
  for (const tool of turn1.tools) console.log('   -', tool.name, JSON.stringify(tool.args))
  console.log('HERMES:', turn1.reply || '(empty reply)')

  const turn2 = await runTurn('My b-roll intro is uploaded to my Google Drive. Make me a short from it.', turn1.reply)
  console.log('\n--- TURN 2 (Drive + dispatch, memory carried from turn 1) ---')
  console.log('SPEAKER:', turn2.transcript)
  console.log('TOOLS USED:')
  for (const tool of turn2.tools) console.log('   -', tool.name, JSON.stringify(tool.args))
  console.log('HERMES:', turn2.reply)

  console.log('\n--- MEMORY NOW STORED ---')
  for (const entry of await store.load(USER)) console.log('   -', `[${entry.kind}]`, entry.text)
  console.log('\nSMOKE OK ✔ (Gemini back-and-forth with tool calls + memory retention)')
}

main().catch((error) => {
  console.error('SMOKE FAILED:', error instanceof Error ? error.message : error)
  process.exit(1)
})
