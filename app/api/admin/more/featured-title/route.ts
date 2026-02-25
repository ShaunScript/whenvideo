import { NextResponse } from "next/server"
import { readFeaturedTitleOverride, writeFeaturedTitleOverride } from "@/lib/featured-title-override-cache"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedTitleOverride() })
}

export async function POST(req: Request) {
  const body = await req.json()
  await writeFeaturedTitleOverride({ title: body.title })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeFeaturedTitleOverride(null)
  return NextResponse.json({ success: true })
}
