/**
 * Thumbnail Generation API Endpoint
 * POST /api/thumbnails/generate
 *
 * Generates multiple thumbnail variations and stores them in R2
 */

import { NextRequest, NextResponse } from "next/server"
import {
  generateThumbnailSet,
  formatThumbnailResults,
  type ThumbnailGenerationResult,
} from "@/lib/thumbnail-generator/generate"
import {
  uploadThumbnailsToR2,
  getThumbnailR2ConfigError,
} from "@/lib/thumbnail-generator/r2-upload"

type GenerateThumbnailsRequest = {
  projectId: string
  videoTitle?: string
  videoUrl?: string
  mood?: string
}

type ThumbnailGenerationResponse = {
  success: boolean
  thumbnails?: Array<{
    id: string
    composition: string
    palette: string
    url?: string
    error?: string
  }>
  error?: string
  generationTime?: number
}

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Validate R2 configuration
    const r2Error = getThumbnailR2ConfigError()
    if (r2Error) {
      return NextResponse.json(
        {
          success: false,
          error: r2Error,
        },
        { status: 503 },
      )
    }

    // Parse request body
    const body = (await request.json().catch(() => null)) as GenerateThumbnailsRequest | null

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 },
      )
    }

    const { projectId, videoTitle, videoUrl, mood } = body

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId is required",
        },
        { status: 400 },
      )
    }

    // Generate thumbnail variations
    const results = await generateThumbnailSet(
      videoTitle || "Untitled Video",
      mood || "neutral",
      videoUrl,
    )

    // Filter out errors for R2 upload
    const successfulResults = results.filter((r) => r.base64Data && !r.error)

    if (successfulResults.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No thumbnails were generated successfully",
          thumbnails: formatThumbnailResults(results),
        },
        { status: 500 },
      )
    }

    // Upload thumbnails to R2
    const uploadResults = await uploadThumbnailsToR2(
      projectId,
      successfulResults.map((r) => ({
        id: r.id,
        data: r.base64Data || "",
      })),
    )

    // Format response with uploaded URLs
    const formattedResults = formatThumbnailResults(results).map((thumb) => {
      const uploadResult = uploadResults.find((ur) => ur.id === thumb.id)
      return {
        ...thumb,
        publicUrl: uploadResult?.publicUrl || thumb.url,
        signedUrl: uploadResult?.signedUrl,
        error: uploadResult?.error || thumb.error,
      }
    })

    const generationTime = performance.now() - startTime

    return NextResponse.json(
      {
        success: true,
        thumbnails: formattedResults,
        generationTime: Math.round(generationTime),
      } as ThumbnailGenerationResponse,
      { status: 200 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Thumbnail generation failed"

    return NextResponse.json(
      {
        success: false,
        error: message,
      } as ThumbnailGenerationResponse,
      { status: 500 },
    )
  }
}

export const runtime = "nodejs"
export const preferredRegion = "auto"
