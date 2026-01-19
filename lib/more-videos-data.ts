"use client"

// More videos data management with localStorage (similar to awards system)

export interface MoreVideo {
  id: string // YouTube video ID
  title: string
  channelName: string
  thumbnail: string
  addedAt: string // ISO date string
}

const STORAGE_KEY = "more-videos-data"

export function getMoreVideosData(): MoreVideo[] {
  if (typeof window === "undefined") return []

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error("Failed to parse more videos data", e)
      return []
    }
  }

  return []
}

export function saveMoreVideosData(videos: MoreVideo[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
}

export function addMoreVideoData(video: MoreVideo) {
  if (typeof window === "undefined") return

  const videos = getMoreVideosData()

  // Check if video already exists
  const exists = videos.some((v) => v.id === video.id)
  if (exists) {
    console.log(`[v0] Video ${video.id} already exists in More videos`)
    return
  }

  videos.push(video)
  saveMoreVideosData(videos)
  console.log(`[v0] Added video ${video.id} to More videos. Total: ${videos.length}`)
}

export function removeMoreVideoData(videoId: string) {
  if (typeof window === "undefined") return

  const videos = getMoreVideosData()
  const filtered = videos.filter((v) => v.id !== videoId)
  saveMoreVideosData(filtered)
  console.log(`[v0] Removed video ${videoId} from More videos. Remaining: ${filtered.length}`)
}

export function getMoreVideoIds(): string[] {
  return getMoreVideosData().map((v) => v.id)
}
