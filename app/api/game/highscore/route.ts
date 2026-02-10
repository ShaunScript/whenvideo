import { NextResponse } from "next/server"
import { readHighScore, writeHighScore } from "@/lib/game-highscore-cache"

export const runtime = "nodejs"

const cleanName = (value: unknown) => {
  const name = typeof value === "string" ? value.trim().slice(0, 20) : ""
  return name || "Anonymous"
}

export async function GET() {
  return NextResponse.json({ data: await readHighScore() })
}

export async function POST(req: Request) {
  const { score, name } = await req.json()
  const numericScore = Number(score) || 0
  await writeHighScore({ score: numericScore, name: cleanName(name) })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const { name } = await req.json()
  const current = await readHighScore()
  if (!current) return NextResponse.json({ success: false }, { status: 404 })
  await writeHighScore({ ...current, name: cleanName(name) })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  await writeHighScore(null)
  return NextResponse.json({ success: true })
}
