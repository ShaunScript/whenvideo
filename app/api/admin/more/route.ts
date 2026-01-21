import { NextResponse } from "next/server"
import { getVideosByIds } from "@/lib/youtube-api"
import moreVideosJson from "@/data/more-videos.json"
import { readMoreCache, writeMoreCache, clearMoreCache } from "@/lib/more-cache"

export const runtime = "nodejs" // needed for fs persistence

// In-memory cache for fast responses
let cachedVideos: any[] = []
let hasLoadedFromDisk = false

function normalizeVideo(v: any) {
  return {
    ...v,
    // frontend expects channelName
    channelName: v.channelName ?? v.channelTitle ?? "Unknown Channel",
    channelId: v.channelId ?? "",
  }
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)

    // youtu.be/<id>
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "").trim()
      return id.length === 11 ? id : null
    }

    // youtube.com/watch?v=<id>
    const v = u.searchParams.get("v")
    if (v && v.length === 11) return v

    // youtube.com/shorts/<id>
    const shorts = u.pathname.match(/\/shorts\/([^/]+)/)?.[1]
    if (shorts && shorts.length === 11) return shorts

    // youtube.com/embed/<id>
    const embed = u.pathname.match(/\/embed\/([^/]+)/)?.[1]
    if (embed && embed.length === 11) return embed

    return null
  } catch {
    return null
  }
}

function getVideoIdsFromLocalJson(): string[] {
  const ids: string[] = []
  const channels = ["franzj", "renyan", "Grim", "Furiousss", "zuhn", "other"]

  for (const channel of channels) {
    const urls = (moreVideosJson as any)[channel] as string[] | undefined
    if (urls && Array.isArray(urls)) {
      for (const url of urls) {
        const id = extractVideoId(url)
        if (id) ids.push(id)
      }
    }
  }

  // de-dupe
  return Array.from(new Set(ids))
}

function buildChannelSummary(videos: any[]) {
  const map = new Map<string, { name: string; channelId: string; count: number }>()
  for (const v of videos) {
    const name = v.channelName ?? v.channelTitle ?? "Unknown Channel"
    const id = v.channelId ?? ""
    const existing = map.get(name)
    if (existing) existing.count++
    else map.set(name, { name, channelId: id, count: 1 })
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

async function ensureLoadedFromDisk() {
  if (hasLoadedFromDisk) return
  const disk = await readMoreCache()
  if (disk?.videos?.length) {
    cachedVideos = disk.videos.map(normalizeVideo)
  }
  hasLoadedFromDisk = true
}

export async function GET(request: Request) {
  try {
    await ensureLoadedFromDisk()

    const { searchParams } = new URL(request.url)
    const videoIdsParam = searchParams.get("videoIds")

    // If no explicit ids requested, serve the "More" page dataset
    if (!videoIdsParam) {
      // If memory cache exists, return it immediately
      if (cachedVideos.length > 0) {
        return NextResponse.json({
          videos: cachedVideos.map(normalizeVideo),
          channels: buildChannelSummary(cachedVideos),
          source: "cache",
        })
      }

      const apiKey = process.env.YOUTUBE_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: "Missing YOUTUBE_API_KEY (check .env.local and restart pnpm dev)" },
          { status: 500 },
        )
      }

      const ids = getVideoIdsFromLocalJson()
      if (ids.length === 0) {
        return NextResponse.json({ videos: [], channels: [] })
      }

      // IMPORTANT: do NOT slice to 50; youtube-api batches internally
      const fetched = await getVideosByIds(apiKey, ids)
      cachedVideos = fetched.map(normalizeVideo)

      // Persist to disk
      await writeMoreCache(cachedVideos)

      return NextResponse.json({
        videos: cachedVideos,
        channels: buildChannelSummary(cachedVideos),
        source: "youtube",
      })
    }

    // Otherwise, caller asked for specific IDs
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    const videoIds = JSON.parse(videoIdsParam)
    const videos = Array.isArray(videoIds) && videoIds.length > 0 ? await getVideosByIds(apiKey, videoIds) : []
    const normalized = videos.map(normalizeVideo)

    return NextResponse.json({
      videos: normalized,
      channels: buildChannelSummary(normalized),
      source: "youtube",
    })
  } catch (error: any) {
    console.error("[api/admin/more] Failed:", error?.message || error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureLoadedFromDisk()

    const body = await request.json()
    const { video, videos: batchVideos } = body

    if (batchVideos && Array.isArray(batchVideos)) {
      const results: { success: boolean; videoId: string; title: string; message: string }[] = []
      const videosToAdd: any[] = []

      for (const v of batchVideos) {
        if (cachedVideos.some((cv: any) => cv.id === v.id)) {
          results.push({ success: false, videoId: v.id, title: v.title, message: "Video already in More" })
        } else {
          videosToAdd.push(normalizeVideo({ ...v, addedAt: new Date().toISOString() }))
          results.push({ success: true, videoId: v.id, title: v.title, message: "Video added successfully" })
        }
      }

      cachedVideos = [...cachedVideos, ...videosToAdd]
      await writeMoreCache(cachedVideos)

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

    cachedVideos.push(normalizeVideo({ ...video, addedAt: new Date().toISOString() }))
    await writeMoreCache(cachedVideos)

    return NextResponse.json({ success: true, message: "Video added to More", totalVideos: cachedVideos.length })
  } catch (error) {
    console.error("Failed to add video:", error)
    return NextResponse.json({ error: "Failed to add video" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureLoadedFromDisk()

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

    await writeMoreCache(cachedVideos)
    return NextResponse.json({ success: true, message: "Video removed from More", totalVideos: cachedVideos.length })
  } catch (error) {
    console.error("Failed to remove video:", error)
    return NextResponse.json({ error: "Failed to remove video" }, { status: 500 })
  }
}

export async function PATCH() {
  cachedVideos = []
  hasLoadedFromDisk = false
  await clearMoreCache()
  return NextResponse.json({ success: true, message: "More cache cleared (memory + disk)" })
}
