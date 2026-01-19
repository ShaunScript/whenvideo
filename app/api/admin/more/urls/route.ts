import { NextResponse } from "next/server"
import { getVideoUrlsFromBlob } from "@/lib/more-videos-sync"

/**
 * GET /api/admin/more/urls
 * Returns all video URLs organized by channel
 *
 * Response format:
 * {
 *   videosByChannel: {
 *     "franzj": [{ id, url, title }, ...],
 *     "zuhn": [{ id, url, title }, ...],
 *     ...
 *   },
 *   totalVideos: number,
 *   lastUpdated: string
 * }
 */
export async function GET() {
  try {
    const data = await getVideoUrlsFromBlob()

    if (!data) {
      return NextResponse.json({
        videosByChannel: {},
        totalVideos: 0,
        lastUpdated: null,
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Failed to get video URLs:", error)
    return NextResponse.json({ error: "Failed to get video URLs" }, { status: 500 })
  }
}
