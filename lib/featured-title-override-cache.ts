import { pg } from "@/lib/db"

type Data = { title: string } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_title_override (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedTitleOverride(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ title: string }>(
    `SELECT title FROM featured_title_override WHERE id = 'featured' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { title: rows[0].title }
}

export async function writeFeaturedTitleOverride(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_title_override WHERE id = 'featured'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_title_override (id, title, updated_at)
    VALUES ('featured', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      updated_at = NOW()
  `,
    [data.title],
  )
}
