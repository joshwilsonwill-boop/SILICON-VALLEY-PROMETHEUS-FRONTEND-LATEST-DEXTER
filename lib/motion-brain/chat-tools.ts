/**
 * Tool definitions and handlers for Motion Brain chat
 * Enables specialized operations like thumbnail analysis and timing suggestions
 */

import type { MusicVideoContext } from '@/lib/types'

export type ToolRequest = {
  name: 'analyze-thumbnail-strategy' | 'suggest-edit-timing' | 'retrieve-similar-projects'
  params: Record<string, unknown>
}

export type ToolResult = {
  toolName: string
  status: 'success' | 'error'
  result: string
  executionTime?: number
}

/**
 * Parse Groq response for tool requests
 * Format: [TOOL_REQUEST:tool_name|param1=value1|param2=value2]
 */
export function parseToolRequests(response: string): ToolRequest[] {
  const toolPattern = /\[TOOL_REQUEST:([a-z-]+)([^\]]*)\]/gi
  const tools: ToolRequest[] = []

  let match
  while ((match = toolPattern.exec(response)) !== null) {
    const toolName = match[1].toLowerCase()
    const paramsStr = match[2].trim()

    // Parse parameters
    const params: Record<string, string> = {}
    if (paramsStr) {
      const paramPairs = paramsStr.split('|')
      paramPairs.forEach((pair) => {
        const [key, value] = pair.split('=')
        if (key && value) {
          params[key.trim()] = value.trim()
        }
      })
    }

    if (isValidToolName(toolName)) {
      tools.push({
        name: toolName as ToolRequest['name'],
        params,
      })
    }
  }

  return tools
}

/**
 * Validate tool name against allowed tools
 */
function isValidToolName(name: string): name is ToolRequest['name'] {
  return ['analyze-thumbnail-strategy', 'suggest-edit-timing', 'retrieve-similar-projects'].includes(name)
}

/**
 * Analyze video to suggest thumbnail composition and timing
 * Returns: frame timing, composition strategy, color recommendations
 */
