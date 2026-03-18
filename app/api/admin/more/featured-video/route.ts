import { NextResponse } from "next/server"
import { readFeaturedVideo, writeFeaturedVideo } from "@/lib/featured-video-cache"
import { requireAdminAuth } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedVideo() })
}

export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const body = await req.json()
  await writeFeaturedVideo({ videoId: body.videoId })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  await writeFeaturedVideo(null)
  return NextResponse.json({ success: true })
}
