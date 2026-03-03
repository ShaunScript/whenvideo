import { NextResponse } from "next/server"
import { readLeaderboard, submitLeaderboardEntry, removeLeaderboardEntry, updateLeaderboardEntry } from "@/lib/game-leaderboard-cache"

export const runtime = "nodejs"

const cleanName = (value: unknown) => {
  const name = typeof value === "string" ? value.trim().slice(0, 20) : ""
  return name || "Anonymous"
}

export async function GET() {
  return NextResponse.json({ data: await readLeaderboard() })
}

export async function POST(req: Request) {
  const { score, name } = await req.json()
  const numericScore = Number(score) || 0
  const updated = await submitLeaderboardEntry(numericScore, cleanName(name))
  return NextResponse.json({ success: true, data: updated })
}

export async function PATCH(req: Request) {
  const url = new URL(req.url)
  let numericTs = Number(url.searchParams.get("ts"))
  let name = url.searchParams.get("name") ?? ""
  if (!Number.isFinite(numericTs) || !name) {
    try {
      const body = await req.json()
      numericTs = Number(body?.ts)
      name = typeof body?.name === "string" ? body.name : name
    } catch {
      // ignore
    }
  }
  if (!Number.isFinite(numericTs)) {
    return NextResponse.json({ success: false, error: "Invalid entry id" }, { status: 400 })
  }
  const updated = await updateLeaderboardEntry(numericTs, cleanName(name))
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  let numericTs = Number(url.searchParams.get("ts"))
  if (!Number.isFinite(numericTs)) {
    try {
      const body = await req.json()
      numericTs = Number(body?.ts)
    } catch {
      // ignore
    }
  }
  if (!Number.isFinite(numericTs)) {
    return NextResponse.json({ success: false, error: "Invalid entry id" }, { status: 400 })
  }
  const updated = await removeLeaderboardEntry(numericTs)
  return NextResponse.json({ success: true, data: updated })
}
