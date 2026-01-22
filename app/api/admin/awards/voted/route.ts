import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ voted: false }, { status: 200 })
  }

  const res = await pg.query(`SELECT user_id FROM awards_voters WHERE user_id = $1`, [userId])
  return NextResponse.json({ voted: (res.rowCount ?? 0) > 0 })
}
