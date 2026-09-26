import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { resolveGeminiApiKey } from '@/lib/prometheus-assistant/gemini-stream'
import { SHORT_FORM_ARCHETYPES } from '@/lib/thumbnails/short-form-styles'
import { createClient } from '@/lib/supabase/server'
import {
  buildNanoBananaPrompt,
  VIRAL_THUMBNAIL_RECIPES,
} from '@/lib/thumbnails/nano-banana-rulebook'
import { buildNanoBananaImageRequest, extractGeneratedImage, parseImageDataUrl } from '@/lib/thumbnails/nano-banana-image'

export const runtime = 'nodejs'

interface NanoBananaRequestBody {
  frameDataUrl?: string
  headline?: string
  highlightWord?: string
  scriptAccent?: string
  subtitle?: string
  styleId?: string
  recipeId?: string
  backgroundId?: string
  textTreatmentId?: string
  proofArtifactId?: string
  directionalId?: string
  lightingId?: string
  brandColor?: string
  userPrompt?: string
  aspectRatio?: '9:16' | '2:3' | '1:1' | '16:9'
  referenceImages?: string[]
  lockChannelStyle?: boolean
}

interface ChannelStyleDna {
  colorPalette: {
    primary: string
    accent: string
    background: string
    rimLight: string
  }
  composition: {
    subjectPosition: 'center' | 'right' | 'left'
    bustScalePercent: number
    textPlacement: 'behind' | 'foreground' | 'split'
    proofArtifactType: 'ios_card' | 'metric_badge' | 'chalk_arrows' | 'paper_collage' | 'highlighter_chip'
  }
  lighting: {
    rimColor: string
    rimThicknessPx: number
    keyLightMood: string
  }
  headlineTreatment: {
    fontStyle: 'ultra_bold_condensed_sans' | 'editorial_serif' | 'stencil_grunge'
    backgroundChipColor?: string
    highlighterAccent?: boolean
  }
  expression: string
  refinedPrompt: string
}

