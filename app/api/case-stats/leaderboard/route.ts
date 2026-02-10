import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const { rows } = await pg.query(`
    select
      user_id as "userId",
      user_name as "userName",
      score,
      opens,
      common,
      rare,
      epic,
      legendary
    from case_leaderboard
    order by score desc
    limit 50
  `)

  return NextResponse.json({ ok: true, rows })
}