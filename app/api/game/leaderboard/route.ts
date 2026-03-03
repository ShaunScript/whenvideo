import { NextResponse } from "next/server"
import { readLeaderboard, submitLeaderboardEntry } from "@/lib/game-leaderboard-cache"

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
