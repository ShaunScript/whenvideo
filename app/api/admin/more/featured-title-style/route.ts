import { NextResponse } from "next/server"
import { readFeaturedTitleStyle, writeFeaturedTitleStyle } from "@/lib/featured-title-style-cache"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedTitleStyle() })
}

export async function POST(req: Request) {
  const body = await req.json()
  await writeFeaturedTitleStyle({
    fontFamily: body.fontFamily,
    fontSizePx: body.fontSizePx,
    fontUrl: body.fontUrl ?? null,
  })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeFeaturedTitleStyle(null)
  return NextResponse.json({ success: true })
}
