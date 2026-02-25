import { NextResponse } from "next/server"
import { readFeaturedVideo, writeFeaturedVideo } from "@/lib/featured-video-cache"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedVideo() })
}

export async function POST(req: Request) {
  const body = await req.json()
  await writeFeaturedVideo({ videoId: body.videoId })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeFeaturedVideo(null)
  return NextResponse.json({ success: true })
}
