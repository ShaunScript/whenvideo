import { NextResponse } from "next/server"
import { readFeaturedTitleStyle, writeFeaturedTitleStyle } from "@/lib/featured-title-style-cache"
import { requireAdminAuth } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedTitleStyle() })
}

export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const body = await req.json()
  await writeFeaturedTitleStyle({
    fontFamily: body.fontFamily,
    fontSizePx: body.fontSizePx,
    fontUrl: body.fontUrl ?? null,
  })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  await writeFeaturedTitleStyle(null)
  return NextResponse.json({ success: true })
}
