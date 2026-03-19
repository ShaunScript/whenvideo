import { pg } from "@/lib/db"

type Data = {
  fontFamily: string
  fontSizePx: number
  fontUrl?: string | null
  offsetXPx?: number
  offsetYPx?: number
} | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_title_style_override (
      id TEXT PRIMARY KEY,
      font_family TEXT NOT NULL,
      font_size_px INTEGER NOT NULL,
      font_url TEXT,
      offset_x_px INTEGER NOT NULL DEFAULT 0,
      offset_y_px INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await pg.query(`ALTER TABLE featured_title_style_override ADD COLUMN IF NOT EXISTS font_url TEXT;`)
  await pg.query(
    `ALTER TABLE featured_title_style_override ADD COLUMN IF NOT EXISTS offset_x_px INTEGER NOT NULL DEFAULT 0;`,
  )
  await pg.query(
    `ALTER TABLE featured_title_style_override ADD COLUMN IF NOT EXISTS offset_y_px INTEGER NOT NULL DEFAULT 0;`,
  )
}

export async function readFeaturedTitleStyle(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{
    font_family: string
    font_size_px: number
    font_url: string | null
    offset_x_px: number | null
    offset_y_px: number | null
  }>(
    `SELECT font_family, font_size_px, font_url, offset_x_px, offset_y_px FROM featured_title_style_override WHERE id = 'featured' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return {
    fontFamily: rows[0].font_family,
    fontSizePx: rows[0].font_size_px,
    fontUrl: rows[0].font_url ?? null,
    offsetXPx: rows[0].offset_x_px ?? 0,
    offsetYPx: rows[0].offset_y_px ?? 0,
  }
}

export async function writeFeaturedTitleStyle(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_title_style_override WHERE id = 'featured'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_title_style_override (id, font_family, font_size_px, font_url, offset_x_px, offset_y_px, updated_at)
    VALUES ('featured', $1, $2, $3, $4, $5, NOW())
    ON CONFLICT (id) DO UPDATE SET
      font_family = EXCLUDED.font_family,
      font_size_px = EXCLUDED.font_size_px,
      font_url = EXCLUDED.font_url,
      offset_x_px = EXCLUDED.offset_x_px,
      offset_y_px = EXCLUDED.offset_y_px,
      updated_at = NOW()
  `,
    [data.fontFamily, data.fontSizePx, data.fontUrl ?? null, data.offsetXPx ?? 0, data.offsetYPx ?? 0],
  )
}
