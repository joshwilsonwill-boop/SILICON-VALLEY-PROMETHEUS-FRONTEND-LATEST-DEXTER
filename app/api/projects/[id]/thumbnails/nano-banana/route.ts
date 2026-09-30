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

import { buildStudioArtDirection, parseStudioDesign, resolveStudioImageModel, resolveStudioImageSize, type StudioDesign } from '@/lib/thumbnails/studio-art-direction'
import { getStudioReference, STUDIO_REFERENCES } from '@/lib/thumbnails/studio-references'
import { compactGeneratedThumbnail } from '@/lib/thumbnails/thumbnail-output'

export const runtime = 'nodejs'
export const maxDuration = 180
const MAX_REQUEST_BODY_BYTES = 4_000_000

interface NanoBananaRequestBody {
  studioDesign?: unknown
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
  aspectRatio?: '9:16' | '2:3' | '1:1' | '3:2' | '16:9'
  referenceImages?: string[]
  lockChannelStyle?: boolean
  studioReferenceId?: string
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
    const contentLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: 'Thumbnail request is too large. Remove a style reference or use a smaller source image.' }, { status: 413 })
    }

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
    let studioDesign: StudioDesign | null = null
    if (body?.studioDesign !== undefined) {
      try { studioDesign = parseStudioDesign(body.studioDesign) }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid thumbnail design.' }, { status: 400 }) }
    }
    if (headline.length > 64) return NextResponse.json({ error: 'Use a headline of 64 characters or fewer.' }, { status: 400 })
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
    if (apiKey && lockChannelStyle && !studioDesign && (referenceImages.length > 0 || frameDataUrl)) {
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
    const effectiveAspect = aspectRatio === '16:9' || aspectRatio === '3:2' || aspectRatio === '1:1' || aspectRatio === '2:3' || aspectRatio === '9:16' ? aspectRatio : '9:16'

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

    if (studioDesign) {
      const referenceId = typeof body?.studioReferenceId === 'string' && STUDIO_REFERENCES.some(reference => reference.id === body.studioReferenceId) ? body.studioReferenceId : ''
      const referenceCue = referenceId ? getStudioReference(referenceId).cue : ''
      synthesizedPrompt += '\n\n' + buildStudioArtDirection(studioDesign, headline, body?.highlightWord || '', referenceCue)
    }
    const imageModel = studioDesign ? resolveStudioImageModel(studioDesign.quality) : 'gemini-2.5-flash-image'
    const imageRequest = buildNanoBananaImageRequest({
      prompt: synthesizedPrompt,
      frameDataUrl,
      referenceImages,
      aspectRatio: effectiveAspect,
      ...(studioDesign ? { imageSize: resolveStudioImageSize(studioDesign.quality) } : {}),
    })
    const imageResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + imageModel + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(imageRequest),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(150000)]),
    })
    const imageResult = await imageResponse.json().catch(() => null)
    if (!imageResponse.ok) {
      console.error('[Nano Banana Image Generation]', imageResponse.status, imageResult?.error?.message)
      const providerMessage = typeof imageResult?.error?.message === 'string' ? imageResult.error.message : ''
      const safeProviderMessage = providerMessage.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted credential]').slice(0, 240)
      const error = imageResponse.status === 401 || imageResponse.status === 403
        ? 'Google rejected the configured Gemini API credential (HTTP ' + imageResponse.status + '). Check that the server key is valid and has image generation access.'
        : imageResponse.status === 429
          ? 'Google image generation rate limit or quota reached (HTTP 429). Wait a little or check the project quota.'
          : safeProviderMessage.toLowerCase().includes('api key') || safeProviderMessage.toLowerCase().includes('api_key')
            ? 'Google rejected the configured Gemini API credential: ' + safeProviderMessage
            : 'Google image generation failed (HTTP ' + imageResponse.status + '). ' + (safeProviderMessage || 'Try again in a moment.')
      return NextResponse.json({ error }, { status: 502 })
    }

    const generatedDataUrl = extractGeneratedImage(imageResult)
    if (!generatedDataUrl) {
      return NextResponse.json({ error: 'Nano Banana returned no image. Try another frame or direction.' }, { status: 502 })
    }
    const dataUrl = await compactGeneratedThumbnail(generatedDataUrl)

    return NextResponse.json({
      success: true,
      mode: 'nano_banana_image',
      model: imageModel,
      dataUrl,
      prompt: synthesizedPrompt,
      styleDna: channelDna,
      projectId,
    })
  } catch (error) {
    if (request.signal.aborted) return NextResponse.json({ error: 'Thumbnail generation cancelled.' }, { status: 499 })
    if (error instanceof Error && error.name === 'TimeoutError') return NextResponse.json({ error: 'Image generation timed out. Try again with Nano Banana 2.' }, { status: 504 })
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
