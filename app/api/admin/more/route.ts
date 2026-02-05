// app/api/admin/more/route.ts
import { NextResponse } from "next/server"
import moreVideosJson from "@/data/more-videos.json"
import { getVideosByIds } from "@/lib/youtube-api"
import { listMoreRows, addYouTubeIds, addUploadVideo, removeMoreVideo, clearMoreVideos } from "@/lib/more-db"

export const runtime = "nodejs"

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)

    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "").trim()
      return id.length === 11 ? id : null
    }

    const v = u.searchParams.get("v")
    if (v && v.length === 11) return v

    const shorts = u.pathname.match(/\/shorts\/([^/]+)/)?.[1]
    if (shorts && shorts.length === 11) return shorts

    const embed = u.pathname.match(/\/embed\/([^/]+)/)?.[1]
    if (embed && embed.length === 11) return embed

    return null
  } catch {
    return null
  }
}

function getBaseIdsFromLocalJson(): string[] {
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

function normalizeVideo(v: any) {
  return {
    ...v,
    channelName: v.channelName ?? v.channelTitle ?? "Unknown Channel",
    channelId: v.channelId ?? "",
    source: v.source ?? (v.videoUrl ? "upload" : "youtube"),
    videoUrl: v.videoUrl ?? v.url ?? undefined,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoIdsParam = searchParams.get("videoIds")

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 })
    }

    // 1) Metadata lookup for specific IDs (admin uses this)
    if (videoIdsParam) {
      const ids = JSON.parse(videoIdsParam)
      const videos = Array.isArray(ids) && ids.length ? await getVideosByIds(apiKey, ids) : []
      const normalized = videos.map(normalizeVideo)
      return NextResponse.json({
        videos: normalized,
        channels: buildChannelSummary(normalized),
        source: "youtube",
      })
    }

    // 2) Main dataset for /more + homepage carousel
    const baseIds = getBaseIdsFromLocalJson()

    const rows = await listMoreRows()
    const uploadRows = rows.filter((r) => r.source === "upload")
    const dbYouTubeIds = rows.filter((r) => r.source === "youtube").map((r) => r.video_id)

    const allYouTubeIds = Array.from(new Set([...baseIds, ...dbYouTubeIds]))

    const fetched = allYouTubeIds.length ? await getVideosByIds(apiKey, allYouTubeIds) : []
    const youtubeVideos = fetched.map((v) => normalizeVideo({ ...v, source: "youtube" }))

    const uploadVideos = uploadRows.map((r) =>
      normalizeVideo({
        id: r.video_id,
        title: r.title ?? "Untitled Upload",
        channelName: r.channel_name ?? "Unknown Channel",
        thumbnail: r.thumbnail ?? "/placeholder.svg",
        description: r.description ?? "",
        publishedAt: (r.published_at ?? r.added_at) as any,
        viewCount: r.view_count ?? "0",
        commentCount: r.comment_count ?? 0,
        duration: r.duration ?? "",
        source: "upload",
        videoUrl: r.video_url ?? undefined,
        addedAt: r.added_at,
      }),
    )

    const merged = [...uploadVideos, ...youtubeVideos]

    return NextResponse.json({
      videos: merged,
      channels: buildChannelSummary(merged),
      source: "db+youtube",
    })
  } catch (error: any) {
    console.error("[api/admin/more] Failed:", error?.message || error)
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { video, videos: batchVideos } = body

    // Batch add (YouTube)
    if (Array.isArray(batchVideos)) {
      const ids = batchVideos.map((v: any) => v?.id).filter((x: any) => typeof x === "string")
      const unique = Array.from(new Set(ids))
      const { inserted } = await addYouTubeIds(unique)

      const already = unique.length - inserted
      return NextResponse.json({
        success: true,
        message: `Added ${inserted} video(s)${already > 0 ? `, ${already} already existed` : ""}`,
        totalAttempted: unique.length,
      })
    }

    // Single add (upload)
    if (video?.source === "upload") {
      await addUploadVideo({
        id: video.id,
        videoUrl: video.videoUrl,
        title: video.title,
        channelName: video.channelName,
        thumbnail: video.thumbnail,
        description: video.description,
        publishedAt: video.publishedAt,
        viewCount: video.viewCount,
        commentCount: video.commentCount,
        duration: video.duration,
      })

      return NextResponse.json({ success: true, message: "Upload added to More" })
    }

    // Single add (YouTube)
    if (video?.id) {
      const { inserted } = await addYouTubeIds([video.id])
      if (!inserted) return NextResponse.json({ success: false, message: "Video already in More" })
      return NextResponse.json({ success: true, message: "Video added to More" })
    }

    return NextResponse.json({ error: "No video data provided" }, { status: 400 })
  } catch (error) {
    console.error("[api/admin/more] POST error:", error)
    return NextResponse.json({ error: "Failed to add video" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")
    if (!videoId) return NextResponse.json({ error: "No video ID provided" }, { status: 400 })

    const { removed } = await removeMoreVideo(videoId)
    if (!removed) return NextResponse.json({ success: false, message: "Video not found in More" })

    return NextResponse.json({ success: true, message: "Video removed from More" })
  } catch (error) {
    console.error("[api/admin/more] DELETE error:", error)
    return NextResponse.json({ error: "Failed to remove video" }, { status: 500 })
  }
}

export async function PATCH() {
  await clearMoreVideos()
  return NextResponse.json({ success: true, message: "More cleared (database)" })
}
