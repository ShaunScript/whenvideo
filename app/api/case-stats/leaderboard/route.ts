import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const { rows } = await pg.query(`
    select
      user_id as "userId",
      user_name as "userName",
      opens,
      common,
      rare,
      epic,
      legendary,
      inventory,
      (common * 5 + epic * 15 + legendary * 25) as score
    from case_leaderboard
    order by (common * 5 + epic * 15 + legendary * 25) desc
    limit 50
  `)

  return NextResponse.json({ ok: true, rows })
}
