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
import {
  buildOpenAIImageEditFormData,
  DEFAULT_THUMBNAIL_IMAGE_MODEL,
  extractOpenAIImageEditResult,
  resolveOpenAIImageEditEndpoint,
} from '@/lib/thumbnails/openai-image-edit'

import { buildStudioArtDirection, parseStudioDesign, resolveStudioImageModel, resolveStudioImageSize, type StudioDesign } from '@/lib/thumbnails/studio-art-direction'
import { getStudioReference, STUDIO_REFERENCES } from '@/lib/thumbnails/studio-references'
import { compactGeneratedThumbnail } from '@/lib/thumbnails/thumbnail-output'
import { THUMBNAIL_PROVIDER_TIMEOUT_MS } from '@/lib/thumbnails/thumbnail-runtime'
import { applyThumbnailCreativeDirection, applyThumbnailIterationDirection } from '@/lib/thumbnails/creative-direction'
import { buildThumbnailPromptPlannerText, extractPlannedArtDirection, THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS } from '@/lib/thumbnails/retention-prompt'

export const runtime = 'nodejs'
export const maxDuration = 300
const MAX_REQUEST_BODY_BYTES = 4_000_000

interface NanoBananaRequestBody {
  studioDesign?: unknown
  frameDataUrl?: string
  baseThumbnailUrl?: string
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
  iterationPrompt?: string
  aspectRatio?: '9:16' | '2:3' | '1:1' | '3:2' | '16:9'
  referenceImages?: string[]
  lockChannelStyle?: boolean
  studioReferenceId?: string
  projectTitle?: string
  transcriptSnippet?: string
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
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id') || request.headers.get('x-request-id') || 'unavailable'
  let stage = 'authentication'
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
    stage = 'request parsing'
    const body = (await request.json().catch(() => null)) as NanoBananaRequestBody | null

    const frameDataUrl = body?.frameDataUrl
    if (!frameDataUrl || !parseImageDataUrl(frameDataUrl)) {
      return NextResponse.json({ error: 'Select a video frame before generating a thumbnail.' }, { status: 400 })
    }
    const baseThumbnailUrl = typeof body?.baseThumbnailUrl === 'string' && parseImageDataUrl(body.baseThumbnailUrl)
      ? body.baseThumbnailUrl
      : undefined
    const iterationPrompt = typeof body?.iterationPrompt === 'string' ? body.iterationPrompt.trim().slice(0, 500) : ''
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
    const userPrompt = typeof body?.userPrompt === 'string' ? body.userPrompt.trim().slice(0, 500) : ''
    const aspectRatio = body?.aspectRatio || '9:16'
    const referenceImages = Array.isArray(body?.referenceImages)
      ? body.referenceImages.filter((reference): reference is string => typeof reference === 'string').slice(0, 4)
      : []
    const lockChannelStyle = body?.lockChannelStyle ?? true

    const archetype = SHORT_FORM_ARCHETYPES.find((a) => a.id === styleId) || SHORT_FORM_ARCHETYPES[0]

    const imageApiKey = process.env.THUMBNAIL_IMAGE_API_KEY?.trim()
    const useOpenAICompatibleImageApi = Boolean(imageApiKey)
    const geminiApiKey = useOpenAICompatibleImageApi ? '' : resolveGeminiApiKey()
    if (!imageApiKey && !geminiApiKey) {
      return NextResponse.json({ error: 'Thumbnail image generation is not configured. Add a server-side image API key and retry.' }, { status: 503 })
    }

    let channelDna: ChannelStyleDna | null = null
    let synthesizedPrompt = ''