function parseBase64(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;,]+);base64,(.+)/)
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = (await request.json().catch(() => null)) as NanoBananaRequestBody | null

    const frameDataUrl = body?.frameDataUrl
    if (!frameDataUrl || !parseImageDataUrl(frameDataUrl)) {
      return NextResponse.json({ error: 'Select a video frame before generating a thumbnail.' }, { status: 400 })
    }
    const headline = typeof body?.headline === 'string' ? body.headline.trim() : ''
    if (!headline) {
      return NextResponse.json({ error: 'Add a headline before generating a thumbnail.' }, { status: 400 })
    }
    const scriptAccent = body?.scriptAccent || ''
    const subtitle = body?.subtitle || ''
    const styleId = body?.styleId || 'behind_subject_blueprint'
    const brandColor = body?.brandColor || '#3E5C76'
    const userPrompt = body?.userPrompt || ''
    const aspectRatio = body?.aspectRatio || '9:16'
    const referenceImages = Array.isArray(body?.referenceImages)
      ? body.referenceImages.filter((reference): reference is string => typeof reference === 'string').slice(0, 4)
      : []
    const lockChannelStyle = body?.lockChannelStyle ?? true

    const archetype = SHORT_FORM_ARCHETYPES.find((a) => a.id === styleId) || SHORT_FORM_ARCHETYPES[0]

    const apiKey = resolveGeminiApiKey()
    if (!apiKey) {
      return NextResponse.json({ error: 'Nano Banana is unavailable: image generation is not configured.' }, { status: 503 })
    }

    let channelDna: ChannelStyleDna | null = null
    let synthesizedPrompt = ''

    // 1. Channel Style-Lock Analysis via Gemini Multimodal Vision
    if (apiKey && lockChannelStyle && (referenceImages.length > 0 || frameDataUrl)) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const visionModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
          systemInstruction: `You are an elite thumbnail art director and visual style profiler for top-tier creators.
Analyze the provided reference thumbnail(s) and the talking-head keyframe.
Extract the creator's channel visual DNA and construct a high-conversion, photorealistic image generation prompt.
Preserve the speaker's facial identity, bust crop, and high emotional arousal.
Return ONLY valid JSON matching this schema:
{
  "colorPalette": {
    "primary": string,
    "accent": string,
    "background": string,
    "rimLight": string
  },
  "composition": {
    "subjectPosition": "center" | "right" | "left",
    "bustScalePercent": number,
    "textPlacement": "behind" | "foreground" | "split",
    "proofArtifactType": "ios_card" | "metric_badge" | "chalk_arrows" | "paper_collage" | "highlighter_chip"
  },
  "lighting": {
    "rimColor": string,
    "rimThicknessPx": number,
    "keyLightMood": string
  },
  "headlineTreatment": {
    "fontStyle": "ultra_bold_condensed_sans" | "editorial_serif" | "stencil_grunge",
    "backgroundChipColor": string,
    "highlighterAccent": boolean
  },
  "expression": string,
  "refinedPrompt": string
}`,
        })

        type InlineDataPart = { inlineData: { mimeType: string; data: string } }
        type TextPart = { text: string }
        type Part = TextPart | InlineDataPart

        const parts: Part[] = [
          {
            text: `Analyze this creator's channel thumbnail aesthetic and talking-head keyframe.
Headline: "${headline}".
Script accent: "${scriptAccent}".
Subtitle: "${subtitle}".
Selected Archetype: "${archetype.name} - ${archetype.tagline}".
Brand accent: "${brandColor}".
${userPrompt ? `Creative direction: "${userPrompt}".` : ''}

Extract the exact Channel Style DNA (lighting ratios, color contrast, proof card style, contour wrap, typography) and construct a refined Imagen prompt that faithfully preserves the principal speaker's head/bust while applying this viral thumbnail style.`,
          },
        ]

        // Feed talking-head frame as principal subject anchor
        if (frameDataUrl) {
          const parsedFrame = parseBase64(frameDataUrl)
          if (parsedFrame) {
            parts.push({ text: 'Principal Speaker Video Keyframe (Talking Head Anchor):' })
            parts.push({ inlineData: { mimeType: parsedFrame.mimeType, data: parsedFrame.base64 } })
          }
        }

        // Feed reference images to lock onto channel aesthetic
        referenceImages.slice(0, 4).forEach((ref, idx) => {
          const parsedRef = parseBase64(ref)
          if (parsedRef) {
            parts.push({ text: `Channel Reference Thumbnail #${idx + 1}:` })
            parts.push({ inlineData: { mimeType: parsedRef.mimeType, data: parsedRef.base64 } })
          }
        })

        const analysisResult = await visionModel.generateContent(parts as never)
        const analysisText = analysisResult.response?.text()
        if (analysisText) {
          channelDna = JSON.parse(analysisText) as ChannelStyleDna
          if (channelDna?.refinedPrompt) {
            synthesizedPrompt = channelDna.refinedPrompt
          }
        }
      } catch (err) {
        console.warn('[Nano Banana Style-Lock Analysis]', err)
      }
    }

    const recipe = VIRAL_THUMBNAIL_RECIPES.find((r) => r.id === body?.recipeId)
    const effectiveAspect = aspectRatio === '16:9' ? '16:9' : aspectRatio === '1:1' ? '1:1' : aspectRatio === '2:3' ? '2:3' : '9:16'

    const rulebookPrompt = buildNanoBananaPrompt({
      headline,
      highlightWord: body?.highlightWord?.trim() || undefined,
      aspectRatio: effectiveAspect,
      backgroundId: body?.backgroundId || recipe?.backgroundStyle,
      textTreatmentId: body?.textTreatmentId || recipe?.textTreatmentStyle,
      proofArtifactId: body?.proofArtifactId || recipe?.proofArtifact,
      directionalId: body?.directionalId || recipe?.directionalStyle,
      lightingId: body?.lightingId || recipe?.lightingStyle,
      subjectPosition: recipe?.subjectPosition,
      userCreativeDirection: userPrompt,
    })
    synthesizedPrompt = channelDna?.refinedPrompt
      ? `${rulebookPrompt}\n\nREFERENCE ART DIRECTION: ${channelDna.refinedPrompt}`
      : rulebookPrompt

    const imageRequest = buildNanoBananaImageRequest({
      prompt: synthesizedPrompt,
      frameDataUrl,
      referenceImages,
      aspectRatio: effectiveAspect,
    })
    const imageResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(imageRequest),
    })
    const imageResult = await imageResponse.json().catch(() => null)
    if (!imageResponse.ok) {
      console.error('[Nano Banana Image Generation]', imageResponse.status, imageResult?.error?.message)
      return NextResponse.json({ error: 'Nano Banana could not generate this thumbnail. Please try again.' }, { status: 502 })
    }

    const dataUrl = extractGeneratedImage(imageResult)
    if (!dataUrl) {
      return NextResponse.json({ error: 'Nano Banana returned no image. Try another frame or direction.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      mode: 'nano_banana_image',
      dataUrl,
      prompt: synthesizedPrompt,
      styleDna: channelDna,
      projectId,
    })
  } catch (error) {
    console.error('[Nano Banana Route Error]', error)
    return NextResponse.json(
      {
        error: 'Failed to process Nano Banana generation request',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
