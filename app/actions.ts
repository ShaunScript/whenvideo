"use server"

import { getYouTubeCache, setYouTubeCache } from "@/lib/youtube-cache"
import {
  fetchChannelVideos,
  fetchChannelVideosByHandle,
  fetchVideoById,
  filterLongVideos,
  fetchVideosByIds,
} from "@/lib/youtube-api"
import { readFeaturedVideo } from "@/lib/featured-video-cache"

const CACHE_TTL_MS = 10 * 60 * 1000

const YOUTUBE_CACHE_VERSION = 4

function cacheKey(maxResults: number, moreVideoIds: string[], featuredMode: string, featuredOverrideId: string | null) {
  const overridePart = featuredOverrideId ?? "none"
  return `yt:v${YOUTUBE_CACHE_VERSION}:${featuredMode}:${overridePart}:${maxResults}:${moreVideoIds.join(",")}`
}

async function loadFreshData(maxResults: number, moreVideoIds: string[], featuredOverrideId: string | null) {
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

  const needMoreData = await fetchChannelVideosByHandle(apiKey, "@needmoredoza", maxResults)
  const needMoreLongs = filterLongVideos(needMoreData.videos)

  const moreVids = moreVideoIds.length > 0 ? await fetchVideosByIds(apiKey, moreVideoIds) : []

  let featuredVideo = featuredOverrideId ? await fetchVideoById(apiKey, featuredOverrideId) : null

  if (!featuredVideo) {
    const getMostRecentVideo = (videos: typeof primary.videos) => {
      return videos.reduce((latest, current) => {
        if (!current) return latest
        if (!latest) return current
        const currentTime = new Date(current.publishedAt).getTime() || 0
        const latestTime = new Date(latest.publishedAt).getTime() || 0
        return currentTime >= latestTime ? current : latest
      }, null as (typeof primary.videos)[number] | null)
    }

    // Prefer long-form uploads for the featured slot; fall back to any upload if no longs are available.
    const primaryFeatured = getMostRecentVideo(filterLongVideos(primary.videos)) ?? getMostRecentVideo(primary.videos)
    const needMoreFeatured =
      getMostRecentVideo(filterLongVideos(needMoreData.videos)) ?? getMostRecentVideo(needMoreData.videos)

    // Prefer the secondary channel's latest upload when available; otherwise use primary.
    featuredVideo = needMoreFeatured ?? primaryFeatured
  }

  return {
    channelData: primary,
    longVideos: longs,
    tvVideos,
    moreVideos: moreVids,
    featuredVideo,
    secondaryLongVideos: needMoreLongs,
    secondaryChannelData: needMoreData,
  }
}

export async function getYouTubeChannelData(maxResults = 50, moreVideoIds: string[] = []) {
  const rawMode = (process.env.FEATURED_VIDEO_MODE ?? "").toLowerCase().trim()
  const featuredOverride = await readFeaturedVideo()
  const overrideId = (featuredOverride?.videoId ?? "").trim() || null

  const forceAuto = rawMode === "auto"
  const forceManual = rawMode === "manual"

  const featuredMode = forceAuto ? "auto" : forceManual ? "manual" : "auto+override"
  const effectiveOverrideId = forceAuto ? null : overrideId
  const key = cacheKey(maxResults, moreVideoIds, featuredMode, forceAuto ? null : overrideId)
  const cached = await getYouTubeCache<Awaited<ReturnType<typeof loadFreshData>>>(key, CACHE_TTL_MS, true)
  if (cached?.isFresh) return cached.data

  try {
    const data = await loadFreshData(maxResults, moreVideoIds, effectiveOverrideId)
    await setYouTubeCache(key, data)
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
