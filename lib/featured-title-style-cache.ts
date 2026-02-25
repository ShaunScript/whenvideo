import { pg } from "@/lib/db"

type Data = { fontFamily: string; fontSizePx: number } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_title_style_override (
      id TEXT PRIMARY KEY,
      font_family TEXT NOT NULL,
      font_size_px INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedTitleStyle(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ font_family: string; font_size_px: number }>(
    `SELECT font_family, font_size_px FROM featured_title_style_override WHERE id = 'featured' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { fontFamily: rows[0].font_family, fontSizePx: rows[0].font_size_px }
}

export async function writeFeaturedTitleStyle(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_title_style_override WHERE id = 'featured'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_title_style_override (id, font_family, font_size_px, updated_at)
    VALUES ('featured', $1, $2, NOW())
    ON CONFLICT (id) DO UPDATE SET
      font_family = EXCLUDED.font_family,
      font_size_px = EXCLUDED.font_size_px,
      updated_at = NOW()
  `,
    [data.fontFamily, data.fontSizePx],
  )
}
