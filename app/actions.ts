"use server"

import { fetchChannelVideos, filterLongVideos, fetchVideosByIds } from "@/lib/youtube-api"

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { expiresAt: number; data: Awaited<ReturnType<typeof loadFreshData>> }>()

function cacheKey(maxResults: number, moreVideoIds: string[]) {
  return `${maxResults}|${moreVideoIds.join(",")}`
}

async function loadFreshData(maxResults: number, moreVideoIds: string[]) {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    throw new Error("YouTube API key not configured. Please add YOUTUBE_API_KEY to your environment variables.")
  }

  const primary = await fetchChannelVideos(apiKey, maxResults)
  const longs = filterLongVideos(primary.videos)

  // TV Shows: use the TV channel (channel ID)
  const tvChannelId = "UCNjCUNud_fzWjzswDI46rsg"
  const tvData = await fetchChannelVideos(apiKey, maxResults, tvChannelId)
  const tvVideos = filterLongVideos(tvData.videos)

  const moreVids = moreVideoIds.length > 0 ? await fetchVideosByIds(apiKey, moreVideoIds) : []

  return {
    channelData: primary,
    longVideos: longs,
    tvVideos,
    moreVideos: moreVids,
    featuredVideo: longs.length > 0 ? longs[0] : primary.videos.length > 0 ? primary.videos[0] : null,
  }
}

export async function getYouTubeChannelData(maxResults = 50, moreVideoIds: string[] = []) {
  const key = cacheKey(maxResults, moreVideoIds)
  const now = Date.now()
  const cached = cache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  try {
    const data = await loadFreshData(maxResults, moreVideoIds)
    cache.set(key, { expiresAt: now + CACHE_TTL_MS, data })
    return data
  } catch (error) {
    if (cached) {
      return cached.data
    }
    const detail = error instanceof Error ? error.message : String(error)
    console.error("Failed to load YouTube data:", detail)
    throw new Error(`Failed to load YouTube videos. ${detail}`)
  }
}
