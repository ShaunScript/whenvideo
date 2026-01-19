"use server"

import { fetchChannelVideos, filterLongVideos, fetchVideosByIds } from "@/lib/youtube-api"

export async function getYouTubeChannelData(maxResults = 50, moreVideoIds: string[] = []) {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    throw new Error("YouTube API key not configured. Please add YOUTUBE_API_KEY to your environment variables.")
  }

  try {
    const data = await fetchChannelVideos(apiKey, maxResults)
    const longs = filterLongVideos(data.videos)

    const moreVids = moreVideoIds.length > 0 ? await fetchVideosByIds(apiKey, moreVideoIds) : []

    return {
      channelData: data,
      longVideos: longs,
      moreVideos: moreVids,
      featuredVideo: longs.length > 0 ? longs[0] : data.videos.length > 0 ? data.videos[0] : null,
    }
  } catch (error) {
    console.error("Failed to load YouTube data:", error)
    throw new Error("Failed to load YouTube videos. Please check your API key and try again.")
  }
}
