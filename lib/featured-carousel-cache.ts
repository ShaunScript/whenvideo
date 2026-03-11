import { pg } from "@/lib/db"

export type FeaturedCarouselItem = {
  videoId: string
  title?: string
  description?: string
  thumbnailUrl?: string
}

type Data = { items: FeaturedCarouselItem[] } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_carousel_override (
      id TEXT PRIMARY KEY,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedCarousel(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ items: FeaturedCarouselItem[] }>(
    `SELECT items FROM featured_carousel_override WHERE id = 'featured-carousel' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { items: Array.isArray(rows[0].items) ? rows[0].items : [] }
}

export async function writeFeaturedCarousel(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_carousel_override WHERE id = 'featured-carousel'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_carousel_override (id, items, updated_at)
    VALUES ('featured-carousel', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      items = EXCLUDED.items,
      updated_at = NOW()
  `,
    [JSON.stringify(data.items ?? [])],
  )
}
