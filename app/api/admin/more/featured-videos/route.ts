import { NextResponse } from "next/server"
import { readFeaturedVideos, writeFeaturedVideos } from "@/lib/featured-videos-cache"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedVideos() })
}

export async function POST(request: Request) {
  const body = await request.json()
  const ids = Array.isArray(body?.videoIds) ? body.videoIds : []
  await writeFeaturedVideos({ videoIds: ids })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeFeaturedVideos(null)
  return NextResponse.json({ success: true })
}
