/**
 * Utility for video URL management (localStorage-based, no Blob storage)
 */

interface VideoUrlEntry {
  id: string
  url: string
  title: string
}

interface ChannelUrls {
  [channel: string]: VideoUrlEntry[]
}

export interface MoreVideosUrlsData {
  videosByChannel: ChannelUrls
  totalVideos: number
  lastUpdated: string
}

// No-op function for backwards compatibility
export async function syncVideoUrlsToBlob(videos: any[]): Promise<void> {
  // Blob storage disabled - this is now a no-op
  console.log(`Video sync skipped (Blob disabled) - ${videos.length} videos`)
}

export async function getVideoUrlsFromBlob(): Promise<MoreVideosUrlsData | null> {
  // Blob storage disabled
  return null
}
