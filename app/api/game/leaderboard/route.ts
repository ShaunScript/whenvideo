import { NextResponse } from "next/server"
import { readLeaderboard, submitLeaderboardEntry, removeLeaderboardEntry, updateLeaderboardEntry } from "@/lib/game-leaderboard-cache"

export const runtime = "nodejs"

const cleanName = (value: unknown) => {
  const name = typeof value === "string" ? value.trim().slice(0, 20) : ""
  return name || "Anonymous"
}

export async function GET() {
  try {
    return NextResponse.json({ data: await readLeaderboard() })
  } catch (error: any) {
    console.error("[api/game/leaderboard] GET error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to read leaderboard" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { score, name } = await req.json()
    const numericScore = Number(score) || 0
    const updated = await submitLeaderboardEntry(numericScore, cleanName(name))
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("[api/game/leaderboard] POST error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to write leaderboard" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
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
  } catch (error: any) {
    console.error("[api/game/leaderboard] PATCH error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to update leaderboard" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
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
  } catch (error: any) {
    console.error("[api/game/leaderboard] DELETE error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to remove leaderboard entry" }, { status: 500 })
  }
}
