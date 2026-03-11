import { NextResponse } from "next/server"
import { readFeaturedCarousel, writeFeaturedCarousel } from "@/lib/featured-carousel-cache"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedCarousel() })
}

export async function POST(request: Request) {
  const body = await request.json()
  const items = Array.isArray(body?.items) ? body.items : []
  await writeFeaturedCarousel({ items })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeFeaturedCarousel(null)
  return NextResponse.json({ success: true })
}
