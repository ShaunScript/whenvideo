import { pg } from "@/lib/db"

type Data = { videoId: string } | null

let didInit = false

async function ensureTable() {
  if (didInit) return
  didInit = true
  await pg.query(`
    CREATE TABLE IF NOT EXISTS featured_video_override (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function readFeaturedVideo(): Promise<Data> {
  await ensureTable()
  const { rows } = await pg.query<{ video_id: string }>(
    `SELECT video_id FROM featured_video_override WHERE id = 'featured' LIMIT 1`,
  )
  if (rows.length === 0) return null
  return { videoId: rows[0].video_id }
}

export async function writeFeaturedVideo(data: Data) {
  await ensureTable()
  if (!data) {
    await pg.query(`DELETE FROM featured_video_override WHERE id = 'featured'`)
    return
  }

  await pg.query(
    `
    INSERT INTO featured_video_override (id, video_id, updated_at)
    VALUES ('featured', $1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      video_id = EXCLUDED.video_id,
      updated_at = NOW()
  `,
    [data.videoId],
  )
}
