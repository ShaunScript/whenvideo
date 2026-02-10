"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Play, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { VideoModal } from "./components/video-modal"
import { getYouTubeChannelData } from "@/app/actions"
import type { YouTubeVideo, YouTubeChannelData } from "@/lib/youtube-api"
import { TwitchLiveIndicator } from "@/components/twitch-live-indicator"
import { getMoreVideos } from "@/lib/more-storage"
import { LoadingSpinner } from "@/components/loading-spinner"
import { FaTwitch, FaXTwitter, FaInstagram, FaTiktok } from "react-icons/fa6"
import { FaPatreon } from "react-icons/fa"


function renderStars(rating: number) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const gradientId = `half-star-${rating}`

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <svg key={`full-${i}`} className="w-3 h-3 fill-red-600" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>,
    )
  }

  if (hasHalfStar) {
    stars.push(
      <svg key="half" className="w-3 h-3" viewBox="0 0 24 24">
        <defs>
          <linearGradient id={gradientId}>
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gradientId})`}
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        />
      </svg>,
    )
  }

  const emptyStars = 5 - Math.ceil(rating)
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <svg key={`empty-${i}`} className="w-3 h-3 fill-white" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>,
    )
  }

  return stars
}

function formatCommentCount(count: number): string {
  if (count >= 1000000) return `${Math.round(count / 1000000)}M`
  if (count >= 1000) return `${Math.round(count / 1000)}K`
  return `${count}`
}

function extractVideoId(videoUrl: string): string | null {
  const videoIdMatch =
    videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/) ||
    videoUrl.match(/youtube\.com\/watch\?.*v=([^&?\s]+)/)

  return videoIdMatch ? videoIdMatch[1] : null
}

export default function Home() {
  const iconClass = "w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0"
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [youtubeData, setYoutubeData] = React.useState<YouTubeChannelData | null>(null)
  const [longVideos, setLongVideos] = React.useState<YouTubeVideo[] | null>(null)
  const [tvVideos, setTvVideos] = React.useState<YouTubeVideo[] | null>(null)
  const [featuredVideo, setFeaturedVideo] = React.useState<YouTubeVideo | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const videosSectionRef = React.useRef<HTMLDivElement>(null)
  const [videoModal, setVideoModal] = React.useState<{ isOpen: boolean; title: string; videoUrl: string }>({
    isOpen: false,
    title: "",
    videoUrl: "",
  })
  const [playingVideo, setPlayingVideo] = React.useState<{ videoId: string; title: string } | null>(null)
  const [hoveredId, setHoveredId] = React.useState<number | null>(null)
  const [timeSinceUpload, setTimeSinceUpload] = React.useState<string>("")
  const [timeUnits, setTimeUnits] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [moreVideos, setMoreVideos] = React.useState<YouTubeVideo[] | null>(null)
  const [randomizedMoreVideos, setRandomizedMoreVideos] = React.useState<YouTubeVideo[] | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [isCompactMode, setIsCompactMode] = React.useState(false)
  const [activeMobileNav, setActiveMobileNav] = React.useState("home")

  const searchInputCallbackRef = React.useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus()
    }
  }, [])

  const desktopSearchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isSearchExpanded && desktopSearchInputRef.current) {
      desktopSearchInputRef.current.focus()
    }
  }, [isSearchExpanded])

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return []

    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^\w\s]/g, "")
        .trim()
    }

    const query = normalizeText(searchQuery)
    const results: { video: YouTubeVideo; category: string }[] = []

    if (longVideos) {
      longVideos.forEach((video) => {
        if (
          normalizeText(video.title).includes(query) ||
          (video.channelTitle && normalizeText(video.channelTitle).includes(query))
        ) {
          results.push({ video, category: "Movies" })
        }
      })
    }

    if (tvVideos) {
      tvVideos.forEach((video) => {
        if (
          normalizeText(video.title).includes(query) ||
          (video.channelTitle && normalizeText(video.channelTitle).includes(query))
        ) {
          results.push({ video, category: "TV Shows" })
        }
      })
    }

    if (moreVideos) {
      moreVideos.forEach((video) => {
        if (
          normalizeText(video.title).includes(query) ||
          (video.channelTitle && normalizeText(video.channelTitle).includes(query))
        ) {
          results.push({ video, category: "More" })
        }
      })
    }

    return results
  }, [searchQuery, longVideos, tvVideos, moreVideos])

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsCompactMode(window.innerWidth < 1400)
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  const handleHomeClick = (e: React.MouseEvent) => {
    if (window.location.pathname === "/") {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const closeSearch = () => {
    setSearchQuery("")
    setIsSearchExpanded(false)
  }

  const openVideoModal = (title: string, videoUrl: string) => {
    const videoId = extractVideoId(videoUrl)
    if (videoId) {
      setPlayingVideo({ videoId, title })
    } else {
      alert("Unable to play this video")
    }
  }

  const closeVideoModal = () => {
    setPlayingVideo(null)
  }

  const scrollToVideos = () => {
    videosSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const moreVideosFromStorage = await getMoreVideos()
        console.log("[v0] Home - More videos from Blob:", moreVideosFromStorage.length)

        const result = await getYouTubeChannelData(50, [])

        setYoutubeData(result.channelData)
        setLongVideos(result.longVideos)
        setTvVideos(result.tvVideos)
        setFeaturedVideo(result.featuredVideo)
        try {
          const res = await fetch("/api/admin/more/featured-thumbmail")
          const json = await res.json()
          const override = json?.data
        
          if (override?.videoId && override?.thumbnailUrl && result.featuredVideo?.id === override.videoId) {
            setFeaturedVideo({ ...result.featuredVideo, thumbnail: override.thumbnailUrl })
          }
        } catch {}
        setApiError(null)

        const convertedMoreVideos: YouTubeVideo[] = moreVideosFromStorage.map((video) => ({
          id: video.id,
          title: video.title,
          channelTitle: video.channelName,
          thumbnail: video.thumbnail,
          description: video.description,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          duration: video.duration,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          starRating: 4.5,
          commentCount: video.commentCount || 0,
        }))

        const sortedMoreVideos = convertedMoreVideos.sort((a, b) => {
          const dateA = new Date(a.publishedAt).getTime()
          const dateB = new Date(b.publishedAt).getTime()
          return dateB - dateA
        })
        setMoreVideos(sortedMoreVideos.length > 0 ? sortedMoreVideos : null)

        // Guard against empty video arrays
        if (!sortedMoreVideos || sortedMoreVideos.length === 0) {
          setRandomizedMoreVideos([])
        } else {
          // Group videos by channel
          const videosByChannel: Record<string, YouTubeVideo[]> = {}
          for (const video of sortedMoreVideos) {
            if (!video) continue
            const channel = video.channelTitle || "Unknown"
            if (!videosByChannel[channel]) {
              videosByChannel[channel] = []
            }
            videosByChannel[channel].push(video)
          }

          // Get unique channels and shuffle them for random order
          const uniqueChannels = Object.keys(videosByChannel)
          const shuffledChannels = [...uniqueChannels].sort(() => Math.random() - 0.5)

          const randomized: YouTubeVideo[] = []
          const usedVideoIds = new Set<string>()

          // Pick one RANDOM video from each unique channel for first 4 slots (after newest)
          const channelsForTop5 = shuffledChannels.slice(0, 4)

          for (const channel of channelsForTop5) {
            const channelVideos = videosByChannel[channel]
            if (!channelVideos || channelVideos.length === 0) continue
            
            // Pick a random video from this channel
            const randomIndex = Math.floor(Math.random() * channelVideos.length)
            const selectedVideo = channelVideos[randomIndex]
            if (!selectedVideo) continue

            // Make sure not same channel as previous (swap order if needed)
            const lastChannel =
              randomized.length > 0 ? randomized[randomized.length - 1]?.channelTitle : sortedMoreVideos[0]?.channelTitle // Use newest video's channel as the reference

            if (selectedVideo.channelTitle === lastChannel && randomized.length > 0) {
              // Insert at a different position to avoid same channel twice in a row
              // Find a suitable insertion point that's not the current channel
              let insertIndex = randomized.length - 1
              while (insertIndex > 0 && randomized[insertIndex - 1]?.channelTitle === selectedVideo.channelTitle) {
                insertIndex--
              }
              randomized.splice(insertIndex, 0, selectedVideo)
            } else {
              randomized.push(selectedVideo)
            }
            usedVideoIds.add(selectedVideo.id)
          }

          // Build remaining pool (all videos not used in top 5)
          const remainingPool = sortedMoreVideos.filter((v) => v && !usedVideoIds.has(v.id))

          // Shuffle remaining pool
          const shuffledRemaining = [...remainingPool].sort(() => Math.random() - 0.5)

          // Fill remaining slots avoiding same channel twice in a row
          for (const video of shuffledRemaining) {
            if (randomized.length >= 12) break

            const lastChannel = randomized[randomized.length - 1]?.channelTitle || sortedMoreVideos[0]?.channelTitle

            if (video.channelTitle !== lastChannel) {
              randomized.push(video)
            }
          }

          // If we still need more videos (due to channel conflicts), add remaining
          const stillRemaining = shuffledRemaining.filter((v) => !randomized.includes(v))
          for (const video of stillRemaining) {
            if (randomized.length >= 12) break
            randomized.push(video)
          }

          const newestVideo = sortedMoreVideos[0]
          if (newestVideo) {
            usedVideoIds.add(newestVideo.id) // ✅ mark used
            const deduped = randomized.filter((v) => v.id !== newestVideo.id) // ✅ extra safety
            setRandomizedMoreVideos([newestVideo, ...deduped])
          } else {
            setRandomizedMoreVideos(randomized)
          }
          
        }
      } catch (error) {
        console.error("Failed to load YouTube data:", error)
        setApiError(error instanceof Error ? error.message : "Failed to load YouTube videos.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  React.useEffect(() => {
  const scrollTo = searchParams.get("scrollTo")
  if (scrollTo !== "movies") return

  requestAnimationFrame(() => {
    document.getElementById("movies")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  })

  // remove the param so refresh doesn't’t keep scrolling
  router.replace("/", { scroll: false })
}, [searchParams, router])


  React.useEffect(() => {
  if (typeof window === "undefined") return
  if (window.location.hash !== "#movies") return

  const scroll = () => {
    const el = document.getElementById("movies")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  scroll()
  const t = setTimeout(scroll, 200)
  return () => clearTimeout(t)
}, [isLoading])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isSearchExpanded && !target.closest(".search-container")) {
        setIsSearchExpanded(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSearchExpanded])

  React.useEffect(() => {
    if (!featuredVideo?.publishedAt) return

    const updateTimer = () => {
      const uploadDate = new Date(featuredVideo.publishedAt)
      const now = new Date()
      const diffMs = now.getTime() - uploadDate.getTime()

      const seconds = Math.floor(diffMs / 1000) % 60
      const minutes = Math.floor(diffMs / (1000 * 60)) % 60
      const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      setTimeUnits({ days, hours, minutes, seconds })
      setTimeSinceUpload(`${days} DAYS ${hours} HOURS ${minutes} MINUTES ${seconds} SECONDS`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [featuredVideo?.publishedAt])

  React.useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        console.log("[v0] Home - Tab became visible, reloading More videos (no re-shuffle)")
        const moreVideosFromStorage = await getMoreVideos()
        console.log("[v0] Home - Reloaded More videos from Blob:", moreVideosFromStorage.length)

        const convertedMoreVideos: YouTubeVideo[] = moreVideosFromStorage.map((video) => ({
          id: video.id,
          title: video.title,
          channelTitle: video.channelName,
          thumbnail: video.thumbnail,
          description: video.description,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          duration: video.duration,
          videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
          starRating: 4.5,
          commentCount: video.commentCount || 0,
        }))

        const sortedMoreVideos = convertedMoreVideos.sort((a, b) => {
          const dateA = new Date(a.publishedAt).getTime()
          const dateB = new Date(b.publishedAt).getTime()
          return dateB - dateA
        })
        // Only update the base moreVideos for search, don't re-shuffle randomizedMoreVideos
        setMoreVideos(sortedMoreVideos.length > 0 ? sortedMoreVideos : null)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header
        className={`fixed top-0 z-50 w-full ${isMobileMenuOpen ? "" : "transition-all duration-300"} ${
          isScrolled || isMobileMenuOpen ? "bg-black/90 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="relative flex items-center justify-between px-3 py-3 md:py-4 md:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center space-x-3 md:space-x-4 lg:space-x-6">
            <Link href="/" onClick={handleHomeClick} className="flex items-center flex-shrink-0">
              <div className="relative h-8 w-20 sm:h-9 sm:w-24 lg:h-10 lg:w-28">
                <Image src="/images/doza-logo.png" alt="DOZA" fill className="object-contain" priority />
              </div>
            </Link>
            <nav className="hidden lg:flex space-x-2 xl:space-x-4 items-center text-xs xl:text-sm">
             
<button
  type="button"
  className="hover:text-gray-300 transition-colors flex items-center whitespace-nowrap"
  onClick={() => {
    const el = document.getElementById("movies")
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }}
>
  Videos
</button>

              <Link href="/merch" className="hover:text-gray-300 transition-colors flex items-center whitespace-nowrap">
                Merch
              </Link>
              <Link
                href="/twitch-stats"
                className="hover:text-gray-300 transition-colors flex items-center whitespace-nowrap"
              >
                Case & Stats
              </Link>

            </nav>
          </div>

          {featuredVideo && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 group hidden sm:block">
              <div className="flex items-center gap-0.5 sm:gap-1 text-white font-mono text-xs sm:text-sm lg:text-base tracking-wider bg-black/50 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-lg border border-white/30">
                <span className="font-bold">{String(timeUnits.days).padStart(2, "0")}</span>
                <span className="text-white/70">:</span>
                <span className="font-bold">{String(timeUnits.hours).padStart(2, "0")}</span>
                <span className="text-white/70">:</span>
                <span className="font-bold">{String(timeUnits.minutes).padStart(2, "0")}</span>
                <span className="text-white/70">:</span>
                <span className="font-bold">{String(timeUnits.seconds).padStart(2, "0")}</span>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black/60 text-white text-xs rounded-md border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                Days since the last upload
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white/20" />
              </div>
            </div>
          )}

