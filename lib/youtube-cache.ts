import { pg } from "@/lib/db"

type CacheRow = {
  cache_key: string
  data: unknown
  updated_at: string
}

let didInit = false

async function ensureYouTubeCacheTable() {
  if (didInit) return
  didInit = true

  await pg.query(`
    CREATE TABLE IF NOT EXISTS youtube_cache (
      cache_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function getYouTubeCache<T>(
  key: string,
  ttlMs: number,
  allowStale = false,
): Promise<{ data: T; isFresh: boolean } | null> {
  try {
    await ensureYouTubeCacheTable()
    const { rows } = await pg.query<CacheRow>(
      `
      SELECT cache_key, data, updated_at
      FROM youtube_cache
      WHERE cache_key = $1
    `,
      [key],
    )

    const row = rows[0]
    if (!row) return null

    const updatedAt = new Date(row.updated_at).getTime()
    if (Number.isNaN(updatedAt)) return null
    const age = Date.now() - updatedAt
    const isFresh = age <= ttlMs
    if (!isFresh && !allowStale) return null

    return { data: row.data as T, isFresh }
  } catch (error) {
    console.error("YouTube cache read failed:", error)
    return null
  }
}

export async function setYouTubeCache(key: string, data: unknown): Promise<void> {
  try {
    await ensureYouTubeCacheTable()
    await pg.query(
      `
      INSERT INTO youtube_cache (cache_key, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `,
      [key, JSON.stringify(data)],
    )
  } catch (error) {
    console.error("YouTube cache write failed:", error)
  }
}