    // 1. Channel Style-Lock Analysis via Gemini Multimodal Vision
    if (geminiApiKey && lockChannelStyle && !studioDesign && (referenceImages.length > 0 || frameDataUrl)) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey)
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

      // Keep semantic project context available to image-only deployments too.
      // The Gemini planner below adds a visual concept when its key is present;
      // this grounded brief still reaches the image model when it is not.
      const transcriptContext = typeof body?.transcriptSnippet === 'string' ? body.transcriptSnippet.trim().slice(0, 5000) : ''
      const projectContext = typeof body?.projectTitle === 'string' ? body.projectTitle.trim().slice(0, 120) : ''
      synthesizedPrompt += [
        '\n\nVIDEO CONTEXT FOR ACCURATE CREATIVE DIRECTION:',
        projectContext ? `Project title: ${projectContext}` : '',
        transcriptContext ? `Transcript excerpt: ${transcriptContext}` : 'No transcript excerpt is available; use only the supplied frame and creator brief.',
        'Represent the actual subject and theme. Do not turn transcript lines into extra on-image text, and do not invent claims, results, props, or scenes.',
      ].filter(Boolean).join('\n')

      if (geminiApiKey) {
        try {
          const source = parseImageDataUrl(frameDataUrl)
          const plannerParts: Array<Record<string, unknown>> = [{
            text: buildThumbnailPromptPlannerText({
              projectTitle: typeof body?.projectTitle === 'string' ? body.projectTitle : '',
              transcriptSnippet: typeof body?.transcriptSnippet === 'string' ? body.transcriptSnippet : '',
              headline,
              creativeDirection: userPrompt,
              aspectRatio: effectiveAspect,
              referenceCue,
            }),
          }]
          if (source) plannerParts.push({ inlineData: { mimeType: source.mimeType, data: source.data } })
          for (const reference of referenceImages) {
            const parsedReference = parseImageDataUrl(reference)
            if (parsedReference) plannerParts.push({ inlineData: { mimeType: parsedReference.mimeType, data: parsedReference.data } })
          }
          if (baseThumbnailUrl) {
            const parsedBase = parseImageDataUrl(baseThumbnailUrl)
            if (parsedBase) plannerParts.push({ inlineData: { mimeType: parsedBase.mimeType, data: parsedBase.data } })
          }
          const planner = new GoogleGenerativeAI(geminiApiKey).getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json', temperature: 0.35 },
            systemInstruction: THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS,
          })
          const planned = await planner.generateContent(plannerParts as never)
          const artDirection = extractPlannedArtDirection(planned.response?.text() ?? '')
          if (artDirection) synthesizedPrompt += '\n\nRETENTION-AWARE CREATIVE CONCEPT: ' + artDirection
          else console.warn('[Thumbnail Prompt Planner]', { requestId, result: 'empty-or-invalid-json' })
        } catch {
          console.warn('[Thumbnail Prompt Planner]', { requestId, result: 'unavailable; using structured art direction' })
        }
      }
    }
    synthesizedPrompt = applyThumbnailCreativeDirection(synthesizedPrompt, userPrompt)
    if (iterationPrompt) {
      synthesizedPrompt = applyThumbnailIterationDirection(synthesizedPrompt, iterationPrompt)
    }
    const imageModel = useOpenAICompatibleImageApi
      ? process.env.THUMBNAIL_IMAGE_MODEL?.trim() || DEFAULT_THUMBNAIL_IMAGE_MODEL
      : studioDesign ? resolveStudioImageModel(studioDesign.quality) : 'gemini-2.5-flash-image'
    const imageBody: BodyInit = useOpenAICompatibleImageApi
      ? buildOpenAIImageEditFormData({
          model: imageModel,
          prompt: synthesizedPrompt,
          frameDataUrl,
          baseThumbnailUrl,
          referenceImages,
          aspectRatio: effectiveAspect,
          quality: studioDesign?.quality ?? 'fast',
        })
      : JSON.stringify(buildNanoBananaImageRequest({
          prompt: synthesizedPrompt,
          frameDataUrl,
          baseThumbnailUrl,
          referenceImages,
          aspectRatio: effectiveAspect,
          ...(studioDesign ? { imageSize: resolveStudioImageSize(studioDesign.quality) } : {}),
        }))
    stage = 'image generation'
    const providerStartedAt = Date.now()
    const provider = useOpenAICompatibleImageApi ? 'openai-compatible image group' : 'Google Gemini'
    console.info('[Thumbnail Stage]', { requestId, provider, stage: 'image generation started', model: imageModel, quality: studioDesign?.quality || 'legacy', requestBytes: contentLength || undefined })
    const endpoint = useOpenAICompatibleImageApi
      ? resolveOpenAIImageEditEndpoint(process.env.THUMBNAIL_IMAGE_API_BASE_URL)
      : 'https://generativelanguage.googleapis.com/v1/models/' + imageModel + ':generateContent'
    const imageResponse = await fetch(endpoint, {
      method: 'POST',
      headers: useOpenAICompatibleImageApi
        ? { Authorization: `Bearer ${imageApiKey}` }
        : { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey! },
      body: imageBody,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(THUMBNAIL_PROVIDER_TIMEOUT_MS)]),
    })
    const responseContentType = imageResponse.headers.get('content-type') || ''
    console.info('[Thumbnail Stage]', { requestId, provider, stage: 'image generation finished', status: imageResponse.status, contentType: responseContentType, durationMs: Date.now() - providerStartedAt })
    const imageResult = responseContentType.includes('json')
      ? await imageResponse.json().catch(() => null)
      : await imageResponse.text().catch(() => '')
    if (!imageResponse.ok) {
      const providerMessage = typeof imageResult === 'string'
        ? imageResult
        : typeof imageResult?.error?.message === 'string'
          ? imageResult.error.message
          : ''
      console.error('[Thumbnail Image Provider Error]', { requestId, provider, status: imageResponse.status, contentType: responseContentType })
      const htmlGateway = !responseContentType.includes('json')
      const error = imageResponse.status === 401 || imageResponse.status === 403
        ? useOpenAICompatibleImageApi
          ? 'The configured image group rejected its server credential. Check the dedicated image-generation key in the deployment environment.'
          : 'Google rejected the configured Gemini API credential. Check the server key and image-generation access.'
        : imageResponse.status === 429
          ? 'The image provider reached its rate limit or usage quota. Check the group quota and retry.'
        : htmlGateway
            ? `The image provider returned an HTML gateway error (HTTP ${imageResponse.status}). Request reference: ${requestId}. Check the matching function and provider logs.`
            : `${provider} failed (HTTP ${imageResponse.status}). ${providerMessage.slice(0, 220) || 'Retry in a moment.'} Request reference: ${requestId}.`
      return NextResponse.json({ error }, { status: 502 })
    }

    const generatedDataUrl = useOpenAICompatibleImageApi
      ? extractOpenAIImageEditResult(imageResult)
      : extractGeneratedImage(imageResult)
    if (!generatedDataUrl) {
      return NextResponse.json({ error: 'Nano Banana returned no image. Try another frame or direction.' }, { status: 502 })
    }
    stage = 'image compaction'
    const dataUrl = await compactGeneratedThumbnail(generatedDataUrl)

    return NextResponse.json({
      success: true,
      mode: useOpenAICompatibleImageApi ? 'openai_compatible_image_edit' : 'nano_banana_image',
      model: imageModel,
      dataUrl,
      prompt: synthesizedPrompt,
      styleDna: channelDna,
      projectId,
    })
  } catch (error) {
    console.error('[Nano Banana Route Error]', { requestId, stage, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) })
    if (request.signal.aborted) return NextResponse.json({ error: 'Thumbnail generation cancelled.' }, { status: 499 })
    if (error instanceof Error && error.name === 'TimeoutError') return NextResponse.json({ error: 'The image model did not finish within four minutes. Your current versions are safe. Retry, or choose Fast quality for a quicker render.' }, { status: 504 })
    return NextResponse.json(
      {
        error: 'Failed to process Nano Banana generation request',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
