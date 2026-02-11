import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId") || ""

  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing_userId" }, { status: 400 })
  }

  const { rows } = await pg.query(
    `
    select
      user_id as "userId",
      user_name as "userName",
      opens,
      common,
      epic,
      legendary,
      inventory,
      (common * 5 + epic * 15 + legendary * 25) as score
    from case_leaderboard
    where user_id = $1
    limit 1
    `,
    [userId]
  )

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, row: rows[0] })
}
