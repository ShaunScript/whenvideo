"use client"

// Votes still use localStorage since they are user-specific

export interface Nominee {
  id: string
  title: string
  videoId: string
  channelName: string
  videoSource?: "youtube" | "instagram" | "tiktok" | "gdrive" | "medal" | "file" | "other"
  videoUrl?: string
  customThumbnail?: string
}

export interface Category {
  id: string
  name: string
  description: string
  nominees: Nominee[]
}

export const CATEGORIES_CONFIG = [
  {
    id: "best-content",
    name: "Best Content",
    description: "The video with the highest production value and engagement",
  },
  {
    id: "funny-haha",
    name: "Funny Haha",
    description: "that clips was funny ha",
  },
  {
    id: "best-clip",
    name: "Gamer Moment",
    description: "The best clip of the year",
  },
  {
    id: "best-fail",
    name: "Best Oopsie",
    description: "The best fail of the year",
  },
  {
    id: "best-intro",
    name: "Best Intro",
    description: "The most captivating opening sequence",
  },
  {
    id: "low-budget",
    name: "Low Budget",
    description: "Best 'low' effort content",
  },
  {
    id: "short-edit",
    name: "Short Edit",
    description: "The best short edit",
  },
  {
    id: "best-editing",
    name: "Best Editing",
    description: "The video with the most impressive editing",
  },
  {
    id: "best-video",
    name: "Best Video",
    description: "The overall best video of the year",
  },
]

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch("/api/admin/awards")
    const data = await response.json()

    if (data.categories && data.categories.length > 0) {
      return data.categories
    }

    // Initialize with empty nominees if no data exists
    const categories = CATEGORIES_CONFIG.map((cat) => ({
      ...cat,
      nominees: [],
    }))

    return categories
  } catch (error) {
    console.error("Failed to get categories:", error)
    // Return initialized categories on error
    return CATEGORIES_CONFIG.map((cat) => ({
      ...cat,
      nominees: [],
    }))
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  const res = await fetch("/api/admin/awards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categories }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`saveCategories failed (${res.status}): ${text}`)
  }

  console.log("[awards] Saved categories successfully")
}


export function extractVideoId(url: string): string | null {
  // Extract YouTube video ID from various URL formats including Shorts and Clips
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/clip\/Ugkx[a-zA-Z0-9_-]+/,
  ]

  // Special handling for clips
  if (url.includes("/clip/")) {
    const clipMatch = url.match(/\/clip\/(Ugkx[a-zA-Z0-9_-]+)/)
    if (clipMatch) {
      return clipMatch[1]
    }
  }

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // If it's just the video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url
  }

  return null
}

export function extractVideoInfo(url: string): {
  videoId: string | null
  videoSource: "youtube" | "instagram" | "tiktok" | "gdrive" | "medal" | "file" | "other"
  videoUrl: string
} {
  const trimmedUrl = url.trim()

  if (trimmedUrl.includes("blob.vercel-storage.com") || trimmedUrl.includes("blob.v0.app")) {
    return {
      videoId: `file-${Date.now()}`,
      videoSource: "file",
      videoUrl: trimmedUrl,
    }
  }

  const fileExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
  const isDirectFile = fileExtensions.some(
    (ext) => trimmedUrl.toLowerCase().includes(ext) || trimmedUrl.toLowerCase().endsWith(ext.split("?")[0]),
  )

  if (isDirectFile) {
    return {
      videoId: `file-${Date.now()}`,
      videoSource: "file",
      videoUrl: trimmedUrl,
    }
  }

  // YouTube
  const youtubeId = extractVideoId(trimmedUrl)
  if (youtubeId) {
    return { videoId: youtubeId, videoSource: "youtube", videoUrl: trimmedUrl }
  }

  // Instagram
  if (trimmedUrl.includes("instagram.com") || trimmedUrl.includes("instagr.am")) {
    const instaMatch = trimmedUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/)
    return {
      videoId: instaMatch ? instaMatch[1] : `insta-${Date.now()}`,
      videoSource: "instagram",
      videoUrl: trimmedUrl,
    }
  }

  // TikTok
  if (trimmedUrl.includes("tiktok.com")) {
    const tiktokMatch =
      trimmedUrl.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) ||
      trimmedUrl.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/) ||
      trimmedUrl.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/)
    return {
      videoId: tiktokMatch ? tiktokMatch[1] : `tiktok-${Date.now()}`,
      videoSource: "tiktok",
      videoUrl: trimmedUrl,
    }
  }

  // Google Drive
  if (trimmedUrl.includes("drive.google.com")) {
    const driveMatch = trimmedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmedUrl.match(/id=([a-zA-Z0-9_-]+)/)
    return {
      videoId: driveMatch ? driveMatch[1] : `gdrive-${Date.now()}`,
      videoSource: "gdrive",
      videoUrl: trimmedUrl,
    }
  }

  // Medal.tv
  if (trimmedUrl.includes("medal.tv")) {
    const medalMatch =
      trimmedUrl.match(/medal\.tv\/(?:games\/[^/]+\/)?clips\/([a-zA-Z0-9]+)/) ||
      trimmedUrl.match(/medal\.tv\/clips\/([a-zA-Z0-9]+)/)
    return {
      videoId: medalMatch ? medalMatch[1] : `medal-${Date.now()}`,
      videoSource: "medal",
      videoUrl: trimmedUrl,
    }
  }

  // Other/Unknown - just use timestamp as ID
  return {
    videoId: `other-${Date.now()}`,
    videoSource: "other",
    videoUrl: trimmedUrl,
  }
}

