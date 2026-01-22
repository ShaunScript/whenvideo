import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = body?.userId
    const username = body?.username ?? null
    const provider = body?.provider ?? null

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // If they already voted, block it
    const existing = await pg.query(`SELECT user_id FROM awards_voters WHERE user_id = $1`, [userId])
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json({ error: "User already voted" }, { status: 409 })
    }

    // Lock them in as having voted
    await pg.query(
      `INSERT INTO awards_voters (user_id, username, provider) VALUES ($1, $2, $3)`,
      [userId, username, provider],
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Vote lock error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
