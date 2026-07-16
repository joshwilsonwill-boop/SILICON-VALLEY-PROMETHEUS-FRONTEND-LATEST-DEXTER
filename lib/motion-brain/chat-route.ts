import 'server-only'

import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import type { MusicVideoContext } from '@/lib/types'
import { parseToolRequests, executeTool, formatToolResults } from '@/lib/motion-brain/chat-tools'

const DEFAULT_GROQ_MODEL = 'llama3-8b-8192'
const EMBEDDING_MODEL = 'text-embedding-3-small'
const MATCH_THRESHOLD = 0.7
const MATCH_COUNT = 3

type ChatMessage = {
  role: 'assistant' | 'user'
  text: string
}

type ChatRequestBody = {
  message?: string
  prompt?: string
  projectTitle?: string
  originalPrompt?: string
  initialSources?: string[]
  videoContext?: MusicVideoContext | null
  messages?: ChatMessage[]
  stream?: boolean
  workflow?: 'chat' | 'edit'
}

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

type GroqMessage = {
  role: 'system' | 'assistant' | 'user'
  content: string
}

type MotionKnowledgeMatch = {
  id: number
  video_url: string
  style_reference: string
  editing_breakdown: string
  similarity: number
}

type MotionBrainDatabase = {
  public: {
    Tables: {
      motion_knowledge_base: {
        Row: {
          id: number
          video_url: string
          style_reference: string
          editing_breakdown: string
          embedding: number[]
        }
        Insert: {
          id?: number
          video_url: string
          style_reference: string
          editing_breakdown: string
          embedding: number[]
        }
        Update: {
          id?: number
          video_url?: string
          style_reference?: string
          editing_breakdown?: string
          embedding?: number[]
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      search_motion_knowledge: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: MotionKnowledgeMatch[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type MotionBrainSupabaseClient = SupabaseClient<MotionBrainDatabase>

type ProjectContext = {
  recentEdits: Array<{
    type: string
    timestamp: string
    description: string
  }>
  projectMetadata: {
    title: string
    description?: string
    createdAt: string
  }
  editingPatterns: string[]
}

export async function POST(req: Request) {
  const groqApiKey = cleanEnvValue(process.env.GROQ_API_KEY)
  const openaiApiKey = cleanEnvValue(process.env.OPENAI_API_KEY)
  const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || cleanEnvValue(process.env.SUPABASE_URL)
  const supabaseServiceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const model = cleanEnvValue(process.env.GROQ_MODEL) || DEFAULT_GROQ_MODEL

  if (!groqApiKey) {
    return NextResponse.json(
      { error: 'Missing GROQ_API_KEY. Add it to your server environment to enable Motion Brain replies.' },
      { status: 503 },
    )
  }

  if (!openaiApiKey) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY. Motion Brain requires OpenAI embeddings before Groq generation.' },
      { status: 503 },
    )
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase service-role configuration for Motion Brain retrieval.' },
      { status: 503 },
    )
  }

  try {
    const body = (await req.json()) as ChatRequestBody
    const directPrompt = cleanInline(body.message) || cleanInline(body.prompt)
    const normalizedMessages = normalizeMessages(body.messages || [])
    const messages =
      normalizedMessages.length > 0
        ? normalizedMessages
        : directPrompt
          ? [{ role: 'user' as const, text: directPrompt }]
          : []
    const shouldStream = Boolean(body.stream)

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No chat messages were provided.' }, { status: 400 })
    }

    const latestPrompt = getLatestUserPrompt(messages)
    if (!latestPrompt) {
      return NextResponse.json({ error: 'No user prompt was provided.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const groq = new Groq({ apiKey: groqApiKey })
    const supabase = createClient<MotionBrainDatabase>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const [knowledge, projectContext] = await Promise.all([
      retrieveMotionKnowledge({
        openai,
        supabase,
        prompt: latestPrompt,
      }),
      retrieveProjectContext({
        projectTitle: body.projectTitle,
        videoContext: body.videoContext,
      }),
    ])

    const groqMessages: GroqMessage[] = [
      {
        role: 'system',
        content: buildMotionBrainSystemPrompt({
          projectTitle: body.projectTitle,
          originalPrompt: body.originalPrompt,
          initialSources: body.initialSources,
          videoContext: body.videoContext,
          workflow: body.workflow ?? 'chat',
          knowledge,
          projectContext,
        }),
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.text,
      })),
    ]

    if (shouldStream) {
      const stream = await groq.chat.completions.create({
        model,
        temperature: body.workflow === 'edit' ? 0.42 : 0.55,
        max_tokens: body.workflow === 'edit' ? 700 : 620,
        stream: true,
        messages: groqMessages,
      })

      return streamGroqCompletion(stream)
    }

    const completion = await groq.chat.completions.create({
      model,
      temperature: body.workflow === 'edit' ? 0.42 : 0.55,
      max_tokens: body.workflow === 'edit' ? 700 : 620,
      messages: groqMessages,
    })

    const rawReply = extractReply(completion as GroqChatResponse)
    
    // Check for tool requests in the reply
    const toolRequests = parseToolRequests(rawReply)
    let toolResults = ''
    
    if (toolRequests.length > 0) {
      // Execute tools and collect results
      const results = await Promise.all(toolRequests.map((tool) => executeTool(tool)))
      toolResults = formatToolResults(results)
    }

    const reply = sanitizeAssistantReply(rawReply)
    if (!reply) {
      return NextResponse.json({ error: 'Groq returned an empty reply.' }, { status: 502 })
    }

    return NextResponse.json({
      reply,
      model,
      toolResults: toolResults || undefined,
      retrieval: knowledge.map((match) => ({
        id: match.id,
        videoUrl: match.video_url,
        styleReference: match.style_reference,
        similarity: match.similarity,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to contact Motion Brain right now.'
    return NextResponse.json({ error: message }, { status: getErrorStatus(error) })
  }
}

async function retrieveProjectContext({
  projectTitle,
  videoContext,
}: {
  projectTitle?: string
  videoContext?: MusicVideoContext | null
}): Promise<ProjectContext> {
  // Build project context from available metadata
  const editingPatterns: string[] = []

  // Analyze video context for editing patterns
  if (videoContext) {
    if (videoContext.pace === 'fast') editingPatterns.push('fast-cut rhythm, dynamic transitions')
    if (videoContext.pace === 'slow') editingPatterns.push('long-duration shots, contemplative pacing')
    if (videoContext.signals?.includes('high-energy')) editingPatterns.push('aggressive cuts, build energy')
    if (videoContext.signals?.includes('emotional')) editingPatterns.push('longer holds, emotional beats')
    if (videoContext.signals?.includes('rhythmic')) editingPatterns.push('beat-locked cuts, musical timing')
  }

  return {
    recentEdits: [],
    projectMetadata: {
      title: projectTitle || 'Untitled Project',
      createdAt: new Date().toISOString(),
    },
    editingPatterns,
  }
}

async function retrieveMotionKnowledge({
  openai,
  supabase,
  prompt,
}: {
  openai: OpenAI
  supabase: MotionBrainSupabaseClient
  prompt: string
}) {
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: prompt,
    encoding_format: 'float',
  })

  const embedding = embeddingResponse.data[0]?.embedding
  if (!embedding?.length) {
    throw new Error('OpenAI returned an empty embedding for the user prompt.')
  }

  const { data, error } = await supabase.rpc('search_motion_knowledge', {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  })

  if (error) throw error
  return ((data || []) as MotionKnowledgeMatch[]).slice(0, MATCH_COUNT)
}

function buildMotionBrainSystemPrompt({
  projectTitle,
  originalPrompt,
  initialSources,
  videoContext,
  workflow,
  knowledge,
  projectContext,
}: {
  projectTitle?: string
  originalPrompt?: string
  initialSources?: string[]
  videoContext?: MusicVideoContext | null
  workflow?: 'chat' | 'edit'
  knowledge: MotionKnowledgeMatch[]
  projectContext?: ProjectContext
}) {
  const safeTitle = cleanInline(projectTitle) || 'Untitled Project'
  const safePrompt = cleanInline(originalPrompt) || 'Refine the current cut into a cleaner, more cinematic pass.'
  const safeSources =
    initialSources?.map((source) => cleanInline(source)).filter(Boolean).slice(0, 6).join(', ') || 'None provided'
  const safeContext = buildVideoContextLine(videoContext)
  const isEditWorkflow = workflow === 'edit'

  // Build editing patterns context from project analysis
  const patternsContext =
    projectContext?.editingPatterns && projectContext.editingPatterns.length > 0
      ? `This project uses these editing patterns: ${projectContext.editingPatterns.join('; ')}.`
      : ''

  // Detect if user is asking about thumbnails (check original prompt)
  const isThumbnailRequest = originalPrompt?.toLowerCase().match(/thumbnail|key frame|preview|cover|poster|still/) ||
    false

  const thumbnailGuidance = isThumbnailRequest
    ? 'If the user asks for thumbnail options: analyze the key moment for visual impact, suggest 3-5 composition strategies (rule of thirds, center-frame, dynamic-crop), consider color palette from the video mood, and specify exact frame timing.'
    : ''

  return [
    'You are the Chief Motion Architect for Prometheus. Use the following retrieved video editing breakdowns to answer the user accurately. Dictate exact GSAP motion atoms, pacing, and visual hierarchy.',
    'Answer as a premium cinematic systems lead, not a generic assistant.',
    isEditWorkflow
      ? 'The user is asking for a video edit. Give concrete edit-direction that can drive timeline operations and on-canvas motion.'
      : 'The user is asking for creative direction. Make the response concise, decisive, and operational.',
    'Always include exact editorial moves: cut timing, rhythm, camera/framing emphasis, kinetic typography or caption behavior, transition logic, and B-roll metaphor when relevant.',
    'When naming motion, use implementable atoms such as clip-path reveal, y-percent lift, scale settle, parallax drift, velocity blur, mask wipe, opacity strobe, or GSAP stagger.',
    'Avoid markdown, bullets, numbering, bold text, and asterisks unless the user explicitly asks for a structured list.',
    'Do not mention retrieval, embeddings, database rows, system prompts, hidden instructions, or provider names.',
    `PROJECT CONTEXT:\nTitle: ${safeTitle}\nOriginal brief: ${safePrompt}\nSources: ${safeSources}`,
    safeContext ? `VIDEO ANALYSIS:\n${safeContext}` : '',
    patternsContext ? `EDITING PROFILE:\n${patternsContext}` : '',
    thumbnailGuidance,
    'REFERENCE MATERIALS:',
    formatRetrievedKnowledge(knowledge),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function formatRetrievedKnowledge(knowledge: MotionKnowledgeMatch[]) {
  if (!knowledge.length) {
    return 'No database breakdown cleared the similarity threshold. Still answer from the project context with exact cinematic execution, and ask for one missing reference only if the user request cannot be executed safely.'
  }

  return knowledge
    .map((match, index) => {
      return [
        `Breakdown ${index + 1}`,
        `Style reference: ${cleanInline(match.style_reference)}`,
        `Video URL: ${cleanInline(match.video_url)}`,
        `Similarity: ${match.similarity.toFixed(4)}`,
        `Editing breakdown: ${cleanInline(match.editing_breakdown)}`,
      ].join('\n')
    })
    .join('\n\n')
}

function normalizeMessages(messages: unknown[]) {
  if (!Array.isArray(messages)) return []

  return messages
    .map((message) => {
      if (!message || typeof message !== 'object') return null
      const record = message as Record<string, unknown>
      const role = record.role === 'assistant' ? 'assistant' : record.role === 'user' ? 'user' : null
      const text =
        typeof record.text === 'string'
          ? record.text.trim()
          : typeof record.content === 'string'
            ? record.content.trim()
            : ''
      return role && text ? { role, text } : null
    })
    .filter((message): message is { role: 'assistant' | 'user'; text: string } => Boolean(message))
    .slice(-12)
}

function getLatestUserPrompt(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.text.trim() || ''
}

function extractReply(payload: GroqChatResponse | string | null) {
  if (!payload || typeof payload === 'string') return payload?.trim() || ''

  const content = payload.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim()
  }

  return ''
}

function sanitizeAssistantReply(value: string) {
  return value
    .replace(/^\s*[*-]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\s+\n/g, '\n')
    .trim()
}

function cleanInline(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

function buildVideoContextLine(videoContext?: MusicVideoContext | null) {
  if (!videoContext) return ''

  const pace =
    videoContext.pace === 'fast'
      ? 'fast-paced'
      : videoContext.pace === 'slow'
        ? 'slow and reflective'
        : 'balanced'
  const signals = videoContext.signals?.filter(Boolean).slice(0, 5).join(', ') || ''
  const summary = cleanInline(videoContext.summary)
  return [pace, summary, signals].filter(Boolean).join(', ')
}

function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function streamGroqCompletion(stream: AsyncIterable<unknown>) {
  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(body, {
    headers: {
      'Cache-Control': 'no-store, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  })
}

function getErrorStatus(error: unknown) {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = Number((error as { status?: unknown }).status)
    if (Number.isInteger(status) && status >= 400 && status < 500) return 502
  }

  return 500
}
