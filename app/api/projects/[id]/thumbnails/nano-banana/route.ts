import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { resolveGeminiApiKey } from '@/lib/prometheus-assistant/gemini-stream'
import { SHORT_FORM_ARCHETYPES } from '@/lib/thumbnails/short-form-styles'
import { createClient } from '@/lib/supabase/server'
import {
  buildNanoBananaPrompt,
  VIRAL_THUMBNAIL_RECIPES,
  BACKGROUND_SNIPPETS,
  TEXT_TREATMENT_SNIPPETS,
  PROOF_ARTIFACT_SNIPPETS,
  DIRECTIONAL_SNIPPETS,
} from '@/lib/thumbnails/nano-banana-rulebook'

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
  aspectRatio?: '9:16' | '9:6' | '1:1' | '16:9'
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
    const headline = body?.headline || 'THE TURNING POINT'
    const scriptAccent = body?.scriptAccent || ''
    const subtitle = body?.subtitle || ''
    const styleId = body?.styleId || 'behind_subject_blueprint'
    const brandColor = body?.brandColor || '#3E5C76'
    const userPrompt = body?.userPrompt || ''
    const aspectRatio = body?.aspectRatio || '9:16'
    const referenceImages = body?.referenceImages || []
    const lockChannelStyle = body?.lockChannelStyle ?? true

    const archetype = SHORT_FORM_ARCHETYPES.find((a) => a.id === styleId) || SHORT_FORM_ARCHETYPES[0]

    const apiKey = resolveGeminiApiKey()

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
    const effectiveAspect = aspectRatio === '16:9' ? '16:9' : aspectRatio === '1:1' ? '1:1' : '9:16'

    // High-conversion prompt synthesized via empirical Nano Banana rulebook
    if (!synthesizedPrompt) {
      synthesizedPrompt = buildNanoBananaPrompt({
        headline,
        highlightWord: body?.highlightWord || recipe?.highlightWord,
        aspectRatio: effectiveAspect,
        backgroundId: body?.backgroundId || recipe?.backgroundStyle,
        textTreatmentId: body?.textTreatmentId || recipe?.textTreatmentStyle,
        proofArtifactId: body?.proofArtifactId || recipe?.proofArtifact,
        directionalId: body?.directionalId || recipe?.directionalStyle,
        lightingId: body?.lightingId || recipe?.lightingStyle,
        userCreativeDirection: userPrompt,
      })
    }

    // 2. Try Google Imagen 3 (Nano Banana Image Model)
    if (apiKey) {
      try {
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generateImages:predict?key=${apiKey}`

        const imagenRes = await fetch(imagenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: synthesizedPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspectRatio === '16:9' ? '16:9' : aspectRatio === '1:1' ? '1:1' : '9:16',
              outputMimeType: 'image/jpeg',
            },
          }),
        })

        if (imagenRes.ok) {
          const imagenData = await imagenRes.json()
          const prediction = imagenData?.predictions?.[0]
          const imageBase64 = prediction?.bytesBase64Encoded || prediction?.image?.imageBytes

          if (imageBase64) {
            return NextResponse.json({
              success: true,
              mode: 'nano_banana_imagen',
              dataUrl: `data:image/jpeg;base64,${imageBase64}`,
              prompt: synthesizedPrompt,
              style: archetype,
              styleDna: channelDna,
              projectId,
            })
          }
        }
      } catch (err) {
        console.warn('[Nano Banana Imagen Fetch Attempt]', err)
      }
    }

    // 3. Return synthesized Channel Style-Lock specifications & metadata
    return NextResponse.json({
      success: true,
      mode: 'nano_banana_spec',
      prompt: synthesizedPrompt,
      style: archetype,
      styleDna: channelDna,
      headline,
      scriptAccent,
      subtitle,
      brandColor: channelDna?.colorPalette?.accent || brandColor,
      textLayer: channelDna?.composition?.textPlacement || archetype.textLayer,
      treatments: {
        vignette: archetype.hasVignette,
        vignetteIntensity: archetype.defaultVignetteIntensity,
        filmGrain: archetype.hasFilmGrain,
        fringeBlur: archetype.hasFringeBlur,
        inkBleed: archetype.hasInkBleed,
        rimLight: true,
        backgroundGrid: archetype.backgroundGrid,
        telemetryRuler: archetype.telemetryRuler,
      },
      floatingAssets: archetype.defaultFloatingAssets,
      fallbackMessage: 'Channel Style-Lock DNA synthesized and mapped to studio canvas engine.',
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
