import { pg } from "@/lib/db"

type Data = { videoIds: string[] } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_videos_override (
      id TEXT PRIMARY KEY,
      video_ids TEXT[] NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedVideos(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ video_ids: string[] }>(
    `SELECT video_ids FROM featured_videos_override WHERE id = 'featured-list' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { videoIds: rows[0].video_ids ?? [] }
}

export async function writeFeaturedVideos(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_videos_override WHERE id = 'featured-list'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_videos_override (id, video_ids, updated_at)
    VALUES ('featured-list', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      video_ids = EXCLUDED.video_ids,
      updated_at = NOW()
  `,
    [data.videoIds],
  )
}
