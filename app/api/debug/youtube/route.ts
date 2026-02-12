import { NextResponse } from "next/server"
import { fetchChannelVideos } from "@/lib/youtube-api"

export const runtime = "nodejs"

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing YOUTUBE_API_KEY" }, { status: 500 })
  }

  try {
    await fetchChannelVideos(apiKey, 5)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: detail }, { status: 500 })
  }

  try {
    await fetchChannelVideos(apiKey, 5, "UC4b2HUYYJIMd8LwiSzLpetQ")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: detail }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
