import { pg } from "@/lib/db"

type Data = { thumbnailUrl: string } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_thumbnail_override (
      id TEXT PRIMARY KEY,
      thumbnail_url TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedThumb(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ thumbnail_url: string }>(
    `SELECT thumbnail_url FROM featured_thumbnail_override WHERE id = 'featured' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { thumbnailUrl: rows[0].thumbnail_url }
}

export async function writeFeaturedThumb(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_thumbnail_override WHERE id = 'featured'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_thumbnail_override (id, thumbnail_url, updated_at)
    VALUES ('featured', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      thumbnail_url = EXCLUDED.thumbnail_url,
      updated_at = NOW()
  `,
    [data.thumbnailUrl],
  )
}
