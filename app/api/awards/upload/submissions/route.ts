import { NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      categoryId,
      videoUrl,
      videoId = null,
      source = "other",
      title,
      channelName,
      thumbnailUrl = null,
      submittedBy = null,
    } = body

    if (!categoryId || !videoUrl || !title || !channelName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO awards_submissions
        (category_id, video_url, video_id, source, title, channel_name, thumbnail_url, submitted_by, status)
      VALUES
        (${categoryId}, ${videoUrl}, ${videoId}, ${source}, ${title}, ${channelName}, ${thumbnailUrl}, ${submittedBy}, 'pending')
      RETURNING *
    `

    return NextResponse.json({ success: true, submission: result.rows[0] })
  } catch (e: any) {
    console.error("[awards submissions POST]", e)
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await sql`
      SELECT *
      FROM awards_submissions
      ORDER BY created_at DESC
      LIMIT 500
    `
    return NextResponse.json({ submissions: result.rows })
  } catch (e: any) {
    console.error("[awards submissions GET]", e)
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 })
  }
}
