import { NextResponse } from "next/server"
import { clearAdminAuthCookie, isAdminAuthenticated, verifyAdminPassword } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ authenticated: await isAdminAuthenticated() })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  return verifyAdminPassword((body as any)?.password)
}

export async function DELETE() {
  return await clearAdminAuthCookie()
}