<div className="flex items-center gap-2 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

<div className="hidden md:flex items-center space-x-0.5 xl:space-x-1">
<TwitchLiveIndicator channelName="dozaproduction" />

<Button
  size="icon"
  variant="ghost"
  className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
  onClick={() => window.open("https://www.twitch.tv/dozaproduction", "_blank")}
  aria-label="Twitch"
>
  <FaTwitch className={iconClass} />
</Button>

<Button
size="icon"
variant="ghost"
className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
onClick={() => window.open("https://www.patreon.com/dozaproduction", "_blank")}
aria-label="Patreon"
>
<FaPatreon className={iconClass} />
</Button>

<Button
  size="icon"
  variant="ghost"
  className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
  onClick={() => window.open("https://x.com/havesomedoza", "_blank")}
  aria-label="X"
>
  <FaXTwitter className={iconClass} />
</Button>

<Button
  size="icon"
  variant="ghost"
  className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
  onClick={() => window.open("https://www.instagram.com/doza.production", "_blank")}
  aria-label="Instagram"
>
  <FaInstagram className={iconClass} />
</Button>

<Button
  size="icon"
  variant="ghost"
  className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
  onClick={() => window.open("https://www.tiktok.com/@dozaproduction", "_blank")}
  aria-label="TikTok"
