"use client"

import * as React from "react"
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { EpisodesList, type Season, type Episode, sampleTVShowData } from "./episodes-list"
import { AutoPlayOverlay } from "./auto-play-overlay"

const DEFAULT_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

function isYouTubeUrl(url?: string): boolean {
  if (!url) return false
  return url.includes("youtube.com") || url.includes("youtu.be")
}

function getYouTubeEmbedUrl(url: string): string {
  const videoIdMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/) ||
    url.match(/youtube\.com\/watch\?.*v=([^&\s]+)/)

  if (videoIdMatch && videoIdMatch[1]) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1&rel=0`
  }
  return url
}

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  videoUrl?: string
  showType?: "movie" | "tv"
  seasons?: Season[]
  contentId: number
  episodeId?: number
  initialProgressSeconds?: number
  onProgressUpdate: (contentId: number, progress: number, duration: number, episodeId?: number) => void
}

export function VideoModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  showType,
  seasons,
  contentId,
  episodeId,
  initialProgressSeconds = 0,
  onProgressUpdate,
}: VideoModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolume] = React.useState(1)
  const [isMuted, setIsMuted] = React.useState(false)
  const [showControls, setShowControls] = React.useState(true)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [youtubeStarted, setYoutubeStarted] = React.useState(false)

  const [showEpisodes, setShowEpisodes] = React.useState(false)
  const [currentSeason, setCurrentSeason] = React.useState(1)
  const [currentEpisode, setCurrentEpisode] = React.useState<Episode | null>(null)

  const [autoPlayCountdown, setAutoPlayCountdown] = React.useState(0)
  const [showAutoPlay, setShowAutoPlay] = React.useState(false)
  const [nextEpisodeInfo, setNextEpisodeInfo] = React.useState<{
    episode: Episode
    seasonId: number
    seasonTitle: string
  } | null>(null)

  const controlsTimeoutRef = React.useRef<NodeJS.Timeout>()
  const autoPlayTimerRef = React.useRef<NodeJS.Timeout>()
  const countdownTimerRef = React.useRef<NodeJS.Timeout>()
  const progressSaveIntervalRef = React.useRef<NodeJS.Timeout>()

  const seasonsData = seasons || sampleTVShowData[title as keyof typeof sampleTVShowData] || []

  const isYouTube = isYouTubeUrl(videoUrl) || isYouTubeUrl(currentEpisode?.videoUrl)

  const findNextEpisode = React.useCallback(() => {
    if (!currentEpisode || !seasonsData.length) return null

    const currentSeasonData = seasonsData.find((s) => s.id === currentSeason)
    if (!currentSeasonData) return null

    const currentEpisodeIndex = currentSeasonData.episodes.findIndex((ep) => ep.id === currentEpisode.id)

    if (currentEpisodeIndex < currentSeasonData.episodes.length - 1) {
      return {
        episode: currentSeasonData.episodes[currentEpisodeIndex + 1],
        seasonId: currentSeason,
        seasonTitle: currentSeasonData.title,
      }
    }

    const currentSeasonIndex = seasonsData.findIndex((s) => s.id === currentSeason)
    if (currentSeasonIndex < seasonsData.length - 1) {
      const nextSeason = seasonsData[currentSeasonIndex + 1]
      if (nextSeason.episodes.length > 0) {
        return {
          episode: nextSeason.episodes[0],
          seasonId: nextSeason.id,
          seasonTitle: nextSeason.title,
        }
      }
    }

    return null
  }, [currentEpisode, currentSeason, seasonsData])

  React.useEffect(() => {
    if (isOpen) {
      setYoutubeStarted(false)
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) {
      if (progressSaveIntervalRef.current) clearInterval(progressSaveIntervalRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      return
    }

    let videoSrcToLoad = DEFAULT_VIDEO_URL
    let episodeToSet: Episode | null = null
    let seasonToSet = 1
    const initialTime = initialProgressSeconds

    if (showType === "tv" && seasonsData.length > 0) {
      if (episodeId !== undefined) {
        for (const season of seasonsData) {
          const foundEpisode = season.episodes.find((ep) => ep.id === episodeId)
          if (foundEpisode) {
            episodeToSet = foundEpisode
            seasonToSet = season.id
            break
          }
        }
      }
      if (!episodeToSet) {
        const firstSeason = seasonsData[0]
        episodeToSet = firstSeason.episodes[0]
        seasonToSet = firstSeason.id
      }

      videoSrcToLoad = episodeToSet?.videoUrl || DEFAULT_VIDEO_URL
      setCurrentEpisode(episodeToSet)
      setCurrentSeason(seasonToSet)
    } else if (showType === "movie" && videoUrl) {
      videoSrcToLoad = videoUrl
    } else {
      videoSrcToLoad = videoUrl || DEFAULT_VIDEO_URL
    }

    if (videoRef.current && !isYouTube) {
      const video = videoRef.current
      console.log("[v0] Setting video source:", videoSrcToLoad)
      video.src = videoSrcToLoad
      video.load()

      const handleCanPlay = () => {
        console.log("[v0] Video can play, attempting autoplay")
        video.currentTime = initialTime
        video
          .play()
          .then(() => {
            console.log("[v0] Autoplay successful")
            setIsPlaying(true)
          })
          .catch((err) => {
            console.error("[v0] Autoplay failed:", err)
            setIsPlaying(false)
          })
      }

      video.addEventListener("canplay", handleCanPlay, { once: true })

      return () => {
        video.removeEventListener("canplay", handleCanPlay)
      }
    }

    if (progressSaveIntervalRef.current) clearInterval(progressSaveIntervalRef.current)
    progressSaveIntervalRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        onProgressUpdate(
          contentId,
          videoRef.current.currentTime,
          videoRef.current.duration,
          showType === "tv" ? currentEpisode?.id : undefined,
        )
      }
    }, 5000)
  }, [
    isOpen,
    showType,
    seasonsData,
    videoUrl,
    contentId,
    episodeId,
    initialProgressSeconds,
    onProgressUpdate,
    isYouTube,
    currentEpisode,
  ])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => setCurrentTime(video.currentTime)
    const updateDuration = () => setDuration(video.duration)

    const handleVideoEnded = () => {
      setIsPlaying(false)
      onProgressUpdate(contentId, video.duration, video.duration, showType === "tv" ? currentEpisode?.id : undefined)

      if (showType === "tv" && seasonsData.length > 0) {
        const nextEp = findNextEpisode()
        if (nextEp) {
          setNextEpisodeInfo(nextEp)
          setShowAutoPlay(true)
          setAutoPlayCountdown(10)

          let countdown = 10
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = setInterval(() => {
            countdown -= 1
            setAutoPlayCountdown(countdown)

            if (countdown <= 0) {
              playNextEpisode()
            }
          }, 1000)
        }
      }
    }

    video.addEventListener("timeupdate", updateTime)
    video.addEventListener("loadedmetadata", updateDuration)
    video.addEventListener("ended", handleVideoEnded)

    return () => {
      video.removeEventListener("timeupdate", updateTime)
      video.removeEventListener("loadedmetadata", updateDuration)
      video.removeEventListener("ended", handleVideoEnded)
    }
  }, [contentId, currentEpisode, showType, seasonsData, onProgressUpdate, findNextEpisode])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0]
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleEpisodePlay = React.useCallback((episode: Episode, seasonId: number) => {
    setCurrentEpisode(episode)
    setCurrentSeason(seasonId)
    setShowEpisodes(false)
    if (videoRef.current) {
      console.log("[v0] Switching to episode:", episode.title)
      videoRef.current.src = episode.videoUrl || DEFAULT_VIDEO_URL
      videoRef.current.load()

      const handleCanPlay = () => {
        if (videoRef.current) {
          const initialTimeInSeconds =
            episode.progress !== undefined && episode.progress > 0
              ? (episode.progress / 100) * videoRef.current.duration
              : 0
          videoRef.current.currentTime = initialTimeInSeconds
          videoRef.current
            .play()
            .then(() => {
              console.log("[v0] Episode autoplay successful")
              setIsPlaying(true)
            })
            .catch((err) => {
              console.error("[v0] Episode autoplay failed:", err)
              setIsPlaying(false)
            })
        }
      }

      videoRef.current.addEventListener("canplay", handleCanPlay, { once: true })
    }
  }, [])

  const toggleEpisodesView = () => {
    setShowEpisodes(!showEpisodes)
  }

  const playNextEpisode = React.useCallback(() => {
    if (nextEpisodeInfo) {
      handleEpisodePlay(nextEpisodeInfo.episode, nextEpisodeInfo.seasonId)
      setShowAutoPlay(false)
      setNextEpisodeInfo(null)
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [nextEpisodeInfo, handleEpisodePlay])

  const cancelAutoPlay = React.useCallback(() => {
    setShowAutoPlay(false)
    setNextEpisodeInfo(null)
    setAutoPlayCountdown(0)
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (isOpen) {
      console.log("[v0] Modal opened, isYouTube:", isYouTube)
    }
  }, [isOpen, isYouTube])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black" onMouseMove={handleMouseMove}>
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className={`absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-10 text-white hover:bg-white/20 rounded-full border-2 border-white/50 hover:border-white transition-opacity duration-300 h-10 w-10 sm:h-12 sm:w-12 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>

      {/* Video */}
      {isYouTube && videoUrl ? (
        <iframe
          src={getYouTubeEmbedUrl(videoUrl)}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={currentEpisode?.videoUrl || videoUrl || DEFAULT_VIDEO_URL}
          poster="/placeholder.svg?height=1080&width=1920"
          onClick={togglePlay}
        />
      )}

      {!isYouTube && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 md:p-6 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-3 sm:mb-4">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs sm:text-sm text-gray-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 md:gap-4">
            <Button
              onClick={togglePlay}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
            >
              {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
            </Button>

            <Button
              onClick={() => skipTime(-10)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <Button
              onClick={() => skipTime(10)}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
              <div className="w-16 sm:w-20 hidden sm:block">
                <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={handleVolumeChange} />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 ml-auto">
              <h3 className="text-white font-semibold text-xs sm:text-sm md:text-base truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                {title}
              </h3>
              {showType === "tv" && seasonsData.length > 0 && (
                <Button
                  onClick={toggleEpisodesView}
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                >
                  Episodes
                </Button>
              )}
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9"
              >
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Episodes List Overlay */}
      {showEpisodes && showType === "tv" && seasonsData.length > 0 && (
        <div className="absolute inset-0 bg-black/95 overflow-y-auto">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800">
              <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
              <Button onClick={toggleEpisodesView} variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </div>
            <EpisodesList
              seasons={seasonsData}
              currentSeason={currentSeason}
              onSeasonChange={setCurrentSeason}
              onEpisodePlay={handleEpisodePlay}
              showTitle={title}
              currentEpisode={currentEpisode}
            />
          </div>
        </div>
      )}
      {/* Auto-Play Overlay */}
      <AutoPlayOverlay
        isVisible={showAutoPlay}
        nextEpisode={
          nextEpisodeInfo
            ? {
                title: nextEpisodeInfo.episode.title,
                thumbnail: nextEpisodeInfo.episode.thumbnail,
                seasonTitle: nextEpisodeInfo.seasonTitle,
              }
            : null
        }
        countdown={autoPlayCountdown}
        onPlayNext={playNextEpisode}
        onCancel={cancelAutoPlay}
      />
    </div>
  )
}

export default VideoModal
