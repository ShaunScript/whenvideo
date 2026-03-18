import { NextResponse } from "next/server"
import { readFeaturedDescription, writeFeaturedDescription } from "@/lib/featured-description-cache"
import { requireAdminAuth } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ data: await readFeaturedDescription() })
}

export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  const body = await req.json()
  await writeFeaturedDescription({ description: body.description })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const unauthorized = await requireAdminAuth()
  if (unauthorized) return unauthorized

  await writeFeaturedDescription(null)
  return NextResponse.json({ success: true })
}