>
  <FaTiktok className={iconClass} />
</Button>
</div>


            <div className="search-container hidden md:flex items-center">
              <div
                className={`relative bg-black/50 rounded-full transition-all duration-300 border border-gray-600 flex items-center overflow-hidden h-8 xl:h-10 ${
                  isSearchExpanded ? "w-36 xl:w-48" : "w-8 xl:w-10"
                }`}
              >
                <button
                  type="button"
                  className="h-8 w-8 xl:h-10 xl:w-10 grid place-items-center hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                  onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                  aria-label="Search"
                >
                  <Search className="w-3.5 h-3.5 xl:w-5 xl:h-5" />
                </button>

                <input
                  ref={desktopSearchInputRef}
                  placeholder="Search"
                  className={`bg-transparent text-white placeholder-gray-400 transition-all duration-300 text-sm outline-none ${
                    isSearchExpanded ? "w-full opacity-100 px-2 pr-3" : "w-0 opacity-0 px-0"
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

      </header>

      {isSearchExpanded && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-md pt-24 animate-in fade-in duration-200">
          <div className="px-4 py-4">
            <div className="search-container flex items-center bg-zinc-900/80 rounded-full mb-6 animate-in slide-in-from-top-4 duration-300 border border-gray-600">
              <Search className="w-5 h-5 ml-4 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputCallbackRef}
                placeholder="Search"
                className="flex-1 bg-transparent text-white placeholder-gray-400 h-12 px-3 pr-4"
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  appearance: "none",
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery.trim() && (
              <div>
                {searchResults.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <p className="text-base">No videos found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
                    {searchResults.map(({ video, category }, index) => (
                      <div
                        key={`${video.id}-${index}`}
                        className="cursor-pointer"
                        onClick={() => {
                          openVideoModal(video.title, video.videoUrl)
                          closeSearch()
                        }}
                      >
                        <div className="relative aspect-video mb-2 rounded overflow-hidden">
                          <Image
                            src={video.thumbnail || "/placeholder.svg"}
                            alt={video.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-sm font-medium line-clamp-2 mb-1">{video.title}</p>
                        <p className="text-xs text-gray-400">{category}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Overlay - Desktop */}
      {searchQuery.trim() && ( // Changed condition to show overlay when there's a query, regardless of isSearchExpanded
        <div
          className="hidden md:block fixed inset-0 z-40 bg-black/80 backdrop-blur-md pt-24 overflow-y-auto"
          onClick={closeSearch}
        >
          <div className="container mx-auto px-4 md:px-16 py-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl md:text-2xl font-semibold mb-6">Search Results for "{searchQuery}"</h2>

            {searchResults.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">No videos found matching your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4">
                {searchResults.map(({ video, category }, index) => (
                  <div
                    key={`${video.id}-${index}`}
                    className="group cursor-pointer transition-all duration-300 hover:scale-110 hover:z-10 relative"
                    onClick={() => {
                      openVideoModal(video.title, video.videoUrl)
                      closeSearch()
                    }}
                  >
                    <div className="relative aspect-video mb-2 rounded overflow-hidden">
                      <Image
                        src={video.thumbnail || "/placeholder.svg"}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white fill-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 md:mb-6 text-gray-300">
                        {video.title}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400">{category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="relative min-h-0 lg:h-screen flex items-start lg:items-center">
        {featuredVideo && (
          <>
            {/* Desktop featured layout - only on lg and up */}
            <div className="hidden lg:block absolute inset-0">
              <Image
                src={featuredVideo.thumbnail || "/placeholder.svg"}
                alt={featuredVideo.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>

            {/* Mobile featured card layout - Netflix style */}
            <div className="lg:hidden w-full pt-28 pb-12 px-2">
              <div className="relative w-full max-w-full mx-auto md:max-w-4xl rounded-xl overflow-hidden shadow-2xl">
                {/* Card image */}
                <div className="relative aspect-[4/5] md:aspect-video w-full">
                  <Image
                    src={featuredVideo.thumbnail || "/placeholder.svg"}
                    alt={featuredVideo.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  {/* DOZA logo badge in top left */}
                  <div className="absolute top-3 left-3">
                    <div className="relative h-6 w-14"></div>
                  </div>
                </div>

                {/* Content below image - inside card */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-5 md:p-6 md:pb-8">
                  {/* Added md:text-2xl to text size on tablet */}
                  <h1 className="text-xl md:text-2xl font-semibold mb-2.5 leading-tight text-white drop-shadow-lg">
  {featuredVideo.title}
</h1>
                  {/* Added md:text-base to text size on tablet */}
                  <p className="text-sm md:text-base text-gray-300 mb-4">
                    Really cool and awesome video, you should watch it
                  </p>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-white text-black hover:bg-gray-200 py-2.5 md:py-3 text-sm md:text-base font-semibold flex items-center justify-center gap-2"
                      onClick={() => {
                        openVideoModal(featuredVideo.title, featuredVideo.videoUrl)
                      }}
                    >
                      <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" />
                      Play
                    </Button>
                    <Button
                      className="flex-1 bg-zinc-700/80 hover:bg-zinc-600 text-white py-2.5 md:py-3 text-sm md:text-base font-semibold flex items-center justify-center gap-2"
                      onClick={() =>
                        window.open("https://www.youtube.com/@dozaproduction?sub_confirmation=1", "_blank")
                      }
                    >
                      <Plus className="w-5 h-5 md:w-6 md:h-6" />
                      Subscribe
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop content overlay - only on lg and up */}
            <div className="relative z-10 w-full px-4 py-8 sm:p-8 md:p-12 lg:p-16 hidden lg:block">
              <div className="max-w-2xl mt-16 lg:mt-24">
                {isLoading ? (
                  <div className="text-xl md:text-2xl">Loading...</div>
                ) : apiError ? (
                  <>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 text-red-500">
                      API Error
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl mb-4 md:mb-6 text-gray-200">{apiError}</p>
                  </>
                ) : (
                  <>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold mb-3 md:mb-4 leading-tight">
  {featuredVideo.title}
</h1>

                    <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 md:mb-6 text-gray-300">
                      Really cool and awesome video, you should watch it, even if you already watched it, yes
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        size="lg"
                        className="bg-white text-black hover:bg-gray-200 px-8 sm:px-10 md:px-12 py-5 sm:py-6 text-base sm:text-lg md:text-xl min-w-[160px] sm:min-w-[180px] flex items-center justify-center hover:scale-105 sm:hover:scale-110 transition-transform duration-200 w-full sm:w-auto"
                        onClick={() => {
                          openVideoModal(featuredVideo.title, featuredVideo.videoUrl)
                        }}
                      >
                        <Play className="w-6 h-6 sm:w-7 sm:h-7 mr-2 sm:mr-3 fill-black" />
                        Play
                      </Button>
                      <Button
                        size="lg"
                        className="bg-red-600 hover:bg-red-700 text-white px-8 sm:px-10 md:px-12 py-5 sm:py-6 text-base sm:text-lg md:text-xl min-w-[160px] sm:min-w-[180px] flex items-center justify-center hover:scale-105 sm:hover:scale-110 transition-transform duration-200 w-full sm:w-auto"
                        onClick={() =>
                          window.open("https://www.youtube.com/@dozaproduction?sub_confirmation=1", "_blank")
                        }
                      >
                        <Plus className="w-6 h-6 sm:w-7 sm:h-7 mr-2 sm:mr-3" />
                        Subscribe
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {!featuredVideo && !isLoading && (
          <div className="relative z-10 w-full p-4 md:p-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">No Videos Available</h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 text-gray-200">
              Unable to load videos from the channel.
            </p>
          </div>
        )}
      </section>

<main className="relative -mt-16 md:-mt-8 lg:-mt-32 pb-16 sm:pb-24 md:pb-32">
  {/* Movies category */}
  <section
  id="movies"
  ref={videosSectionRef}
  className="mb-6 sm:mb-8 px-3 sm:px-4 md:px-8 lg:px-16 pt-6 md:pt-0"
  style={{ scrollMarginTop: 96 }}
>

    <h2 className="font-sans font-bold text-xl sm:text-2xl pl-1 sm:pl-2">
      Movies
    </h2>
    {youtubeData && longVideos && longVideos.length > 0 ? (
      <VideoCarousel videos={longVideos} onPlay={openVideoModal} hoveredId={hoveredId} setHoveredId={setHoveredId} />
    ) : (
      <div className="text-gray-400 text-base sm:text-lg px-2 py-6 sm:py-8">Coming Soon</div>
    )}
  </section>
    

  {/* TV Shows category */}
  <section className="mb-6 sm:mb-8 px-3 sm:px-4 md:px-8 lg:px-16">
    <h2 className="font-sans font-bold text-xl sm:text-2xl pl-1 sm:pl-2">
      TV Shows
    </h2>
    {youtubeData && tvVideos && tvVideos.length > 0 ? (
      <VideoCarousel videos={tvVideos} onPlay={openVideoModal} hoveredId={hoveredId} setHoveredId={setHoveredId} />
    ) : (
      <div className="text-gray-400 text-base sm:text-lg px-2 py-6 sm:py-8">Coming Soon</div>
    )}
  </section>
    
  {/* More category */}
  <section className="mb-6 sm:mb-8 px-3 sm:px-4 md:px-8 lg:px-16">
<h2 className="font-sans font-bold text-xl sm:text-2xl mb-3 sm:mb-4 pl-1 sm:pl-2">
  <a href="/more" className="inline-block">
    More
  </a>
</h2>

    {youtubeData && randomizedMoreVideos && randomizedMoreVideos.length > 0 ? (
      <VideoCarousel
        videos={randomizedMoreVideos}
        onPlay={openVideoModal}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        showViewAll={moreVideos && moreVideos.length > 16}
        showNewBadge={true}
      />
    ) : (
      <div className="text-gray-400 text-base sm:text-lg py-6 sm:py-8 pl-1 sm:pl-2">
        Coming Soon
      </div>
    )}
  </section>
</main>

      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent
          className="bg-black border-zinc-800 text-white max-w-7xl p-0"
          onPointerMove={(e) => {
            const closeButton = e.currentTarget.querySelector("[data-close-button]") as HTMLElement
            if (closeButton) {
              closeButton.style.opacity = "1"
              closeButton.style.pointerEvents = "auto"

              // Clear existing timeout
              const timeoutId = closeButton.getAttribute("data-timeout-id")
              if (timeoutId) {
                clearTimeout(Number(timeoutId))
              }

              // Set new timeout
              const newTimeoutId = setTimeout(() => {
                closeButton.style.opacity = "0"
                closeButton.style.pointerEvents = "none"
              }, 3000)

              closeButton.setAttribute("data-timeout-id", String(newTimeoutId))
            }
          }}
        >
          {playingVideo && (
            <div className="w-full aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${playingVideo.videoId}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={closeVideoModal}
        title={videoModal.title}
        videoUrl={videoModal.videoUrl}
        contentId={0}
        onProgressUpdate={() => {}}
      />

      <footer className="w-full py-6 sm:py-8 mt-8 sm:mt-16 flex flex-col items-center justify-center">
        <Link href="/game" className="flex flex-col items-center cursor-pointer group">
          <Image
            src="/images/doza-signature.png"
            alt="Doza Signature"
            width={100}
            height={40}
            className="mb-3 transition-opacity group-hover:opacity-80"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <p className="text-white/40 text-xs sm:text-sm group-hover:text-white/60 transition-colors">
            © 2021-2026 Doza, Inc.
          </p>
        </Link>
      </footer>
    </div>
  )
}

function VideoCarousel({
  videos,
  onPlay,
  hoveredId,
  setHoveredId,
  showViewAll = false,
  showNewBadge = false,
}: {
  videos: YouTubeVideo[]
  onPlay: (title: string, videoUrl: string) => void
  hoveredId: number | null
  setHoveredId: React.Dispatch<React.SetStateAction<number | null>>
  showViewAll?: boolean
  showNewBadge?: boolean
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = React.useState(false)
  const [showRightArrow, setShowRightArrow] = React.useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  React.useEffect(() => {
    checkScroll()
    const timer = setTimeout(() => checkScroll(), 100)
    return () => clearTimeout(timer)
  }, [videos])

  React.useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="relative group overflow-hidden">
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 sm:left-2 top-[45%] -translate-y-1/2 z-[60] w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 sm:right-2 top-[45%] -translate-y-1/2 z-[60] w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

<div
  ref={scrollRef}
  onScroll={checkScroll}
  className="flex gap-2 sm:gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth py-2 sm:py-4"
  style={{
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }}
>

        {videos.map((video, index) => (
          <div
            key={video.id}
            className="flex-none w-[45%] min-w-[160px] sm:w-[calc(33.333%-8px)] sm:min-w-[180px] md:w-[calc(25%-8px)] md:min-w-[200px] lg:w-[calc(20%-8px)] lg:min-w-[220px] relative hover:z-10"
          >
            <YouTubeVideoCard
              video={video}
              onPlay={onPlay}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              showNew={showNewBadge && index === 0}
              showChannel={showNewBadge}
              isFirst={index === 0}
              isLast={index === videos.length - 1}
            />
            {showViewAll && index === videos.length - 1 && (
              <a
                href="/more"
                className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/80 to-black flex flex-col items-center justify-center text-center z-50 rounded-lg group/viewall transition-all"
              >
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 text-white transition-transform group-hover/viewall:scale-125"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-base sm:text-lg font-medium text-white">View All</span>
                <span className="text-xs sm:text-sm text-gray-300 mt-1 hidden sm:block">See more videos</span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function YouTubeVideoCard({
  video,
  onPlay,
  hoveredId,
  setHoveredId,
  showNew = false,
  showChannel = false,
  isFirst = false,
  isLast = false,
}: {
  video: YouTubeVideo
  onPlay: (title: string, videoUrl: string) => void
  hoveredId: number | null
  setHoveredId: React.Dispatch<React.SetStateAction<number | null>>
  showNew?: boolean
  showChannel?: boolean
  isFirst?: boolean
  isLast?: boolean
}) {
  const [isHovered, setIsHovered] = React.useState(false)

  const transformOrigin = isFirst ? "left center" : isLast ? "right center" : "center center"

  return (
    <div
      className="relative cursor-pointer transition-all duration-300 hover:scale-105 sm:hover:scale-110 hover:z-10"
      style={{ transformOrigin }}
      onMouseEnter={() => {
        setIsHovered(true)
        setHoveredId(video.id)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        setHoveredId(null)
      }}
      onClick={() => onPlay(video.title, video.videoUrl)}
    >
      <div className="bg-zinc-900 rounded-lg overflow-hidden h-full flex flex-col shadow-lg hover:shadow-2xl">
        <div
          className="relative flex-shrink-0"
          style={{
            aspectRatio: "16/9",
          }}
        >
          <Image
            src={video.thumbnail || "/placeholder.svg"}
            alt={video.title}
            fill
            className="object-cover"
            unoptimized
          />
          {showNew && (
            <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-md z-10">
              NEW
            </div>
          )}
          {hoveredId === video.id && <div className="absolute inset-0 bg-black/40 transition-opacity duration-200" />}
          {hoveredId === video.id && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="cursor-pointer hover:scale-125 transition-transform duration-200"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlay(video.title, video.videoUrl)
                }}
              >
                <Play className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 fill-white drop-shadow-2xl" />
              </div>
            </div>
          )}
          <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-black/80 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs">
            {video.duration}
          </div>
        </div>
        <div className="p-2 sm:p-3 flex-1 flex flex-col">
          <div className="mb-1">
<h3
  className="
    font-sans
    font-medium
    text-sm
    leading-[1.75rem]
    tracking-normal
    text-white
    truncate
  "
  title={video.title}
>
  {video.title}
</h3>

          </div>
          {showChannel && (
            <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{video.channelTitle || "Unknown Channel"}</div>
          )}
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-400 mt-auto">
            <div className="flex items-center gap-0.5">{renderStars(video.starRating)}</div>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap hidden sm:inline">
              {video.viewCount} views
            </span>

            <span className="hidden 2xl:inline">•</span>
            <span className="whitespace-nowrap hidden 2xl:inline">
              Reviews ({formatCommentCount(video.commentCount)})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
