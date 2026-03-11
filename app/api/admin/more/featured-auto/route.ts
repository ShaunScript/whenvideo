import { NextResponse } from "next/server"
import { fetchChannelVideos, fetchChannelVideosByHandle, filterLongVideos } from "@/lib/youtube-api"

export const runtime = "nodejs"

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 })
    }

    const primary = await fetchChannelVideos(apiKey, 12)
    const secondary = await fetchChannelVideosByHandle(apiKey, "needmoredoza", 12)

    const combined = [...primary.videos, ...secondary.videos]
    const deduped = Array.from(new Map(combined.map((video) => [video.id, video])).values())

    const recent = filterLongVideos(deduped)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 5)
      .map((video) => ({
        videoId: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnail,
      }))

    return NextResponse.json({ data: { items: recent } })
  } catch (error: any) {
    console.error("[api/admin/more/featured-auto] error:", error?.message || error)
    return NextResponse.json({ error: "Failed to load featured videos" }, { status: 500 })
  }
}
