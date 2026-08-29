import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Content, Part, Tool } from '@google/generative-ai'
import type { HermesChatMessage } from './types'

/**
 * Gemini engine for Hermes.
 *
 * Wraps `@google/generative-ai` (the same library the RAG route already uses)
 * and implements the *agent loop*: send the utterance → if the model requests a
 * tool, execute it and feed the result back → repeat (bounded) → return the
 * final spoken text plus every tool call it made. This is what gives Hermes its
 * "back-and-forth" interaction.
 */

// `gemini-2.5-flash` is the proven, stable tool-calling model in this workspace;
// the newer generations are kept as fallbacks and can be pinned with HERMES_MODEL.
const MODEL_PREFERENCES = ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash']

export function resolveHermesModel(preferences: string[] = MODEL_PREFERENCES): string {
  return process.env.HERMES_MODEL?.trim() ? process.env.HERMES_MODEL.trim() : preferences[0]
}

export interface HermesToolDefinition {
  name: string
  description: string
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
}

export function geminiToolDeclarations(tools: HermesToolDefinition[]): Tool[] {
  if (!tools.length) return []
  const declarations = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }))
  return [{ functionDeclarations: declarations }] as unknown as Tool[]
}

export interface HermesTurnInput {
  apiKey: string
  model?: string
  systemPrompt: string
  history?: HermesChatMessage[]
  userMessage: string
  tools?: HermesToolDefinition[]
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>
  maxRounds?: number
}

export interface HermesRawToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface HermesTurnOutput {
  text: string
  rawToolCalls: HermesRawToolCall[]
  results: Array<{ name: string; args: Record<string, unknown>; value: unknown }>
  rounds: number
  transcript: unknown[]
}

function historyToContents(history: HermesChatMessage[]): Content[] {
  return history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))
}

function extractFunctionCalls(parts: Part[]): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  for (const part of parts) {
    const call = (part as { functionCall?: { name: string; args?: Record<string, unknown> } }).functionCall
    if (call && typeof call.name === 'string') calls.push({ name: call.name, args: call.args ?? {} })
  }
  return calls
}

function extractText(parts: Part[]): string {
  return parts
    .filter((part) => typeof (part as { text?: unknown }).text === 'string')
    .map((part) => (part as { text: string }).text)
    .join('')
    .trim()
}

/**
 * Run the Hermes loop against `generateContent` so we control the roles. Gemini
 * 3.x rejects the SDK's legacy `function` role for function responses, so we
 * emit the functionCall under `model` and the functionResponse under `user`.
 */
export async function runHermesTurn(input: HermesTurnInput): Promise<HermesTurnOutput> {
  const modelName = resolveHermesModel(input.model ? [input.model] : undefined)
  const genAI = new GoogleGenerativeAI(input.apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: input.systemPrompt,
  })

  const contents: Content[] = historyToContents(input.history ?? [])
  contents.push({ role: 'user', parts: [{ text: input.userMessage }] })

  const rawToolCalls: HermesRawToolCall[] = []
  const results: Array<{ name: string; args: Record<string, unknown>; value: unknown }> = []
  const transcript: unknown[] = []
  let text = ''
  let rounds = 0
  const maxRounds = input.maxRounds ?? 3

  while (rounds < maxRounds) {
    rounds += 1
    const toolDeclarations = geminiToolDeclarations(input.tools ?? [])
    const result = await model.generateContent({
      contents,
      ...(toolDeclarations.length ? { tools: toolDeclarations } : {}),
    })
    const response = result.response
    const parts = response.candidates?.[0]?.content?.parts ?? []
    transcript.push({ round: rounds, parts })

    const callCandidates = extractFunctionCalls(parts)
    const reply = extractText(parts)
    if (reply) text = reply

    contents.push({ role: 'model', parts })

    if (callCandidates.length === 0) break

    for (const call of callCandidates) {
      const id = `tool_${rounds}_${call.name}_${rawToolCalls.length}`
      rawToolCalls.push({ id, name: call.name, args: call.args })
      let value: unknown
      try {
        value = input.executeTool ? await input.executeTool(call.name, call.args) : { error: 'No tool executor wired.' }
      } catch (error) {
        value = { error: error instanceof Error ? error.message : String(error) }
      }
      results.push({ name: call.name, args: call.args, value })
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: (value ?? {}) as object } }] })
    }
  }

  return { text, rawToolCalls, results, rounds, transcript }
}