export async function analyzeThumbnailStrategy(params: {
  videoUrl?: string
  duration?: number
  intendedMood?: string
}): Promise<ToolResult> {
  const startTime = performance.now()

  try {
    const mood = (params.intendedMood || 'neutral').toLowerCase()

    // Determine composition strategies based on mood
    const compositions: string[] = []
    if (mood.includes('energy') || mood.includes('dynamic')) {
      compositions.push('Rule of thirds with dynamic crop', 'Diagonal leading lines', 'Off-center subject')
    } else if (mood.includes('calm') || mood.includes('peaceful')) {
      compositions.push('Center-frame symmetry', 'Golden ratio placement', 'Negative space emphasis')
    } else {
      compositions.push('Rule of thirds balance', 'Center composition', 'Dynamic crop option')
    }

    // Color palette recommendations
    const colorPalettes: Record<string, string[]> = {
      energetic: ['vibrant high-contrast', 'saturated tones', 'bright highlights'],
      calm: ['desaturated pastels', 'cool blues/greens', 'subtle gradients'],
      dramatic: ['deep shadows', 'bold contrast', 'selective color'],
      neutral: ['balanced saturation', 'natural tones', 'professional grade'],
    }

    const palette = colorPalettes[mood] || colorPalettes.neutral

    // Suggested frame timing (relative to video duration)
    const suggestedTimings = [
      '25% through video (establishing key moment)',
      '50% through video (midpoint impact)',
      '75% through video (build to climax)',
    ]

    const result = {
      compositions,
      colorPalette: palette,
      suggestedFrameTimings: suggestedTimings,
      generationReady: true,
    }

    const executionTime = performance.now() - startTime

    return {
      toolName: 'analyze-thumbnail-strategy',
      status: 'success',
      result: JSON.stringify(result, null, 2),
      executionTime: Math.round(executionTime),
    }
  } catch (error) {
    return {
      toolName: 'analyze-thumbnail-strategy',
      status: 'error',
      result: `Failed to analyze thumbnail strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Suggest exact frame numbers and edit timing
 */
export async function suggestEditTiming(params: {
  projectTempo?: string
  clipDuration?: number
  existingCuts?: string
}): Promise<ToolResult> {
  const startTime = performance.now()

  try {
    const tempo = (params.projectTempo || 'moderate').toLowerCase()

    // Calculate timing based on tempo
    const timingMap: Record<string, { cutFrequency: string; paceDesc: string }> = {
      fast: { cutFrequency: 'Every 1-2 seconds', paceDesc: 'rapid cuts, high energy' },
      slow: { cutFrequency: 'Every 4-8 seconds', paceDesc: 'long holds, contemplative' },
      moderate: { cutFrequency: 'Every 2-4 seconds', paceDesc: 'balanced rhythm' },
    }

    const timing = timingMap[tempo] || timingMap.moderate

    // Generate suggested keyframes
    const duration = params.clipDuration || 60
    const numFrames = tempo === 'fast' ? Math.ceil(duration / 2) : tempo === 'slow' ? Math.ceil(duration / 6) : Math.ceil(duration / 3)

    const suggestedFrames: number[] = []
    for (let i = 1; i <= numFrames; i++) {
      suggestedFrames.push(Math.round((i / (numFrames + 1)) * duration * 24)) // Convert to frame numbers (assuming 24fps)
    }

    const result = {
      cutFrequency: timing.cutFrequency,
      paceDescription: timing.paceDesc,
      suggestedFrameNumbers: suggestedFrames.slice(0, 8), // Limit to 8 suggestions
      totalSuggestedCuts: suggestedFrames.length,
    }

    const executionTime = performance.now() - startTime

    return {
      toolName: 'suggest-edit-timing',
      status: 'success',
      result: JSON.stringify(result, null, 2),
      executionTime: Math.round(executionTime),
    }
  } catch (error) {
    return {
      toolName: 'suggest-edit-timing',
      status: 'error',
      result: `Failed to suggest timing: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Retrieve similar past projects for reference and inspiration
 */
export async function retrieveSimilarProjects(params: {
  currentProjectDescription?: string
  limit?: number
}): Promise<ToolResult> {
  const startTime = performance.now()

  try {
    // In a real implementation, this would query a database of past projects
    // For now, return a placeholder with structure that the thinking display expects

    const description = (params.currentProjectDescription || 'music video').toLowerCase()

    // Analyze description to generate relevant references
    const references: Array<{ title: string; relevance: string; approach: string }> = []

    if (description.includes('fast') || description.includes('energy')) {
      references.push({
        title: 'High-Energy Montage Pattern',
        relevance: 'fast-paced editing with rapid cuts',
        approach: 'Use 2-4 frame holds, aggressive transitions, rhythmic sync to beat',
      })
    }

    if (description.includes('cinematic') || description.includes('narrative')) {
      references.push({
        title: 'Narrative Flow Structure',
        relevance: 'story-driven pacing with emotional beats',
        approach: 'Long-form shots with strategic cuts at emotional peaks',
      })
    }

    references.push({
      title: 'General Motion Vocabulary',
      relevance: 'universal editing principles',
      approach: 'Combine your unique vision with proven motion grammar',
    })

    const result = {
      similarProjects: references,
      totalFound: references.length,
      recommended: references[0],
    }

    const executionTime = performance.now() - startTime

    return {
      toolName: 'retrieve-similar-projects',
      status: 'success',
      result: JSON.stringify(result, null, 2),
      executionTime: Math.round(executionTime),
    }
  } catch (error) {
    return {
      toolName: 'retrieve-similar-projects',
      status: 'error',
      result: `Failed to retrieve similar projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Execute a tool request and return result
 */
export async function executeTool(tool: ToolRequest): Promise<ToolResult> {
  switch (tool.name) {
    case 'analyze-thumbnail-strategy':
      return analyzeThumbnailStrategy(tool.params as Parameters<typeof analyzeThumbnailStrategy>[0])

    case 'suggest-edit-timing':
      return suggestEditTiming(tool.params as Parameters<typeof suggestEditTiming>[0])

    case 'retrieve-similar-projects':
      return retrieveSimilarProjects(tool.params as Parameters<typeof retrieveSimilarProjects>[0])

    default:
      return {
        toolName: tool.name,
        status: 'error',
        result: `Unknown tool: ${tool.name}`,
      }
  }
}

/**
 * Format tool results for inclusion in system context
 */
export function formatToolResults(results: ToolResult[]): string {
  if (results.length === 0) return ''

  const formattedResults = results
    .map((result) => {
      const status = result.status === 'success' ? '✓' : '✗'
      const timing = result.executionTime ? ` (${result.executionTime}ms)` : ''
      return [`${status} ${result.toolName}${timing}`, result.result].join('\n')
    })
    .join('\n\n')

  return `Tool Execution Results:\n${formattedResults}`
}
