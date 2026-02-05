// lib/more-db.ts
import { pg } from "@/lib/db"

export type MoreRow = {
  video_id: string
  source: "youtube" | "upload"
  added_at: string
  video_url: string | null
  title: string | null
  channel_name: string | null
  thumbnail: string | null
  description: string | null
  published_at: string | null
  view_count: string | null
  comment_count: number | null
  duration: string | null
}

let didInit = false

export async function ensureMoreTable() {
  if (didInit) return
  didInit = true

  await pg.query(`
    CREATE TABLE IF NOT EXISTS more_videos (
      video_id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'youtube',
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- only used for uploads (youtube metadata is fetched live)
      video_url TEXT,
      title TEXT,
      channel_name TEXT,
      thumbnail TEXT,
      description TEXT,
      published_at TIMESTAMPTZ,
      view_count TEXT,
      comment_count INT,
      duration TEXT
    );
  `)
}

export async function listMoreRows(): Promise<MoreRow[]> {
  await ensureMoreTable()
  const { rows } = await pg.query<MoreRow>(`
    SELECT
      video_id, source, added_at,
      video_url, title, channel_name, thumbnail, description,
      published_at, view_count, comment_count, duration
    FROM more_videos
    ORDER BY added_at DESC
  `)
  return rows
}

export async function addYouTubeIds(ids: string[]) {
  await ensureMoreTable()
  if (ids.length === 0) return { inserted: 0 }

  const values: any[] = []
  const placeholders = ids
    .map((id, i) => {
      values.push(id)
      return `($${i + 1}, 'youtube')`
    })
    .join(",")

  const res = await pg.query(
    `
    INSERT INTO more_videos (video_id, source)
    VALUES ${placeholders}
    ON CONFLICT (video_id) DO NOTHING
  `,
    values,
  )

  return { inserted: res.rowCount ?? 0 }
}

export async function addUploadVideo(v: {
  id: string
  videoUrl: string
  title: string
  channelName: string
  thumbnail?: string
  description?: string
  publishedAt?: string
  viewCount?: string
  commentCount?: number
  duration?: string
}) {
  await ensureMoreTable()

  await pg.query(
    `
    INSERT INTO more_videos (
      video_id, source, video_url,
      title, channel_name, thumbnail, description,
      published_at, view_count, comment_count, duration
    )
    VALUES (
      $1, 'upload', $2,
      $3, $4, $5, $6,
      $7, $8, $9, $10
    )
    ON CONFLICT (video_id) DO UPDATE SET
      video_url = EXCLUDED.video_url,
      title = EXCLUDED.title,
      channel_name = EXCLUDED.channel_name,
      thumbnail = EXCLUDED.thumbnail,
      description = EXCLUDED.description,
      published_at = EXCLUDED.published_at,
      view_count = EXCLUDED.view_count,
      comment_count = EXCLUDED.comment_count,
      duration = EXCLUDED.duration
  `,
    [
      v.id,
      v.videoUrl,
      v.title,
      v.channelName,
      v.thumbnail ?? "/placeholder.svg",
      v.description ?? "",
      v.publishedAt ? new Date(v.publishedAt).toISOString() : null,
      v.viewCount ?? "0",
      v.commentCount ?? 0,
      v.duration ?? "",
    ],
  )
}

export async function removeMoreVideo(id: string) {
  await ensureMoreTable()
  const res = await pg.query(`DELETE FROM more_videos WHERE video_id = $1`, [id])
  return { removed: (res.rowCount ?? 0) > 0 }
}

export async function clearMoreVideos() {
  await ensureMoreTable()
  await pg.query(`TRUNCATE TABLE more_videos`)
}
