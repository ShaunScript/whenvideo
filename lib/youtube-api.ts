// YouTube API utilities for fetching channel videos

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
  duration: string
  durationSeconds: number
  videoUrl: string
  viewCount: string
  likeCount: number
  dislikeCount: number
  starRating: number
  commentCount: number
  channelTitle?: string
  channelId?: string
}

export interface YouTubeChannelData {
  channelTitle: string
  channelDescription: string
  videos: YouTubeVideo[]
}

const CHANNEL_ID = "UC4b2HUYYJIMd8LwiSzLpetQ"

// Format ISO 8601 duration to readable format
function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return "0:00"

  const hours = (match[1] || "").replace("H", "")
  const minutes = (match[2] || "").replace("M", "")
  const seconds = (match[3] || "").replace("S", "")

  if (hours) {
    return `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
  }
  return `${minutes || "0"}:${seconds.padStart(2, "0")}`
}

function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return 0

  const hours = Number.parseInt((match[1] || "0").replace("H", "")) || 0
  const minutes = Number.parseInt((match[2] || "0").replace("M", "")) || 0
  const seconds = Number.parseInt((match[3] || "0").replace("S", "")) || 0

  return hours * 3600 + minutes * 60 + seconds
}

// Helper function to format view count
function formatViewCount(count: string): string {
  const num = Number.parseInt(count)
  if (Number.isNaN(num)) return "0"
  if (num >= 1000000) return `${Math.round(num / 1000000)}M`
  if (num >= 1000) return `${Math.round(num / 1000)}K`
  return `${num}`
}

function calculateStarRating(likes: number, views: number): number {
  if (views === 0) return 0
  const likeRatio = likes / views
  if (likeRatio >= 0.08) return 5
  if (likeRatio >= 0.06) return 4.5
  if (likeRatio >= 0.04) return 4
  if (likeRatio >= 0.03) return 3.5
  if (likeRatio >= 0.02) return 3
  if (likeRatio >= 0.015) return 2.5
  if (likeRatio >= 0.01) return 2
  if (likeRatio >= 0.005) return 1.5
  if (likeRatio > 0) return 1
  return 0
}

export async function fetchChannelVideos(
  apiKey: string,
  maxResults = 10,
  channelId: string = CHANNEL_ID,
): Promise<YouTubeChannelData> {
  // Fetch channel details
  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${apiKey}`,
    { cache: "no-store" },
  )

  if (!channelResponse.ok) {
    const errorText = await channelResponse.text()
    console.error("YouTube API channel error:", errorText)
    throw new Error(`YouTube API error: ${channelResponse.status} - ${errorText.substring(0, 200)}`)
  }

  const channelData = await channelResponse.json()
  if (!channelData.items || channelData.items.length === 0) throw new Error("Channel not found")

  const channel = channelData.items[0]
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads

  // Fetch videos from uploads playlist
  const playlistResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`,
    { cache: "no-store" },
  )

  if (!playlistResponse.ok) {
    const errorText = await playlistResponse.text()
    console.error("YouTube API playlist error:", errorText)
    throw new Error(`YouTube API error: ${playlistResponse.status} - ${errorText.substring(0, 200)}`)
  }

  const playlistData = await playlistResponse.json()
  const ids = (playlistData.items ?? [])
    .map((item: any) => item?.snippet?.resourceId?.videoId)
    .filter(Boolean)

  const videos = await fetchVideosByIds(apiKey, ids)

  return {
    channelTitle: channel.snippet.title,
    channelDescription: channel.snippet.description,
    videos,
  }
}

export async function fetchChannelVideosByHandle(
  apiKey: string,
  handle: string,
  maxResults = 10,
): Promise<YouTubeChannelData> {
  // Resolve handle to channelId via search
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${apiKey}`,
    { cache: "no-store" },
  )
  if (!searchRes.ok) {
    const txt = await searchRes.text()
    throw new Error(`YouTube search error: ${searchRes.status} ${txt.substring(0, 200)}`)
  }
  const searchData = await searchRes.json()
  const channelId = searchData?.items?.[0]?.snippet?.channelId
  if (!channelId) throw new Error(`Channel not found for handle ${handle}`)

  return fetchChannelVideos(apiKey, maxResults, channelId)
}

export function getMostRecentVideo(videos: YouTubeVideo[]): YouTubeVideo | null {
  if (videos.length === 0) return null
  return videos[0]
}

// Removed shorts filter functions since we only want long videos
export function filterLongVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  return videos.filter((video) => video.durationSeconds > 300)
}

export async function fetchVideoById(apiKey: string, videoId: string): Promise<YouTubeVideo | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoId}&key=${apiKey}`,
      { cache: "no-store" },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("YouTube API error for video:", errorText)
      throw new Error(`YouTube API error: ${response.status} - ${errorText.substring(0, 200)}`)
    }

    const data = await response.json()
    if (!data.items || data.items.length === 0) return null

    const item = data.items[0]
    const viewCount = Number.parseInt(item.statistics.viewCount || "0")
    const likeCount = Number.parseInt(item.statistics.likeCount || "0")
    const commentCount = Number.parseInt(item.statistics.commentCount || "0")

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail:
        item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
      publishedAt: item.snippet.publishedAt,
      duration: formatDuration(item.contentDetails.duration),
      durationSeconds: parseDurationToSeconds(item.contentDetails.duration),
      videoUrl: `https://www.youtube.com/embed/${item.id}?autoplay=1`,
      viewCount: formatViewCount(item.statistics.viewCount),
      likeCount,
      dislikeCount: Number.parseInt(item.statistics.dislikeCount || "0") || 0,
      starRating: calculateStarRating(likeCount, Number.isNaN(viewCount) ? 0 : viewCount),
      commentCount,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
    }
  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error)
    return null
  }
}

export async function fetchVideosByIds(apiKey: string, videoIds: string[]): Promise<YouTubeVideo[]> {
  if (videoIds.length === 0) return []

  try {
    const BATCH_SIZE = 50
    const batches: string[][] = []

    for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
      batches.push(videoIds.slice(i, i + BATCH_SIZE))
    }

    const allVideos: YouTubeVideo[] = []

    for (const batch of batches) {
      const idsString = batch.join(",")
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${idsString}&key=${apiKey}`,
        { cache: "no-store" },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("YouTube API error for batch:", errorText)
        throw new Error(`YouTube API error: ${response.status} - ${errorText.substring(0, 200)}`)
      }

      const data = await response.json()

      const videos: YouTubeVideo[] = (data.items ?? []).map((item: any) => {
        const viewCount = Number.parseInt(item.statistics.viewCount || "0")
        const likeCount = Number.parseInt(item.statistics.likeCount || "0")
        const dislikeCount = Number.parseInt(item.statistics.dislikeCount || "0")
        const commentCount = Number.parseInt(item.statistics.commentCount || "0")

        return {
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail:
            item.snippet.thumbnails.maxres?.url ||
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.medium?.url,
          publishedAt: item.snippet.publishedAt,
          duration: formatDuration(item.contentDetails.duration),
          durationSeconds: parseDurationToSeconds(item.contentDetails.duration),
          videoUrl: `https://www.youtube.com/embed/${item.id}?autoplay=1`,
          viewCount: formatViewCount(item.statistics.viewCount),
          likeCount,
          dislikeCount,
          starRating: calculateStarRating(likeCount, Number.isNaN(viewCount) ? 0 : viewCount),
          commentCount,
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
        }
      })

      allVideos.push(...videos)
    }

    return allVideos
  } catch (error) {
    console.error("Error fetching videos by IDs:", error)
    return []
  }
}

export const getVideosByIds = fetchVideosByIds
