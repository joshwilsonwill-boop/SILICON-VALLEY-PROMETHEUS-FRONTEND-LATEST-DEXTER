import 'server-only'

import {
  formatKnowledgeContext,
  retrievePrometheusKnowledge,
  type PrometheusKnowledgeMatch,
} from './retrieval'
import {
  parseEditorActionDrafts,
  type EditorActionDraft,
} from '@/lib/editor-actions'

/**
 * Shared tool surface for both Prometheus chat routes (streaming and non-streaming).
 * Definitions, execution, and Groq tool-call normalization live here so the two
 * routes cannot drift apart.
 */

export type ChatFrameReference = {
  id?: string
  label?: string
  timecode?: string
  seconds?: number
  thumbnailUrl?: string | null
  reason?: string
}

export type PrometheusToolCall = {
  id: string
  name: string
  label: string
  status: 'completed' | 'needs_approval' | 'failed'
  input: unknown
  output: unknown
  summary: string
}

export type GroqMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | Array<Record<string, unknown>>
  tool_call_id?: string
  tool_calls?: unknown
}

/**
 * Action kinds are constrained to the closed `EditorActionDraft` enum: seek,
 * preview control, fit mode, workspace tab. Everything media-mutating (trim,
 * captions, typography, renders) must go through `propose`, which is presented
 * as a plan and never fakes execution.
 */
export const PROMETHEUS_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_prometheus_knowledge',
      description: 'Search the bundled Prometheus editing, troubleshooting, creative workflow, and tool-calling knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The focused knowledge search query.' },
          limit: { type: 'number', description: 'Maximum chunks to return, between 1 and 8.' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reference_video_frames',
      description: 'Reference frames or frame ranges from the current video context that the UI can display beneath the answer.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why these frames matter.' },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Frame labels, timecodes, or ranges to reference.',
          },
        },
        required: ['reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_editor_actions',
      description:
        'Draft non-destructive editor actions the user approves before execution. Use for any request that implies changing the editor: seeking, preview transport, fit mode, workspace tabs. Anything that mutates the media itself (trim, captions, typography/style, renders) must be proposed with kind "propose" — it is shown as a plan, never executed here.',
      parameters: {
        type: 'object',
        properties: {
          intent: { type: 'string', description: 'The editing intent.' },
          actions: {
            type: 'array',
            description: 'Machine-readable non-destructive editor actions.',
            items: {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  enum: ['seek', 'preview_control', 'set_fit_mode', 'switch_tab', 'propose'],
                  description:
                    'seek → jump the playhead; preview_control → play/pause/mute/unmute; set_fit_mode → fill|fit; switch_tab → Editor|Music; propose → media-mutating change, planned only, never executed.',
                },
                timeSec: { type: 'number', description: 'For kind "seek": target time in seconds.' },
                command: { type: 'string', enum: ['play', 'pause', 'mute', 'unmute'], description: 'For kind "preview_control".' },
                mode: { type: 'string', enum: ['fill', 'fit'], description: 'For kind "set_fit_mode".' },
                tab: { type: 'string', enum: ['Editor', 'Music'], description: 'For kind "switch_tab".' },
                description: { type: 'string', description: 'For kind "propose": what the media-mutating change would do.' },
                summary: { type: 'string', description: 'Short user-facing label for this action.' },
              },
              required: ['kind'],
              additionalProperties: false,
            },
          },
          requiresApproval: { type: 'boolean', description: 'Whether execution should wait for user approval.' },
        },
        required: ['intent', 'actions'],
        additionalProperties: false,
      },
    },
  },
] as const

export type PrometheusToolExecutionContext = {
  latestMessage: string
  knowledge: PrometheusKnowledgeMatch[]
  frameReferences: ChatFrameReference[]
  projectId: string
}

