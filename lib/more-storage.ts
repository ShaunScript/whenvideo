"use client"

export interface MoreVideo {
  id: string // YouTube video ID
  title: string
  channelName: string
  thumbnail: string
  description: string
  publishedAt: string
  viewCount: string // Keep as formatted string from API
  commentCount: number // Added commentCount field
  duration: string
  addedAt: string // ISO date string when added to More
}

interface MoreData {
  videos: MoreVideo[]
}

const STORAGE_KEY = "doza-more-videos"

function getStorageData(): MoreData {
  try {
    if (typeof window === "undefined") {
      return { videos: [] }
    }

    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      return { videos: [] }
    }

    return JSON.parse(data) as MoreData
  } catch (error) {
    console.error("Failed to read storage data:", error)
    return { videos: [] }
  }
}

function saveStorageData(data: MoreData): void {
  try {
    if (typeof window === "undefined") {
      console.warn("Cannot save to localStorage in server environment")
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log("[v0] Saved more videos to localStorage:", data.videos.length)
  } catch (error) {
    console.error("Failed to save storage data:", error)
    throw error
  }
}

export async function getMoreVideos(): Promise<MoreVideo[]> {
  try {
    const response = await fetch("/api/admin/more")
    const data = await response.json()
    console.log("[v0] Getting more videos from Blob:", data.videos?.length || 0)
    return data.videos || []
  } catch (error) {
    console.error("Failed to get more videos:", error)
    return []
  }
}

export async function getMoreVideoIds(): Promise<string[]> {
  const videos = await getMoreVideos()
  return videos.map((v) => v.id)
}

export async function addMoreVideo(video: MoreVideo): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/more", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ video }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to add more video:", error)
    return { success: false, message: "Failed to add video" }
  }
}

export async function removeMoreVideo(videoId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/admin/more?videoId=${videoId}`, {
      method: "DELETE",
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to remove more video:", error)
    return { success: false, message: "Failed to remove video" }
  }
}
