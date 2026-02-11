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

  const opens = toInt(searchParams.get("opens") ?? searchParams.get("cases_opened"))
  const common = toInt(searchParams.get("common") ?? searchParams.get("common_cases"))
  const rare = toInt(searchParams.get("rare") ?? searchParams.get("rare_cases"))
  const epic = toInt(searchParams.get("epic") ?? searchParams.get("epic_cases"))
  const legendary = toInt(searchParams.get("legendary") ?? searchParams.get("legendary_cases"))
  const score = common * 5 + epic * 15 + legendary * 25

  const reserved = new Set([
    "userId",
    "userName",
    "score",
    "opens",
    "common",
    "rare",
    "epic",
    "legendary",
    "cases_opened",
    "common_cases",
    "rare_cases",
    "epic_cases",
    "legendary_cases",
  ])

  const inventory: Record<string, number> = {}
  for (const [key, value] of searchParams.entries()) {
    if (reserved.has(key)) continue
    inventory[key] = toInt(value)
  }

  const client = await pg.connect()

  try {
    await client.query("alter table case_leaderboard add column if not exists inventory jsonb")
    await client.query("begin")

    await client.query(
      `
      insert into case_leaderboard
        (user_id, user_name, score, opens, common, rare, epic, legendary, inventory, updated_at)
      values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
      on conflict (user_id) do update set
        user_name = excluded.user_name,
        score = excluded.score,
        opens = excluded.opens,
        common = excluded.common,
        rare = excluded.rare,
        epic = excluded.epic,
        legendary = excluded.legendary,
        inventory = excluded.inventory,
        updated_at = now()
      `,
      [userId, userName, score, opens, common, rare, epic, legendary, inventory]
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
