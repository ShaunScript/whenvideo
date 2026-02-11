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


  const opensParam = toInt(searchParams.get("opens") ?? searchParams.get("cases_opened"))
  const commonParam = toInt(
    searchParams.get("common") ?? searchParams.get("common_cases") ?? searchParams.get("common_count")
  )
  const rare = toInt(searchParams.get("rare") ?? searchParams.get("rare_cases"))
  const epicParam = toInt(searchParams.get("epic") ?? searchParams.get("epic_cases"))
  const legendaryParam = toInt(
    searchParams.get("legendary") ??
      searchParams.get("legendary_cases") ??
      searchParams.get("legendary_count")
  )

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
    "common_count",
    "rare_cases",
    "epic_cases",
    "legendary_cases",
    "legendary_count",
  ])

  const inventory: Record<string, number> = {}
  for (const [key, value] of searchParams.entries()) {
    if (reserved.has(key)) continue
    inventory[key] = toInt(value)
  }


  const commonFromInventory =
    (inventory.boink_count ?? 0) +
    (inventory.cheeseburger_count ?? 0) +
    (inventory.happyJump_count ?? 0) +
    (inventory.kebab_count ?? 0) +
    (inventory.miku_count ?? 0) +
    (inventory.monster_count ?? 0) +
    (inventory.nugget_count ?? 0) +
    (inventory.rocky_count ?? 0) +
    (inventory.wings_opened ?? 0) +
    (inventory.wumpa_count ?? 0)

  const epicFromInventory =
    (inventory.candy_count ?? 0) +
    (inventory.flashbang_count ?? 0) +
    (inventory.mikuShoots_count ?? 0) +
    (inventory.timeout_count ?? 0)

  const legendaryFromInventory =
    (inventory.nuke_count ?? 0) +
    (inventory.taxRefund_count ?? 0) +
    (inventory.unVip_count ?? 0) +
    (inventory.vip_count ?? 0)

  const common = commonParam || commonFromInventory
  const epic = epicParam || epicFromInventory
  const legendary = legendaryParam || legendaryFromInventory
  const opens = opensParam || common + epic + legendary
  const score = common * 5 + epic * 15 + legendary * 25

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
