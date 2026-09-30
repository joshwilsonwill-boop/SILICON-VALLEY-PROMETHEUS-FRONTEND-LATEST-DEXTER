import { NextResponse } from 'next/server'
import { getCreatorVideos, type CreatorVideoItem } from '@/lib/creators/video-catalog'

export const dynamic = 'force-dynamic'

function getEffectiveYoutubeApiKey(): string {
  return (
    process.env.YOUTUBE_API_KEY ||
    process.env.YOUTUBE_API_KEY_2 ||
    process.env.YOUTUBE_API_KEY_3 ||
    ''
  ).trim().replace(/^["']|["']$/g, '')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const creator = searchParams.get('creator') || searchParams.get('name') || 'Alex Hormozi'
  const fallbackCatalog = getCreatorVideos(creator)
  const apiKey = getEffectiveYoutubeApiKey()

  if (!apiKey) {
    return NextResponse.json({
      source: 'autonomous-vault',
      creator,
      hasApiKey: false,
      count: fallbackCatalog.length,
      videos: fallbackCatalog,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }

  // Attempt autonomous dynamic YouTube Data API call
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const query = encodeURIComponent(`${creator} official`)
    const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=6&order=relevance&key=${apiKey}`

    const res = await fetch(endpoint, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      // Fallback autonomously on API error / quota limits
      return NextResponse.json({
        source: 'autonomous-vault',
        creator,
        hasApiKey: true,
        apiStatus: res.status,
        count: fallbackCatalog.length,
        videos: fallbackCatalog,
      })
    }

    const data = await res.json()
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({
        source: 'autonomous-vault',
        creator,
        hasApiKey: true,
        count: fallbackCatalog.length,
        videos: fallbackCatalog,
      })
    }

    const dynamicVideos: CreatorVideoItem[] = data.items.map((item: any, idx: number) => {
      const vid = item.id?.videoId
      const snippet = item.snippet || {}
      const fallbackItem = fallbackCatalog[idx] || fallbackCatalog[0]

      return {
        id: `yt_${vid || idx}`,
        parentId: creator,
        title: snippet.title || fallbackItem.title,
        subtitle: `${creator} | YouTube`,
        description: snippet.description || fallbackItem.description,
        year: snippet.publishedAt ? String(new Date(snippet.publishedAt).getFullYear()) : '2026',
        runtime: fallbackItem.runtime || '15:00',
        genre: fallbackItem.genre || 'Strategy',
        badge: 'YouTube Live',
        rating: 9.2,
        videoId: vid || fallbackItem.videoId,
        image:
          snippet.thumbnails?.maxres?.url ||
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          fallbackItem.image,
        imagePosition: 'center',
        accent: '#55ff9b',
        metaLine: `${snippet.channelTitle || creator} | Official channel`,
        channelTitle: snippet.channelTitle || creator,
        isLocal: false,
      }
    })

    return NextResponse.json({
      source: 'youtube-api',
      creator,
      hasApiKey: true,
      count: dynamicVideos.length,
      videos: dynamicVideos,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (_error) {
    // Return autonomous vault gracefully if network times out or throws
    return NextResponse.json({
      source: 'autonomous-vault',
      creator,
      hasApiKey: true,
      count: fallbackCatalog.length,
      videos: fallbackCatalog,
    })
  }
}
