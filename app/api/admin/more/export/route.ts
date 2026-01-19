import { NextResponse } from "next/server"
import moreVideosJson from "@/data/more-videos.json"

export async function GET() {
  try {
    // Export videos from local JSON file
    const videosByChannel: Record<string, { id: string; url: string }[]> = {}
    const channels = ["franzj", "renyan", "Grim", "Furiousss", "zuhn", "other"]
    let totalVideos = 0

    for (const channel of channels) {
      const urls = (moreVideosJson as any)[channel] as string[] | undefined
      if (urls && Array.isArray(urls)) {
        videosByChannel[channel] = urls.map((url) => {
          const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/)
          const id = match ? match[1] : url
          totalVideos++
          return { id, url }
        })
      }
    }

    return NextResponse.json({
      videosByChannel,
      totalVideos,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to export videos:", error)
    return NextResponse.json({ error: "Failed to export videos" }, { status: 500 })
  }
}
