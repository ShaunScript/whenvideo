import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export const runtime = "nodejs"

function toInt(v: string | null) {
  if (!v) return 0
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!process.env.CASE_INGEST_TOKEN || token !== process.env.CASE_INGEST_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  const userId = searchParams.get("userId") || ""
  const userName = searchParams.get("userName") || ""

  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing_userId" }, { status: 400 })
  }

  const score = toInt(searchParams.get("score"))
  const opens = toInt(searchParams.get("opens"))
  const common = toInt(searchParams.get("common"))
  const rare = toInt(searchParams.get("rare"))
  const epic = toInt(searchParams.get("epic"))
  const legendary = toInt(searchParams.get("legendary"))

  const client = await pg.connect()

  try {
    await client.query("begin")

    await client.query(
      `
      insert into case_leaderboard
        (user_id, user_name, score, opens, common, rare, epic, legendary, updated_at)
      values
        ($1,$2,$3,$4,$5,$6,$7,$8, now())
      on conflict (user_id) do update set
        user_name = excluded.user_name,
        score = excluded.score,
        opens = excluded.opens,
        common = excluded.common,
        rare = excluded.rare,
        epic = excluded.epic,
        legendary = excluded.legendary,
        updated_at = now()
      `,
      [userId, userName, score, opens, common, rare, epic, legendary]
    )

    await client.query("commit")
    return NextResponse.json({ ok: true })
  } catch {
    await client.query("rollback")
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 })
  } finally {
    client.release()
  }
}
