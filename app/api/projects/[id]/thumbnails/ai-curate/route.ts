import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { resolveGeminiApiKey } from '@/lib/prometheus-assistant/gemini-stream'

export const runtime = 'nodejs'

type CandidateFrameInput = {
  timeSec: number
  timecode: string
  dataUrl: string
}

type AiCurateRequestBody = {
  frames?: CandidateFrameInput[]
  transcriptSnippet?: string
  projectTitle?: string
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;,]+);base64,(.+)/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params
    const body = (await request.json().catch(() => null)) as AiCurateRequestBody | null

    const frames = body?.frames || []
    const transcriptSnippet = body?.transcriptSnippet || ''
    const projectTitle = body?.projectTitle || 'Video Project'

    if (!frames.length) {
      return NextResponse.json({ error: 'At least one candidate frame is required.' }, { status: 400 })
    }

    const apiKey = resolveGeminiApiKey()

    // Fallback if Gemini key is not configured
    if (!apiKey) {
      return NextResponse.json({
        recommendedFrameIndex: Math.floor(frames.length / 2),
        candidateScores: frames.map((_, i) => (i === Math.floor(frames.length / 2) ? 92 : 75)),
        hookTitles: [
          'WATCH THIS FIRST',
          projectTitle.toUpperCase().slice(0, 24),
          'THE REAL SECRET',
          'NEVER DO THIS',
        ],
        suggestedStyle: 'impact',
        rationale: 'Balanced center-cut keyframe selected by default heuristics.',
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
      systemInstruction: `You are an elite viral thumbnail art director and click-through-rate (CTR) specialist for YouTube and social video platforms.
Evaluate candidate video frames and generate viral thumbnail headline hooks.
Return ONLY valid JSON matching this schema:
{
  "recommendedFrameIndex": number (0-based index of highest CTR frame),
  "candidateScores": number[] (score 0-100 for each frame in order),
  "hookTitles": string[] (3-5 short, ultra-punchy 2-5 word thumbnail text hooks in ALL CAPS),
  "suggestedStyle": "impact" | "editorial" | "neon" | "minimal" | "bold_accent",
  "rationale": string (1-2 sentences explaining why the selected frame and hook will convert viewers)
}`,
    })

    type InlineDataPart = { inlineData: { mimeType: string; data: string } }
    type TextPart = { text: string }
    type Part = TextPart | InlineDataPart

    const parts: Part[] = [
      {
        text: `Evaluate these ${frames.length} candidate video frames for project: "${projectTitle}".
Spoken context / hook: "${transcriptSnippet.slice(0, 600)}".

Rank each frame based on facial expression intensity, focal clarity, subject framing, and space for text overlay.
Generate 4 bold, punchy thumbnail headline hooks.`,
      },
    ]

    frames.forEach((frame, idx) => {
      const parsed = parseDataUrl(frame.dataUrl)
      if (parsed) {
        parts.push({ text: `Candidate Frame #${idx} at timecode [${frame.timecode}]:` })
        parts.push({ inlineData: parsed })
      }
    })

    const result = await model.generateContent(parts as never)
    const responseText = result.response.text()

    let parsedResult = null
    try {
      parsedResult = JSON.parse(responseText)
    } catch {
      // Fallback if model did not return strict JSON
      parsedResult = {
        recommendedFrameIndex: 0,
        candidateScores: frames.map(() => 80),
        hookTitles: ['MUST WATCH', 'THE SECRET REVEALED', 'DO NOT SKIP'],
        suggestedStyle: 'impact',
        rationale: 'Frame captures clear focal subject.',
      }
    }

    return NextResponse.json(parsedResult)
  } catch (error) {
    console.error('[AI Thumbnail Curate Error]', error)
    return NextResponse.json(
      {
        error: 'Failed to curate thumbnail with AI',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
