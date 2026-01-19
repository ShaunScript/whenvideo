import { NextResponse } from "next/server"
import { getVideosByIds } from "@/lib/youtube-api"
import moreVideosJson from "@/data/more-videos.json"

// In-memory cache for videos (persists during server session)
let cachedVideos: any[] = []
let hasLoadedFromYouTube = false

// Extract video IDs from the local JSON file
function getVideoIdsFromLocalJson(): string[] {
  const videoIds: string[] = []
  const channels = ["franzj", "renyan", "Grim", "Furiousss", "zuhn", "other"]
  
  for (const channel of channels) {
    const urls = (moreVideosJson as any)[channel] as string[] | undefined
    if (urls && Array.isArray(urls)) {
      for (const url of urls) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/)
        if (match) {
          videoIds.push(match[1])
        }
      }
    }
  }
  
  return videoIds
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoIdsParam = searchParams.get("videoIds")

    if (!videoIdsParam) {
      // If we have cached videos, return them
      if (cachedVideos.length > 0) {
        return NextResponse.json({ videos: cachedVideos })
      }
      
      // Otherwise fetch from YouTube using local JSON video IDs
      const apiKey = process.env.YOUTUBE_API_KEY
      if (apiKey && !hasLoadedFromYouTube) {
        const localVideoIds = getVideoIdsFromLocalJson()
        if (localVideoIds.length > 0) {
          try {
            const limitedIds = localVideoIds.slice(0, 50)
            cachedVideos = await getVideosByIds(apiKey, limitedIds)
            hasLoadedFromYouTube = true
            // Debug: log first video to check channelTitle
            if (cachedVideos.length > 0) {
              console.log("[v0] Sample video data:", JSON.stringify({
                id: cachedVideos[0].id,
                title: cachedVideos[0].title,
                channelTitle: cachedVideos[0].channelTitle,
                channelId: cachedVideos[0].channelId
              }))
            }
          } catch (error) {
            console.error("Failed to fetch from YouTube API:", error)
          }
        }
      }
      
      return NextResponse.json({ videos: cachedVideos })
    }

    const videoIds = JSON.parse(videoIdsParam)
    const apiKey = process.env.YOUTUBE_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    try {
      const videos = Array.isArray(videoIds) && videoIds.length > 0 ? await getVideosByIds(apiKey, videoIds) : []
      return NextResponse.json({ videos })
    } catch (error: any) {
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        return NextResponse.json(
          { error: "YouTube API rate limit reached. Please try again later.", isRateLimit: true },
          { status: 429 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error("Failed to fetch more videos:", error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { video, videos: batchVideos } = body

    if (batchVideos && Array.isArray(batchVideos)) {
      const results: { success: boolean; videoId: string; title: string; message: string }[] = []
      const videosToAdd: any[] = []

      for (const v of batchVideos) {
        if (cachedVideos.some((cv: any) => cv.id === v.id)) {
          results.push({ success: false, videoId: v.id, title: v.title, message: "Video already in More" })
        } else {
          videosToAdd.push({ ...v, addedAt: new Date().toISOString() })
          results.push({ success: true, videoId: v.id, title: v.title, message: "Video added successfully" })
        }
      }

      cachedVideos = [...cachedVideos, ...videosToAdd]
      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length

      return NextResponse.json({
        success: true,
        message: `Added ${successCount} video(s)${failCount > 0 ? `, ${failCount} already existed` : ""}`,
        results,
        totalVideos: cachedVideos.length,
      })
    }

    if (!video) {
      return NextResponse.json({ error: "No video data provided" }, { status: 400 })
    }

    if (cachedVideos.some((v: any) => v.id === video.id)) {
      return NextResponse.json({ success: false, message: "Video already in More" })
    }

    cachedVideos.push({ ...video, addedAt: new Date().toISOString() })
    return NextResponse.json({ success: true, message: "Video added to More", totalVideos: cachedVideos.length })
  } catch (error) {
    console.error("Failed to add video:", error)
    return NextResponse.json({ error: "Failed to add video" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")

    if (!videoId) {
      return NextResponse.json({ error: "No video ID provided" }, { status: 400 })
    }

    const originalLength = cachedVideos.length
    cachedVideos = cachedVideos.filter((v: any) => v.id !== videoId)

    if (cachedVideos.length === originalLength) {
      return NextResponse.json({ success: false, message: "Video not found in More" })
    }

    return NextResponse.json({ success: true, message: "Video removed from More", totalVideos: cachedVideos.length })
  } catch (error) {
    console.error("Failed to remove video:", error)
    return NextResponse.json({ error: "Failed to remove video" }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    cachedVideos = []
    hasLoadedFromYouTube = false
    return NextResponse.json({ success: true, message: "All videos cleared from storage" })
  } catch (error) {
    console.error("Failed to clear videos:", error)
    return NextResponse.json({ error: "Failed to clear videos" }, { status: 500 })
  }
}
