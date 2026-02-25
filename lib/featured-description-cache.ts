import { pg } from "@/lib/db"

type Data = { description: string } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_description_override (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedDescription(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ description: string }>(
    `SELECT description FROM featured_description_override WHERE id = 'featured' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { description: rows[0].description }
}

export async function writeFeaturedDescription(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_description_override WHERE id = 'featured'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_description_override (id, description, updated_at)
    VALUES ('featured', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      description = EXCLUDED.description,
      updated_at = NOW()
  `,
    [data.description],
  )
}