export function getThumbnailUrl(nominee: Nominee): string | null {
  // If there's a custom thumbnail, use it
  if (nominee.customThumbnail) {
    return nominee.customThumbnail
  }

  // YouTube thumbnails
  if (!nominee.videoSource || nominee.videoSource === "youtube") {
    return `https://img.youtube.com/vi/${nominee.videoId}/maxresdefault.jpg`
  }

  // Google Drive thumbnail (if file ID is available)
  if (nominee.videoSource === "gdrive" && nominee.videoId && !nominee.videoId.startsWith("gdrive-")) {
    return `https://drive.google.com/thumbnail?id=${nominee.videoId}&sz=w1280`
  }

  return null
}

// Simple auth state management
export interface User {
  id: string
  name: string
  provider: string
  hasVoted: boolean
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("awards-user")
  return stored ? JSON.parse(stored) : null
}

export function setCurrentUser(user: User | null) {
  if (typeof window === "undefined") return
  if (user) {
    localStorage.setItem("awards-user", JSON.stringify(user))
  } else {
    localStorage.removeItem("awards-user")
  }
}

export function saveVotes(userId: string, votes: Record<string, string>) {
  if (typeof window === "undefined") return

  const allVotes = getAllVotesData()
  allVotes[userId] = votes
  localStorage.setItem("awards-votes", JSON.stringify(allVotes))

  // Mark user as voted
  const user = getCurrentUser()
  if (user) {
    user.hasVoted = true
    setCurrentUser(user)
  }
}

export function getUserVotes(userId: string): Record<string, string> | null {
  if (typeof window === "undefined") return null
  const allVotes = getAllVotesData()
  return allVotes[userId] || null
}

export function getAllVotesData(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {}
  const stored = localStorage.getItem("awards-votes")
  return stored ? JSON.parse(stored) : {}
}

export function calculateResults(): Record<string, Record<string, number>> {
  const allVotes = getAllVotesData()
  const results: Record<string, Record<string, number>> = {}

  // Initialize categories
  CATEGORIES_CONFIG.forEach((cat) => {
    results[cat.id] = {}
  })

  // Count votes for each nominee in each category
  Object.values(allVotes).forEach((userVotes) => {
    Object.entries(userVotes).forEach(([categoryId, nomineeId]) => {
      if (!results[categoryId]) {
        results[categoryId] = {}
      }
      results[categoryId][nomineeId] = (results[categoryId][nomineeId] || 0) + 1
    })
  })

  return results
}

export function getVoterDetailsForCategory(categoryId: string, nomineeId: string): string[] {
  if (typeof window === "undefined") return []

  const allVotes = getAllVotesData()
  const voterNames: string[] = []

  Object.entries(allVotes).forEach(([userId, userVotes]) => {
    if (userVotes[categoryId] === nomineeId) {
      const parts = userId.split("-")
      if (parts.length >= 2) {
        const username = parts.slice(1, -1).join("-")
        voterNames.push(username)
      }
    }
  })

  return voterNames
}

export function removeVote(categoryId: string, nomineeId: string, voterName: string) {
  if (typeof window === "undefined") return

  const allVotes = getAllVotesData()

  Object.keys(allVotes).forEach((userId) => {
    const parts = userId.split("-")
    if (parts.length >= 2) {
      const username = parts.slice(1, -1).join("-")
      if (username === voterName && allVotes[userId][categoryId] === nomineeId) {
        delete allVotes[userId][categoryId]

        if (Object.keys(allVotes[userId]).length === 0) {
          delete allVotes[userId]
        }
      }
    }
  })

  localStorage.setItem("awards-votes", JSON.stringify(allVotes))
}

export function checkIfUserExists(username: string): boolean {
  if (typeof window === "undefined") return false

  const allVotes = getAllVotesData()
  const normalizedUsername = username.toLowerCase().replace(/^@/, "")

  return Object.keys(allVotes).some((userId) => {
    const parts = userId.split("-")
    if (parts.length >= 2) {
      const existingUsername = parts.slice(1, -1).join("-").toLowerCase().replace(/^@/, "")
      return existingUsername === normalizedUsername
    }
    return false
  })
}

export function getAllVoters(): string[] {
  if (typeof window === "undefined") return []

  const allVotes = getAllVotesData()
  const voterNames: string[] = []

  Object.keys(allVotes).forEach((userId) => {
    const parts = userId.split("-")
    if (parts.length >= 2) {
      const username = parts.slice(1, -1).join("-")
      if (!voterNames.includes(username)) {
        voterNames.push(username)
      }
    }
  })

  return voterNames.sort()
}

export function removeUserVotes(voterName: string) {
  if (typeof window === "undefined") return

  const allVotes = getAllVotesData()

  Object.keys(allVotes).forEach((userId) => {
    const parts = userId.split("-")
    if (parts.length >= 2) {
      const username = parts.slice(1, -1).join("-")
      if (username === voterName) {
        delete allVotes[userId]
      }
    }
  })

  localStorage.setItem("awards-votes", JSON.stringify(allVotes))
}
