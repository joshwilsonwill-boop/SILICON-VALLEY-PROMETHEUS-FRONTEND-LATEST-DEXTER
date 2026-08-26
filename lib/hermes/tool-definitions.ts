import type { HermesToolDefinition } from './gemini'

/**
 * Hermes tool declarations. Kept in a dependency-free module so they can be
 * shared by the server executor (`tools.ts`) and by the tsx test harness
 * without dragging in AWS/Supabase imports.
 */
export const HERMES_TOOL_DEFINITIONS: HermesToolDefinition[] = [
  {
    name: 'search_hermes_knowledge',
    description:
      'Search bundled Prometheus project knowledge (long-form editing, pacing, 9:16 shorts, structure). Use for how-to questions that are not answerable from a specific file.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Topic to search (e.g. "pacing a hook for a 9:16 short").' } }, required: ['query'] },
  },
  {
    name: 'hermes_recall_memory',
    description:
      'Recall the caller’s saved context (preferences, prior task intents, files mentioned, brand facts). Use before answering anything that depends on who the caller is or what they asked before.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'What you are trying to recall (e.g. "their preferred 9:16 style").' } }, required: ['query'] },
  },
  {
    name: 'list_google_drive_videos',
    description:
      'List the videos in the caller’s connected Google Drive. Use when they ask to check Drive, find b-roll, or before dispatching a render from a Drive file.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Optional filter (b-roll, intro). Omit to list all videos.' } }, required: [] },
  },
  {
    name: 'dispatch_mini_run',
    description:
      'Dispatch a source video to the Mini-Run render pipeline to produce a 9:16 short. Call after a Drive file or project asset is identified and the user asks to render, cut a short, or make it 9:16.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        sourceAssetId: { type: 'string' },
        bucket: { type: 'string' },
        storagePath: { type: 'string' },
        mimeType: { type: 'string' },
        durationMs: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['projectId', 'sourceAssetId', 'bucket', 'storagePath', 'mimeType'],
    },
  },
]
