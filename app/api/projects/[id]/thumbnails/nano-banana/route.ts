import { NextRequest, NextResponse } from 'next/server'
import { resolveGeminiApiKey } from '@/lib/prometheus-assistant/gemini-stream'
import { SHORT_FORM_ARCHETYPES } from '@/lib/thumbnails/short-form-styles'

export const runtime = 'nodejs'

interface NanoBananaRequestBody {
  frameDataUrl?: string
  headline?: string
  scriptAccent?: string
  subtitle?: string
  styleId?: string
  brandColor?: string
  userPrompt?: string
  aspectRatio?: '9:16' | '9:6' | '1:1' | '16:9'
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
    const { id: projectId } = await params
    const body = (await request.json().catch(() => null)) as NanoBananaRequestBody | null

    const frameDataUrl = body?.frameDataUrl
    const headline = body?.headline || 'THE TURNING POINT'
    const scriptAccent = body?.scriptAccent || ''
    const subtitle = body?.subtitle || ''
    const styleId = body?.styleId || 'behind_subject_blueprint'
    const brandColor = body?.brandColor || '#FFE600'
    const userPrompt = body?.userPrompt || ''
    const aspectRatio = body?.aspectRatio || '9:16'

    const archetype = SHORT_FORM_ARCHETYPES.find((a) => a.id === styleId) || SHORT_FORM_ARCHETYPES[0]

    const apiKey = resolveGeminiApiKey()

    // Craft prompt based on extracted tenants from the short-form reference library
    const enrichedPrompt = `Generate a viral, ultra-high-resolution 9:16 vertical short-form video cover art (Shorts / Reels / TikTok).
Main subject: The central speaker/creator, high focal clarity, cinematic portrait lighting.
Text placement & styling:
- Text: "${headline.toUpperCase()}"
${scriptAccent ? `- Script accent: "${scriptAccent}" in flowing luxury cursive script overlapping the headline` : ''}
${subtitle ? `- Subtitle: "${subtitle.toUpperCase()}" in clean monospace or sans badge` : ''}
- Depth composition: Bold typography placed ${archetype.textLayer === 'behind' ? 'BEHIND the speaker\'s head and shoulders' : 'as high-contrast foreground overlay'}.
- Visual style: ${archetype.name} - ${archetype.tagline}.
- Brand Accent Color: ${brandColor}. Apply this color to glowing halos, colored rim lighting on the speaker silhouette, and highlight badges.
- Photo & Lens treatments: Cinematic deep bottom vignette, authentic subtle film grain and dust, soft chromatic fringe blur, and clean graphic contrast.
${archetype.defaultFloatingAssets.length > 0 ? `- Floating 3D assets: Staged contextual glowing icons (${archetype.defaultFloatingAssets.join(', ')}) floating around the speaker.` : ''}
${userPrompt ? `Additional creative direction: ${userPrompt}` : ''}`

    // 1. Try Google Imagen 3 (Nano Banana Image Model)
    if (apiKey) {
      try {
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generateImages:predict?key=${apiKey}`

        const imagenRes = await fetch(imagenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: enrichedPrompt }],
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
              prompt: enrichedPrompt,
              style: archetype,
              projectId,
            })
          }
        }
      } catch (err) {
        console.warn('[Nano Banana Imagen Fetch Attempt]', err)
      }
    }

    // 2. Return synthesized prompt specifications & metadata
    return NextResponse.json({
      success: true,
      mode: 'nano_banana_spec',
      prompt: enrichedPrompt,
      style: archetype,
      headline,
      scriptAccent,
      subtitle,
      brandColor,
      textLayer: archetype.textLayer,
      treatments: {
        vignette: archetype.hasVignette,
        vignetteIntensity: archetype.defaultVignetteIntensity,
        filmGrain: archetype.hasFilmGrain,
        fringeBlur: archetype.hasFringeBlur,
        inkBleed: archetype.hasInkBleed,
        rimLight: archetype.hasRimLight,
        backgroundGrid: archetype.backgroundGrid,
        telemetryRuler: archetype.telemetryRuler,
      },
      floatingAssets: archetype.defaultFloatingAssets,
      fallbackMessage: 'Nano Banana prompt synthesized and applied to studio canvas engine.',
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
