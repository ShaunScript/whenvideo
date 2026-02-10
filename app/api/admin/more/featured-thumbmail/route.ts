import { NextResponse } from "next/server"
import { readFeaturedThumb, writeFeaturedThumb } from "@/lib/featured-thumbnail-cache"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedThumb() })
}

export async function POST(req: Request) {
  const body = await req.json()
  // body: { videoId, thumbnailUrl }
  await writeFeaturedThumb({ videoId: body.videoId, thumbnailUrl: body.thumbnailUrl })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeFeaturedThumb(null)
  return NextResponse.json({ success: true })
}