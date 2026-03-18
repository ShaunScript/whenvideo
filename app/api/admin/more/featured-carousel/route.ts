import { NextResponse } from "next/server"
import { readFeaturedCarousel, writeFeaturedCarousel } from "@/lib/featured-carousel-cache"
import { requireAdminAuth } from "@/lib/admin-auth"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedCarousel() })
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const body = await request.json()
  const items = Array.isArray(body?.items) ? body.items : []
  await writeFeaturedCarousel({ items })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  await writeFeaturedCarousel(null)
  return NextResponse.json({ success: true })
}
