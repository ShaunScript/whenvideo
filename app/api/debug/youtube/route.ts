import { NextResponse } from "next/server"
import { fetchChannelVideos, fetchChannelVideosByHandle } from "@/lib/youtube-api"
import { readFeaturedVideo } from "@/lib/featured-video-cache"

export const runtime = "nodejs"

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing YOUTUBE_API_KEY" }, { status: 500 })
  }

  const rawMode = (process.env.FEATURED_VIDEO_MODE ?? "").toLowerCase().trim()
  const featuredOverride = await readFeaturedVideo()
  const featuredOverrideId = (featuredOverride?.videoId ?? "").trim() || null

  const errors: Record<string, string> = {}

  try {
    await fetchChannelVideos(apiKey, 5)
  } catch (error) {
    errors.primary = error instanceof Error ? error.message : String(error)
  }

  try {
    await fetchChannelVideos(apiKey, 5, "UCNjCUNud_fzWjzswDI46rsg")
  } catch (error) {
    errors.tv = error instanceof Error ? error.message : String(error)
  }

  try {
    await fetchChannelVideosByHandle(apiKey, "@needmoredoza", 5)
  } catch (error) {
    errors.secondary = error instanceof Error ? error.message : String(error)
  }

  const details = {
    featuredMode: rawMode || "auto+override",
    featuredOverrideId,
    errors,
  }

  if (Object.keys(errors).length > 0) {
    const firstError = errors.primary || errors.tv || errors.secondary || "Unknown error"
    return NextResponse.json({ ok: false, error: firstError, details }, { status: 500 })
  }

  return NextResponse.json({ ok: true, details })
}
