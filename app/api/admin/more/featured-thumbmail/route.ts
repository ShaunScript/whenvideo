import { NextResponse } from "next/server"
import { readFeaturedThumb, writeFeaturedThumb } from "@/lib/featured-thumbnail-cache"
import { requireAdminAuth } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedThumb() })
}

export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const body = await req.json()
  // body: { thumbnailUrl }
  await writeFeaturedThumb({ thumbnailUrl: body.thumbnailUrl })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  await writeFeaturedThumb(null)
  return NextResponse.json({ success: true })
}
