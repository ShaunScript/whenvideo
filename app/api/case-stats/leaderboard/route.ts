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
      inventory
    from case_leaderboard
    order by updated_at desc
  `)

  return NextResponse.json({ ok: true, rows })
}
