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
      (common * 5 + epic * 25 + legendary * 50) as score
    from case_leaderboard
    order by (common * 5 + epic * 25 + legendary * 50) desc
    limit 50
  `)

  return NextResponse.json({ ok: true, rows })
}
