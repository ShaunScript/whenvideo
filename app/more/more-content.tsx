"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, ChevronDown } from "lucide-react"

interface Video {
  id: string
  title: string
  thumbnail: string
  description: string
  publishedAt: string
  channelTitle?: string
  channelId?: string
  duration: string
  viewCount?: string
}

export default function MoreContent() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [channels, setChannels] = useState<{ id: string; name: string; count: number }[]>([])
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular" | "length">("newest")
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [animationKey, setAnimationKey] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    loadMoreVideos()
  }, [])

  useEffect(() => {
    if (selectedChannel) {
      setFilteredVideos(videos.filter((video) => video.channelTitle === selectedChannel))
    } else {
      setFilteredVideos(videos)
    }
  }, [selectedChannel, videos])

  useEffect(() => {
    const filtered = selectedChannel ? videos.filter((video) => video.channelTitle === selectedChannel) : videos

    const sorted = [...filtered]
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    } else if (sortBy === "popular") {
      sorted.sort((a, b) => parseViewCount(b.viewCount) - parseViewCount(a.viewCount))
    } else if (sortBy === "length") {
      sorted.sort((a, b) => {
        const durationA = parseDuration(a.duration)
        const durationB = parseDuration(b.duration)
        return durationB - durationA
      })
    }

    const currentIds = filteredVideos.map((v) => v.id).join(",")
    const newIds = sorted.map((v) => v.id).join(",")
    if (currentIds !== newIds) {
      setIsAnimating(true)
      setAnimationKey((prev) => prev + 1)
      setTimeout(() => setIsAnimating(false), 50)
    }

    setFilteredVideos(sorted)
  }, [selectedChannel, videos, sortBy])

  const loadMoreVideos = async () => {
    try {
      console.log("[v0] More page - Loading videos from API")

      const response = await fetch("/api/admin/more", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        console.error("[v0] More page - Failed to fetch videos:", response.status)
        setVideos([])
        setFilteredVideos([])
        setIsLoading(false)
        return
      }

      const data = await response.json()
      const parsedVideos = data.videos || []
      console.log("[v0] More page - Loaded videos from API:", parsedVideos.length)

      const loadedVideos: Video[] = parsedVideos.map((v: any) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        description: v.description || "",
        publishedAt: v.publishedAt,
        channelTitle: v.channelName,
        channelId: v.channelId,
        duration: v.duration,
        viewCount: v.viewCount,
      }))

      setVideos(loadedVideos)
      setFilteredVideos(loadedVideos)

      // Build channel map
      const channelMap = new Map<string, { id: string; name: string; count: number }>()
      loadedVideos.forEach((video: Video) => {
        if (video.channelTitle) {
          const existing = channelMap.get(video.channelTitle)
          if (existing) {
            existing.count++
          } else {
            channelMap.set(video.channelTitle, {
              id: video.channelId || "",
              name: video.channelTitle,
              count: 1,
            })
          }
        }
      })
      setChannels(Array.from(channelMap.values()).sort((a, b) => b.count - a.count))
    } catch (error) {
      console.error("[v0] More page - Failed to load videos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoClick = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")
  }

  const parseDuration = (duration: string): number => {
    const parts = duration.split(":").map(Number)
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    return 0
  }

  const parseViewCount = (viewCount: string | undefined): number => {
    if (!viewCount) return 0
    const cleaned = viewCount.toString().toUpperCase().trim()
    if (cleaned.endsWith("M")) {
      return Number.parseFloat(cleaned.replace("M", "")) * 1000000
    } else if (cleaned.endsWith("K")) {
      return Number.parseFloat(cleaned.replace("K", "")) * 1000
    }
    return Number.parseInt(cleaned.replace(/,/g, "")) || 0
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="hover:bg-zinc-800">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">More</h1>
          </div>
          <div className="text-gray-400">
            {filteredVideos.length} {filteredVideos.length === 1 ? "video" : "videos"}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-gray-400 text-lg mb-4">No videos in more yet</p>
            <Button onClick={() => router.push("/admin")} className="bg-red-600 hover:bg-red-700">
              Go to Admin Panel
            </Button>
          </div>
        ) : (
          <>
            {channels.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setSelectedChannel(null)}
                    variant="outline"
                    className={
                      selectedChannel === null
                        ? "bg-red-600 text-white border-red-600 hover:bg-red-700 transition-all duration-300 transform scale-105"
                        : "bg-black text-white border border-white hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
                    }
                  >
                    All ({videos.length})
                  </Button>
                  {channels.map((channel) => (
                    <Button
                      key={channel.name}
                      onClick={() => setSelectedChannel(channel.name)}
                      variant="outline"
                      className={
                        selectedChannel === channel.name
                          ? "bg-white text-black border-white hover:bg-gray-200 transition-all duration-300 transform scale-105"
                          : "bg-black text-white border border-white hover:bg-white hover:text-black transition-all duration-300 transform hover:scale-105"
                      }
                    >
                      {channel.name} ({channel.count})
                    </Button>
                  ))}
                </div>

                <div className="relative">
                  <Button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    variant="outline"
                    className="bg-black text-white hover:bg-white hover:text-black transition-colors flex items-center gap-2"
                  >
                    Sort By{" "}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${showSortMenu ? "rotate-180" : ""}`}
                    />
                  </Button>

                  <div
                    className={`absolute right-0 mt-2 bg-black/80 backdrop-blur-sm border border-white rounded-lg shadow-lg z-10 transition-all duration-200 origin-top ${
                      showSortMenu
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSortBy("newest")
                        setShowSortMenu(false)
                      }}
                      className={`w-full text-right px-4 py-3 hover:bg-white/10 transition-colors rounded-t-lg ${
                        sortBy === "newest" ? "text-red-600 font-medium" : "text-white"
                      }`}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("oldest")
                        setShowSortMenu(false)
                      }}
                      className={`w-full text-right px-4 py-3 hover:bg-white/10 transition-colors ${
                        sortBy === "oldest" ? "text-red-600 font-medium" : "text-white"
                      }`}
                    >
                      Oldest
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("popular")
                        setShowSortMenu(false)
                      }}
                      className={`w-full text-right px-4 py-3 hover:bg-white/10 transition-colors ${
                        sortBy === "popular" ? "text-red-600 font-medium" : "text-white"
                      }`}
                    >
                      Popular
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("length")
                        setShowSortMenu(false)
                      }}
                      className={`w-full text-right px-4 py-3 hover:bg-white/10 transition-colors rounded-b-lg ${
                        sortBy === "length" ? "text-red-600 font-medium" : "text-white"
                      }`}
                    >
                      Length
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              key={animationKey}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-4"
            >
              {filteredVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="group cursor-pointer transition-all duration-300 transform-gpu origin-center"
                  style={{
                    opacity: isAnimating ? 0 : 1,
                    transform: isAnimating ? "translateY(16px)" : "translateY(0)",
                    transitionDelay: `${index * 30}ms`,
                  }}
                  onClick={() => handleVideoClick(video.id)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-zinc-900 group-hover:opacity-70 transition-opacity isolate">
                    <Image
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 fill-white text-white" />
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded-md text-xs font-medium">
                        {video.duration}
                      </div>
                    )}
                  </div>
                  <div className="h-10 mb-1">
                    <h3 className="font-medium line-clamp-2 text-sm" title={video.title}>
                      {video.title}
                    </h3>
                  </div>
                  {video.channelTitle && <p className="text-xs text-gray-400 line-clamp-1">{video.channelTitle}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
