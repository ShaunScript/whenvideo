import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!process.env.CASE_INGEST_TOKEN || token !== process.env.CASE_INGEST_TOKEN) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ ok: false, error: "missing_rows" }, { status: 400 })
  }

  const client = await pg.connect()

  try {
    await client.query("alter table case_leaderboard add column if not exists inventory jsonb")
    await client.query("begin")

    for (const r of body.rows) {
      const opens = r.opens ?? r.cases_opened ?? 0
      const common = r.common ?? r.common_cases ?? 0
      const rare = r.rare ?? r.rare_cases ?? 0
      const epic = r.epic ?? r.epic_cases ?? 0
      const legendary = r.legendary ?? r.legendary_cases ?? 0
      const score = common * 5 + epic * 15 + legendary * 25

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
        [
          r.userId,
          r.userName,
          score,
          opens,
          common,
          rare,
          epic,
          legendary,
          r.inventory ?? null,
        ]
      )
    }

    await client.query("commit")
    return NextResponse.json({ ok: true })
  } catch (err) {
    await client.query("rollback")
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 })
  } finally {
    client.release()
  }
}
