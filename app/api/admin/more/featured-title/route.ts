import { NextResponse } from "next/server"
import { readFeaturedTitleOverride, writeFeaturedTitleOverride } from "@/lib/featured-title-override-cache"
import { requireAdminAuth } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedTitleOverride() })
}

export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const body = await req.json()
  await writeFeaturedTitleOverride({ title: body.title })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  await writeFeaturedTitleOverride(null)
  return NextResponse.json({ success: true })
}
