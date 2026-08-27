import { HERMES_IDENTITY, hermesSystemPrompt } from './identity'
import { recallHermesMemory, renderMemoryBlock, type HermesMemoryStore } from './memory'
import { HERMES_TOOL_DEFINITIONS } from './tools'

const DEFAULT_LIVE_MODEL = 'gemini-3.1-flash-live-preview'

export async function createMortyLiveSessionContext(input: {
  userId: string
  sessionId: string
  memoryStore: HermesMemoryStore
  contextQuery?: string
  getDriveToken?: () => Promise<string | null>
}): Promise<{ instructions: string }> {
  const entries = await input.memoryStore.load(input.userId)
  const recalled = recallHermesMemory(entries, input.contextQuery ?? 'Prometheus workspace direction', 5)
  const driveConnected = Boolean(await input.getDriveToken?.())
  const instructions = hermesSystemPrompt({
    memoryBlock: renderMemoryBlock(recalled),
    driveConnected,
  })
  return { instructions: `${instructions}\n\nYou are in a live spoken conversation. Speak naturally, briefly, and yield immediately when the operator begins speaking.` }
}

export function buildMortyLiveTokenRequest(input: {
  instructions: string
  model?: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  const newSessionExpiresAt = new Date(now.getTime() + 60 * 1000).toISOString()
  return {
    uses: 1,
    expireTime: expiresAt,
    newSessionExpireTime: newSessionExpiresAt,
    liveConnectConstraints: {
      model: `models/${input.model ?? process.env.MORTY_LIVE_MODEL ?? DEFAULT_LIVE_MODEL}`,
      config: {
        responseModalities: ['AUDIO'],
        sessionResumption: {},
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: { parts: [{ text: input.instructions }] },
        tools: [{ functionDeclarations: HERMES_TOOL_DEFINITIONS }],
      },
    },
  }
}

export function mortyLiveIdentity() {
  return HERMES_IDENTITY
}