export function executePrometheusTool(
  toolCall: { id: string; name: string; arguments: unknown },
  context: PrometheusToolExecutionContext,
): PrometheusToolCall {
  if (toolCall.name === 'search_prometheus_knowledge') {
    const args = asRecord(toolCall.arguments)
    const query = cleanInline(args.query) || context.latestMessage
    const limit = Math.min(8, Math.max(1, Number(args.limit) || 5))
    const matches = retrievePrometheusKnowledge(query, limit)
    return {
      id: toolCall.id,
      name: toolCall.name,
      label: 'Search knowledge',
      status: 'completed',
      input: { query, limit },
      output: { matches: toKnowledgeToolPayload(matches), context: formatKnowledgeContext(matches) },
      summary: `${matches.length} Prometheus guidance reference${matches.length === 1 ? '' : 's'} matched.`,
    }
  }

  if (toolCall.name === 'reference_video_frames') {
    const args = asRecord(toolCall.arguments)
    const labels = Array.isArray(args.labels) ? args.labels.map(cleanInline).filter(Boolean) : []
    const frames = labels.length
      ? context.frameReferences.filter((frame) =>
          labels.some((label) => cleanInline(frame.label).toLowerCase().includes(label.toLowerCase())),
        )
      : context.frameReferences

    return {
      id: toolCall.id,
      name: toolCall.name,
      label: 'Reference frames',
      status: 'completed',
      input: { reason: cleanInline(args.reason), labels },
      output: { frames: frames.map(toPublicFrame) },
      summary: frames.length ? `${frames.length} current-video frame references attached.` : 'No matching frame thumbnails are available yet.',
    }
  }

  if (toolCall.name === 'draft_editor_actions') {
    const args = asRecord(toolCall.arguments)
    const intent = cleanInline(args.intent) || context.latestMessage

    // Machine-readable drafts. Older callers may still send plain strings;
    // those are wrapped as `propose` plans so nothing is silently dropped.
    const validated = parseEditorActionDrafts(args.actions)
    let actions: EditorActionDraft[] = validated
    if (actions.length === 0 && Array.isArray(args.actions)) {
      actions = args.actions
        .map(cleanInline)
        .filter(Boolean)
        .slice(0, 8)
        .map((description) => ({
          kind: 'propose' as const,
          description,
          summary: 'Proposed edit (requires render processing)',
        }))
    }

    const executable = actions.filter((action) => action.kind !== 'propose').length
    const proposed = actions.length - executable

    return {
      id: toolCall.id,
      name: toolCall.name,
      label: 'Draft editor actions',
      status: 'needs_approval',
      input: {
        intent,
        projectId: context.projectId,
        actions,
      },
      output: {
        status: 'drafted',
        actions,
        note:
          executable > 0
            ? `${executable} action${executable === 1 ? '' : 's'} can be applied in the editor on approval.${proposed > 0 ? ` ${proposed} require${proposed === 1 ? 's' : ''} render processing and are plan-only.` : ''}`
            : 'Proposed only. These changes require render processing and are not applied here.',
      },
      summary:
        actions.length > 0
          ? `${actions.length} editor action${actions.length === 1 ? '' : 's'} drafted for approval.`
          : 'No actionable editor steps could be parsed; intent captured as a plan.',
    }
  }

  return {
    id: toolCall.id,
    name: toolCall.name,
    label: toolCall.name,
    status: 'failed',
    input: toolCall.arguments,
    output: { error: 'Unknown tool.' },
    summary: 'Unknown tool request ignored.',
  }
}

/** Collects validated action drafts across executed tool calls. */
export function collectActionDrafts(toolCalls: PrometheusToolCall[]): EditorActionDraft[] {
  return toolCalls.flatMap((toolCall) => {
    const output = asRecord(toolCall.output)
    return output.status === 'drafted' ? parseEditorActionDrafts(output.actions) : []
  })
}

export function normalizeGroqToolCalls(value: unknown): Array<{ id: string; name: string; arguments: unknown }> {
  if (!Array.isArray(value)) return []

  return value
    .map((toolCall, index) => {
      if (!toolCall || typeof toolCall !== 'object') return null
      const record = toolCall as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }
      const name = cleanInline(record.function?.name)
      if (!name) return null
      return {
        id: cleanInline(record.id) || `tool-${index + 1}`,
        name,
        arguments: parseToolArguments(record.function?.arguments),
      }
    })
    .filter((toolCall): toolCall is { id: string; name: string; arguments: unknown } => Boolean(toolCall))
    .slice(0, 4)
}

function parseToolArguments(value: unknown) {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value) as unknown
  } catch {
    return { raw: value }
  }
}

export function toKnowledgeToolPayload(matches: PrometheusKnowledgeMatch[]) {
  return matches.slice(0, 6).map((match, index) => ({
    label: `Guidance ${index + 1}`,
    title: match.title || 'Prometheus guidance',
    relevance: Number(match.score.toFixed(2)),
  }))
}

export function toFramePayload(frameReferences: ChatFrameReference[], toolCalls: PrometheusToolCall[]) {
  const toolFrames = toolCalls.flatMap((toolCall) => {
    const output = asRecord(toolCall.output)
    return Array.isArray(output.frames) ? output.frames : []
  })
  const frames = toolFrames.length ? toolFrames : frameReferences.map(toPublicFrame)
  return frames.slice(0, 8)
}

export function toPublicFrame(frame: unknown) {
  const record = asRecord(frame)
  return {
    id: cleanInline(record.id),
    label: cleanInline(record.label) || 'Frame reference',
    timecode: cleanInline(record.timecode),
    seconds: typeof record.seconds === 'number' ? record.seconds : undefined,
    thumbnailUrl: cleanInline(record.thumbnailUrl) || null,
    reason: cleanInline(record.reason),
  }
}

export function isToolUseFailed(error: unknown) {
  const record = asRecord(error)
  const details = [
    error instanceof Error ? error.message : '',
    cleanInline(record.code),
    cleanInline(record.message),
    cleanInline(record.failed_generation),
  ]
    .join(' ')
    .toLowerCase()

  return details.includes('tool_use_failed') || details.includes('<function=')
}

function cleanInline(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}
