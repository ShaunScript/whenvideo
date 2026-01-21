"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Trash2,
  ArrowLeft,
  Lock,
  Eye,
  Crown,
  Medal,
  Award,
  Trophy,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  File,
  Pencil,
  Loader2,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  getCategories,
  saveCategories,
  extractVideoId,
  extractVideoInfo,
  getThumbnailUrl,
  CATEGORIES_CONFIG,
  calculateResults,
  getAllVotesData,
  getVoterDetailsForCategory,
  removeVote,
  type Category,
  type Nominee,
} from "@/lib/awards-data"
import { getMoreVideos, removeMoreVideo } from "@/lib/more-storage"

interface Video {
  id: string
  title: string
  thumbnail: string
  channelName: string
  description: string
  publishedAt: string
  viewCount: number
  duration: number
  addedAt: string
  commentCount: number
}

export default function AdminPanel() {
  const router = useRouter()
  const [moreVideos, setMoreVideos] = useState<Video[]>([])
  const [videoUrl, setVideoUrl] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [moreUploadFile, setMoreUploadFile] = useState<File | null>(null)
  const [moreUploadTitle, setMoreUploadTitle] = useState("")
  const [moreUploadChannel, setMoreUploadChannel] = useState("")
  const [isUploadingMore, setIsUploadingMore] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gameHighScore, setGameHighScore] = useState<{ score: number; name: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(true)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [awardVideoUrl, setAwardVideoUrl] = useState("")
  const [videoTitle, setVideoTitle] = useState("")
  const [channelName, setChannelName] = useState("")
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null)
  const [videoSource, setVideoSource] = useState<"youtube" | "instagram" | "tiktok" | "gdrive" | "medal" | "other">(
    "youtube",
  )
  const [customThumbnail, setCustomThumbnail] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFileUrl, setUploadedFileUrl] = useState("")

  const [results, setResults] = useState<Record<string, Record<string, number>>>({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [expandedNominees, setExpandedNominees] = useState<Set<string>>(new Set())
  const [showAllVoters, setShowAllVoters] = useState(false)
  const [allVoters, setAllVoters] = useState<string[]>([])
  const [editingNominee, setEditingNominee] = useState<Nominee | null>(null)
  const [isFetchingYouTubeInfo, setIsFetchingYouTubeInfo] = useState(false)

  const ADMIN_PASSWORD = "AdminD26"

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setShowPasswordDialog(false)
      setPasswordError("")
    } else {
      setPasswordError("Incorrect password. Please try again.")
      setPassword("")
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadMoreVideos()
      loadGameHighScore()
      loadCategories()
      refreshResultsData()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        console.log("[v0] Page became visible - reloading videos")
        loadMoreVideos()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [isAuthenticated])

  useEffect(() => {
    const info = extractVideoInfo(awardVideoUrl)
    setVideoSource(info.videoSource)
    if (info.videoSource === "youtube" && info.videoId) {
      setPreviewVideoId(info.videoId)
      // Auto-fetch YouTube video info only if not editing and fields are empty
      if (!editingNominee && !videoTitle && !channelName) {
        fetchYouTubeVideoInfo(info.videoId)
      }
    } else {
      setPreviewVideoId(null)
    }
  }, [awardVideoUrl])

  const fetchYouTubeVideoInfo = async (videoId: string) => {
    if (!videoId) return
    
    setIsFetchingYouTubeInfo(true)
    try {
      const response = await fetch(`/api/admin/more?videoIds=${encodeURIComponent(JSON.stringify([videoId]))}`)
      if (response.ok) {
        const data = await response.json()
        if (data.videos && data.videos.length > 0) {
          const video = data.videos[0]
          setVideoTitle(video.title || "")
          setChannelName(video.channelTitle || "")
        }
      }
    } catch (error) {
      console.error("Failed to fetch YouTube video info:", error)
    } finally {
      setIsFetchingYouTubeInfo(false)
    }
  }

  const loadMoreVideos = async () => {
    try {
      console.log("[v0] Admin - Loading more videos")
      const videos = await getMoreVideos()
      console.log("[v0] Admin - Videos from Blob:", videos.length)
      setMoreVideos(videos)
    } catch (error) {
      console.error("Failed to load more videos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreVideosWithRetry = async (expectedMinCount = 0, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[v0] Admin - Loading videos (attempt ${i + 1}/${retries})`)
        const videos = await getMoreVideos()
        console.log("[v0] Admin - Videos loaded:", videos.length)

        // If we got at least the expected count, we're good
        if (videos.length >= expectedMinCount || i === retries - 1) {
          setMoreVideos(videos)
          return videos.length
        }

        // Wait before retry with exponential backoff
        const delay = Math.pow(2, i) * 1000 // 1s, 2s, 4s
        console.log(
          `[v0] Admin - Got ${videos.length} videos, expected at least ${expectedMinCount}. Retrying in ${delay}ms...`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (error) {
        console.error("Failed to load more videos:", error)
        if (i === retries - 1) {
          throw error
        }
      }
    }
    setIsLoading(false)
    return 0
  }

const handleAddVideoByUrl = async () => {
  if (!videoUrl.trim()) return

  // helper: parse JSON if possible, otherwise return null
  const tryJson = async (res: Response) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  setIsAdding(true)
  try {
    const urls = videoUrl.split("\n").map((u) => u.trim()).filter(Boolean)
    const videoIds: string[] = []

    for (const url of urls) {
      const videoId = extractVideoId(url)
      if (videoId) videoIds.push(videoId)
    }

    if (videoIds.length === 0) {
      showMessage("error", "No valid YouTube URLs found")
      return
    }

    // 1) Fetch metadata from server
    const metaRes = await fetch(
      `/api/admin/more?videoIds=${encodeURIComponent(JSON.stringify(videoIds))}`,
    )

    if (!metaRes.ok) {
      const body = await tryJson(metaRes)
      const fallbackText = await metaRes.text().catch(() => "")
      const msg =
        body?.error ||
        body?.message ||
        `Metadata fetch failed (${metaRes.status}). ${fallbackText ? fallbackText.slice(0, 200) : ""}`

      showMessage("error", msg)
      return
    }

    const meta = await metaRes.json()

    if (!meta.videos || meta.videos.length === 0) {
      showMessage("error", "Failed to fetch video details (no videos returned).")
      return
    }

    const batchVideos = meta.videos.map((video: any) => ({
      id: video.id,
      title: video.title,
      // your API returns channelTitle; your cache normalizer supports either
      channelName: video.channelTitle || video.channelName || "Unknown Channel",
      thumbnail: video.thumbnail,
      description: video.description,
      publishedAt: video.publishedAt,
      viewCount: video.viewCount,
      commentCount: video.commentCount || 0,
      duration: video.duration,
    }))

    // 2) Persist to More
    const addRes = await fetch("/api/admin/more", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: batchVideos }),
    })

    if (!addRes.ok) {
      const body = await tryJson(addRes)
      const fallbackText = await addRes.text().catch(() => "")
      const msg =
        body?.error ||
        body?.message ||
        `Add failed (${addRes.status}). ${fallbackText ? fallbackText.slice(0, 200) : ""}`

      showMessage("error", msg)
      return
    }

    const result = await addRes.json()

    if (result.success) {
      showMessage("success", result.message || "Videos added.")
      await loadMoreVideos() // no “blob propagation” needed
      setVideoUrl("")
    } else {
      showMessage("error", result.message || "Failed to add videos")
    }
  } catch (error) {
    console.error("[admin] handleAddVideoByUrl error:", error)
    showMessage("error", error instanceof Error ? error.message : "Failed to add videos")
  } finally {
    setIsAdding(false)
  }
}

/* ===========================
   MANUAL UPLOAD → MORE
   =========================== */

const handleUploadToMore = async () => {
  if (!moreUploadFile) return

  if (!moreUploadTitle.trim() || !moreUploadChannel.trim()) {
    showMessage("error", "Please enter a title and channel name.")
    return
  }

  setIsUploadingMore(true)
  try {
    // 1) Upload file
    const fd = new FormData()
    fd.append("file", moreUploadFile)

    const uploadRes = await fetch("/api/admin/more/upload", {
      method: "POST",
      body: fd,
    })

    const uploadText = await uploadRes.text()
    const uploadData = (() => {
      try {
        return JSON.parse(uploadText)
      } catch {
        return null
      }
    })()

    if (!uploadRes.ok || !uploadData?.success) {
      showMessage(
        "error",
        uploadData?.error || `Upload failed (${uploadRes.status})`,
      )
      return
    }

    // 2) Add uploaded video to More
    const now = new Date().toISOString()
    const uploadId = `upload-${Date.now()}`

    const addRes = await fetch("/api/admin/more", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video: {
          id: uploadId,
          title: moreUploadTitle.trim(),
          channelName: moreUploadChannel.trim(),
          thumbnail: "/placeholder.svg",
          description: "",
          publishedAt: now,
          viewCount: "0",
          commentCount: 0,
          duration: "",
          addedAt: now,
          source: "upload",
          videoUrl: uploadData.url,
        },
      }),
    })

    const addText = await addRes.text()
    const addData = (() => {
      try {
        return JSON.parse(addText)
      } catch {
        return null
      }
    })()

    if (!addRes.ok) {
      showMessage(
        "error",
        addData?.error || addData?.message || "Failed to save uploaded video",
      )
      return
    }

    showMessage("success", "Uploaded and added to More!")
    setMoreUploadFile(null)
    setMoreUploadTitle("")
    setMoreUploadChannel("")
    await loadMoreVideos()
  } catch (err: any) {
    console.error("[handleUploadToMore] error:", err)
    showMessage("error", err?.message || "Upload failed")
  } finally {
    setIsUploadingMore(false)
  }
}


  const handleRemoveVideo = async (videoId: string) => {
    try {
      const result = await removeMoreVideo(videoId)

      if (result.success) {
        showMessage("success", result.message)
        await loadMoreVideos()
      } else {
        showMessage("error", result.message)
      }
    } catch (error) {
      showMessage("error", "Failed to remove video")
    }
  }

  const handleClearAllVideos = async () => {
    if (!confirm("Are you sure you want to delete ALL videos from More? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch("/api/admin/more", {
        method: "PATCH",
      })

      if (!response.ok) {
        throw new Error("Failed to clear videos")
      }

      const result = await response.json()

      if (result.success) {
        showMessage("success", "All videos cleared from storage")
        await loadMoreVideos()
      } else {
        showMessage("error", "Failed to clear videos")
      }
    } catch (error) {
      console.error("Error clearing videos:", error)
      showMessage("error", "Failed to clear videos")
    }
  }

  const loadGameHighScore = () => {
    try {
      const saved = localStorage.getItem("flappyDozaHighScore")
      if (saved) {
        setGameHighScore(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Failed to load game high score:", error)
    }
  }

  const handleResetGameHighScore = () => {
    if (confirm("Are you sure you want to reset the game high score?")) {
      localStorage.removeItem("flappyDozaHighScore")
      setGameHighScore(null)
      showMessage("success", "Game high score reset successfully")
    }
  }

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAddNominee = () => {
    if (!selectedCategoryId || !awardVideoUrl || !videoTitle || !channelName) {
      alert("Please fill in all fields")
      return
    }

    const videoInfo = extractVideoInfo(awardVideoUrl)
    if (!videoInfo.videoId && !awardVideoUrl.startsWith("http")) {
      // Allow direct URLs for uploaded videos
      alert("Invalid video URL. Please enter a valid URL or use the upload feature.")
      return
    }

    const newNominee: Nominee = {
      id: `${selectedCategoryId}-${Date.now()}`,
      title: videoTitle,
      videoId: videoInfo.videoId,
      channelName,
      videoSource: videoInfo.videoSource === "youtube" && awardVideoUrl.startsWith("http") ? "youtube" : "other", // Handle uploaded videos as 'other'
      videoUrl: awardVideoUrl, // Use the provided URL directly
      customThumbnail: customThumbnail || undefined,
    }

    const updatedCategories = categories.map((cat) => {
      if (cat.id === selectedCategoryId) {
        return {
          ...cat,
          nominees: [...cat.nominees, newNominee],
        }
      }
      return cat
    })

    setCategories(updatedCategories)
    saveCategories(updatedCategories)

    setAwardVideoUrl("")
    setVideoTitle("")
    setChannelName("")
    setPreviewVideoId(null)
    setCustomThumbnail("")
    setUploadedFileUrl("") // Clear uploaded file URL

    setSaveMessage("Nominee added successfully!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const handleRemoveNominee = (categoryId: string, nomineeId: string) => {
    if (!confirm("Are you sure you want to remove this nominee?")) return

    const updatedCategories = categories.map((cat) => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          nominees: cat.nominees.filter((n) => n.id !== nomineeId),
        }
      }
      return cat
    })

    setCategories(updatedCategories)
    saveCategories(updatedCategories)

    setSaveMessage("Nominee removed successfully!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const handleEditNominee = (nominee: Nominee, categoryId: string) => {
    setEditingNominee(nominee)
    setSelectedCategoryId(categoryId)
    setVideoTitle(nominee.title)
    setChannelName(nominee.channelName)
    setAwardVideoUrl(nominee.videoUrl || (nominee.videoId ? `https://youtube.com/watch?v=${nominee.videoId}` : ""))
    setCustomThumbnail(nominee.customThumbnail || "")
    setUploadedFileUrl("")
  }

  const handleUpdateNominee = () => {
    if (!editingNominee || !videoTitle || !channelName) {
      alert("Please fill in all fields")
      return
    }

    const videoInfo = extractVideoInfo(awardVideoUrl)

    const updatedCategories = categories.map((cat) => ({
      ...cat,
      nominees: cat.nominees.map((n) => {
        if (n.id === editingNominee.id) {
          return {
            ...n,
            title: videoTitle,
            channelName,
            videoId: videoInfo.videoId,
            videoSource: videoInfo.videoSource,
            videoUrl: awardVideoUrl,
            customThumbnail: customThumbnail || undefined,
          }
        }
        return n
      }),
    }))

    setCategories(updatedCategories)
    saveCategories(updatedCategories)

    // Clear form
    handleCancelEdit()

    setSaveMessage("Nominee updated successfully!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const handleCancelEdit = () => {
    setEditingNominee(null)
    setAwardVideoUrl("")
    setVideoTitle("")
    setChannelName("")
    setPreviewVideoId(null)
    setCustomThumbnail("")
    setUploadedFileUrl("")
  }

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId)

  const refreshResultsData = async () => {
    const loadedCategories = await getCategories()
    setCategories(loadedCategories)
    const calculatedResults = calculateResults()
    setResults(calculatedResults)
    const allVotes = getAllVotesData()
    setTotalVotes(Object.keys(allVotes).length)

    // The username is stored in the user object, we need to get it from localStorage
    const voterNames: string[] = []
    Object.keys(allVotes).forEach((userId) => {
      // Try to get stored user info from awards-user-{discordId} pattern
      const parts = userId.split("-")
      if (parts.length >= 3 && parts[0] === "discord") {
        // The Discord ID is the second part
        const discordId = parts[1]
        // Check if we have a stored display name for this user
        const storedUsers = localStorage.getItem("awards-users-display-names")
        if (storedUsers) {
          const displayNames = JSON.parse(storedUsers)
          if (displayNames[discordId]) {
            voterNames.push(displayNames[discordId])
            return
          }
        }
        // Fallback: try to find display name in the parts (older format: discord-{displayName}-{timestamp})
        if (parts.length >= 2) {
          const displayName = parts.slice(1, -1).join("-")
          if (displayName && !displayName.match(/^\d+$/)) {
            voterNames.push(displayName)
            return
          }
        }
        // Last fallback: just use the ID
        voterNames.push(`User ${discordId.slice(0, 6)}...`)
      } else if (parts.length >= 2) {
        const username = parts.slice(1, -1).join("-")
        voterNames.push(username)
      } else {
        voterNames.push(userId)
      }
    })
    setAllVoters(voterNames)
  }

  const handleRemoveVote = (categoryId: string, nomineeId: string, voterName: string) => {
    if (confirm(`Remove vote from ${voterName}?`)) {
      removeVote(categoryId, nomineeId, voterName)
      refreshResultsData()
    }
  }

  const handleRemoveAllVotes = (voterName: string) => {
    if (confirm(`Remove ALL votes from ${voterName}? This cannot be undone.`)) {
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

      if (typeof window !== "undefined") {
        localStorage.setItem("awards-votes", JSON.stringify(allVotes))
      }
      refreshResultsData()
    }
  }

  const getWinnerForCategory = (categoryId: string): { nominee: Nominee | null; votes: number } => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category || !results[categoryId]) return { nominee: null, votes: 0 }

    let maxVotes = 0
    let winnerId: string | null = null

    Object.entries(results[categoryId]).forEach(([nomineeId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes
        winnerId = nomineeId
      }
    })

    const winner = winnerId ? category.nominees.find((n) => n.id === winnerId) : null
    return { nominee: winner || null, votes: maxVotes }
  }

  const getRankingsForCategory = (
    categoryId: string,
  ): Array<{ nominee: Nominee; votes: number; percentage: number }> => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category || !results[categoryId]) return []

    const rankings = category.nominees
      .map((nominee) => {
        const votes = results[categoryId][nominee.id] || 0
        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0
        return { nominee, votes, percentage }
      })
      .sort((a, b) => b.votes - a.votes)

    return rankings
  }

  const toggleVoterList = (nomineeId: string) => {
    setExpandedNominees((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nomineeId)) {
        newSet.delete(nomineeId)
      } else {
        newSet.add(nomineeId)
      }
      return newSet
    })
  }

  const categoriesWithNominees = categories.filter((cat) => cat.nominees.length > 0)

  const loadCategories = async () => {
    try {
      const loadedCategories = await getCategories()
      setCategories(loadedCategories)
      if (loadedCategories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(loadedCategories[0].id)
      }
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!validExtensions.includes(fileExtension)) {
      alert("Invalid file type. Supported formats: mp4, webm, mov, avi, mkv, m4v")
      return
    }

    // Check file size - limit to 50MB to avoid serverless timeout
    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Maximum size is 50MB. For larger files, please upload to YouTube or another hosting service and paste the URL.")
      return
    }

    setIsUploadingFile(true)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/awards/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setUploadedFileUrl(data.url)
        setAwardVideoUrl(data.url)
        setSaveMessage(`File uploaded: ${file.name}`)
        setTimeout(() => setSaveMessage(""), 3000)
      } else {
        alert(data.error || "Failed to upload file")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUploadingFile(false)
      setUploadProgress(0)
    }
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate image type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Maximum size is 5MB.")
      return
    }

    setIsUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/awards/upload/thumbnail", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setCustomThumbnail(data.url)
        setSaveMessage(`Thumbnail uploaded: ${file.name}`)
        setTimeout(() => setSaveMessage(""), 3000)
      } else {
        alert(data.error || "Failed to upload thumbnail")
      }
    } catch (error) {
      console.error("Thumbnail upload error:", error)
      alert("Failed to upload thumbnail. Please try again.")
    } finally {
      setIsUploadingFile(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Dialog open={showPasswordDialog} onOpenChange={() => router.push("/")}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-red-600/20 rounded-full">
                  <Lock className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">Admin Access Required</DialogTitle>
                  <DialogDescription className="text-gray-400">Enter the admin password to continue</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="bg-black border-zinc-700 text-white placeholder:text-gray-500"
                  autoFocus
                />
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              </div>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                Access Admin Panel
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="hover:bg-zinc-800">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/awards")}
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Awards Page
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-zinc-900">
            <TabsTrigger value="main" className="data-[state=active]:bg-red-600">
              Main Admin
            </TabsTrigger>
            <TabsTrigger value="awards-admin" className="data-[state=active]:bg-red-600">
              Awards Admin
            </TabsTrigger>
            <TabsTrigger value="awards-results" className="data-[state=active]:bg-red-600">
              Awards Results
            </TabsTrigger>
          </TabsList>

          {/* Main Admin Tab */}
          <TabsContent value="main" className="space-y-8">
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === "success" ? "bg-green-900/20 text-green-400" : "bg-red-900/20 text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4">Game High Score</h2>
              <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                {gameHighScore ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Current High Score</p>
                      <p className="text-2xl font-bold">{gameHighScore.score}</p>
                      <p className="text-gray-400 mt-1">by {gameHighScore.name}</p>
                    </div>
                    <Button onClick={handleResetGameHighScore} variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Reset High Score
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center">No high score set yet</p>
                )}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4">Add Video to More</h2>
              <div className="flex flex-col gap-2 mb-4">
                <textarea
                  placeholder="Paste YouTube video URLs (one per line)..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  rows={5}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <Button
                  onClick={handleAddVideoByUrl}
                  disabled={isAdding}
                  className="bg-red-600 hover:bg-red-700 w-full"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {isAdding ? "Adding..." : "Add Videos"}
                </Button>
              </div>
              <p className="text-sm text-gray-400">
                Paste YouTube URLs (one per line). Supports full URLs or video IDs.
              </p>
            </section>

            <section className="mb-12">
  <h2 className="text-xl font-semibold mb-4">Manual Upload to More</h2>

  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label className="text-white">Title</Label>
        <Input
          value={moreUploadTitle}
          onChange={(e) => setMoreUploadTitle(e.target.value)}
          className="bg-black border-zinc-700 text-white"
          placeholder="Video title"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-white">Channel Name</Label>
        <Input
          value={moreUploadChannel}
          onChange={(e) => setMoreUploadChannel(e.target.value)}
          className="bg-black border-zinc-700 text-white"
          placeholder="Channel / uploader name"
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label className="text-white">Video file</Label>
      <Input
        type="file"
        accept=".mp4,.webm,.mov,.m4v"
        className="bg-black border-zinc-700 text-white"
        onChange={(e) => setMoreUploadFile(e.target.files?.[0] ?? null)}
      />
    </div>

    <Button
      onClick={handleUploadToMore}
      disabled={!moreUploadFile || isUploadingMore}
      className="w-full bg-red-600 hover:bg-red-700"
    >
      {isUploadingMore ? "Uploading..." : "Upload & Add to More"}
    </Button>

    <p className="text-xs text-gray-400">
      Saves the file into <code>public/more-uploads</code> and adds it to More.
    </p>
  </div>
</section>


            <section>
              <h2 className="text-xl font-semibold mb-4">Current More ({moreVideos.length})</h2>
              {isLoading ? (
                <p className="text-gray-400">Loading...</p>
              ) : moreVideos.length === 0 ? (
                <div className="bg-zinc-900 rounded-lg p-8 text-center text-gray-400 border border-zinc-800">
                  <p>No videos in More yet. Paste YouTube URLs above to add them.</p>
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
                  {moreVideos.map((video) => (
                    <div key={video.id} className="flex items-center gap-4 p-4 hover:bg-zinc-800/50 transition-colors">
                      <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden">
                        <Image
                          src={video.thumbnail || "/placeholder.svg"}
                          alt={video.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-2 text-sm">{video.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{video.id}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveVideo(video.id)}
                        size="sm"
                        variant="destructive"
                        className="flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {moreVideos.length > 0 && (
                    <div className="flex justify-end">
                      <Button variant="destructive" size="sm" onClick={handleClearAllVideos} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Clear All Videos
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </TabsContent>

          {/* Awards Admin Tab */}
          <TabsContent value="awards-admin" className="space-y-8">
            {saveMessage && (
              <div className="mb-6 p-4 bg-green-600/20 border border-green-600 rounded-lg text-green-400">
                {saveMessage}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">
                    {editingNominee ? "Edit Nominee" : "Add Nominee"}
                  </CardTitle>
                  {editingNominee && (
                    <p className="text-sm text-yellow-400">Editing: {editingNominee.title}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-white text-base font-semibold">
                      Category
                    </Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger id="category" className="bg-black border-zinc-700 text-white">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {CATEGORIES_CONFIG.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-zinc-800">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="awardVideoUrl" className="text-white text-base font-semibold">
                      Video Source
                    </Label>
                    <p className="text-xs text-gray-400 mb-2">
                      Enter a URL or upload a file. Supported: YouTube, Instagram, TikTok, Google Drive, Medal.tv, or
                      upload video.
                    </p>
                    <Input
                      id="awardVideoUrl"
                      placeholder="Paste video URL or leave blank if uploading"
                      value={awardVideoUrl}
                      onChange={(e) => setAwardVideoUrl(e.target.value)}
                      className="bg-black border-zinc-700 text-white placeholder:text-gray-500"
                    />
                    {awardVideoUrl && (
                      <p className="text-xs text-gray-400 mt-1">
                        Detected source: <span className="text-red-400 capitalize">{videoSource}</span>
                      </p>
                    )}
                    {previewVideoId && videoSource === "youtube" && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        <div className="aspect-video relative">
                          <Image
                            src={`https://img.youtube.com/vi/${previewVideoId}/maxresdefault.jpg`}
                            alt="Video preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {customThumbnail && (
                      <div className="mt-3 rounded-lg overflow-hidden">
                        <p className="text-xs text-gray-400 mb-2">Custom Thumbnail Preview:</p>
                        <div className="aspect-video relative">
                          <Image
                            src={customThumbnail || "/placeholder.svg"}
                            alt="Custom thumbnail preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="customThumbnail"
                      className="text-white text-base font-semibold flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Custom Thumbnail URL (Optional)
                    </Label>
                    <p className="text-xs text-gray-400 mb-2">
                      For non-YouTube videos, or to override the default thumbnail. Use an image hosting service like Imgur.
                    </p>
                    <Input
                      id="customThumbnail"
                      placeholder="https://i.imgur.com/example.jpg"
                      value={customThumbnail}
                      onChange={(e) => setCustomThumbnail(e.target.value)}
                      className="bg-black border-zinc-700 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoTitle" className="text-white text-base font-semibold flex items-center gap-2">
                      Nominee Title
                      {isFetchingYouTubeInfo && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
                    </Label>
                    <Input
                      id="videoTitle"
                      placeholder={isFetchingYouTubeInfo ? "Fetching from YouTube..." : "Enter video title"}
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="bg-black border-zinc-700 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="channelName" className="text-white text-base font-semibold">
                      Channel Name
                    </Label>
                    <Input
                      id="channelName"
                      placeholder="Enter channel name"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      className="bg-black border-zinc-700 text-white placeholder:text-gray-500"
                    />
                  </div>

                  {editingNominee ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUpdateNominee}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                        disabled={isUploadingFile}
                      >
                        <Pencil className="w-5 h-5 mr-2" />
                        Update Nominee
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="bg-transparent text-white border-zinc-700 hover:bg-zinc-800"
                        size="lg"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAddNominee}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      size="lg"
                      disabled={isUploadingFile}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Nominee
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">
                    {selectedCategory ? `${selectedCategory.name} Nominees` : "Select a Category"}
                  </CardTitle>
                  {selectedCategory && <p className="text-sm text-gray-400">{selectedCategory.description}</p>}
                </CardHeader>
                <CardContent>
                  {selectedCategory && selectedCategory.nominees.length > 0 ? (
                    <div className="space-y-4">
                      {selectedCategory.nominees.map((nominee) => (
                        <div
                          key={nominee.id}
                          className="flex gap-4 p-4 bg-black rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                          <div className="relative w-32 h-18 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={nominee.customThumbnail || getThumbnailUrl(nominee.videoId, nominee.videoSource)}
                              alt={nominee.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-2 mb-1 text-white">{nominee.title}</h4>
                            <p className="text-xs text-gray-400">{nominee.channelName}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditNominee(nominee, selectedCategory.id)}
                              className="hover:bg-blue-600/20 hover:text-blue-500"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveNominee(selectedCategory.id, nominee.id)}
                              className="hover:bg-red-600/20 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No nominees added yet</p>
                      <p className="text-sm text-gray-600 mt-1">Use the form to add nominees to this category</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-12">
              <h2 className="text-3xl font-bold mb-6 text-white">All Categories Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="bg-zinc-900 border-zinc-800 hover:border-red-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg text-white">{category.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-red-500">{category.nominees.length}</span>
                        <span className="text-sm text-gray-400">
                          {category.nominees.length === 1 ? "nominee" : "nominees"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Awards Results Tab */}
          <TabsContent value="awards-results" className="space-y-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Trophy className="w-12 h-12 text-yellow-500" />
              </div>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                AWARDS RESULTS
              </h2>
              <p className="text-gray-300 mb-4">
                The community has spoken! Here are the winners based on {totalVotes} total{" "}
                {totalVotes === 1 ? "vote" : "votes"}.
              </p>
              <Button
                onClick={() => setShowAllVoters(!showAllVoters)}
                variant="outline"
                className="border-yellow-600/50 hover:bg-yellow-600/10 bg-transparent text-yellow-400"
              >
                {showAllVoters ? "Hide" : "Show"} All Voters ({allVoters.length})
              </Button>
              {showAllVoters && (
                <div className="mt-6 max-w-4xl mx-auto bg-zinc-900/80 border border-yellow-600/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-yellow-400 mb-4">All Voters</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {allVoters.map((voterName, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-2 px-3 py-2 bg-zinc-800 text-sm text-gray-300 rounded-full hover:bg-zinc-700 transition-colors border border-zinc-700"
                      >
                        <span>{voterName}</span>
                        <button
                          onClick={() => handleRemoveAllVotes(voterName)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                          title="Remove all votes from this user"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-16">
              {categoriesWithNominees.length === 0 ? (
                <div className="text-center py-20">
                  <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-400 mb-2">No Results Yet</h3>
                  <p className="text-gray-500">Voting hasn't started yet. Check back later!</p>
                </div>
              ) : (
                categoriesWithNominees.map((category) => {
                  const { nominee: winner, votes: winnerVotes } = getWinnerForCategory(category.id)
                  const rankings = getRankingsForCategory(category.id)

                  return (
                    <div key={category.id} className="space-y-6">
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-bold text-white">{category.name}</h3>
                        <p className="text-gray-400 text-sm max-w-2xl mx-auto">{category.description}</p>
                      </div>

                      {winner ? (
                        <div className="space-y-6">
                          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border-yellow-500 border-2 max-w-3xl mx-auto">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-center gap-3 text-2xl text-yellow-400">
                                <Crown className="w-8 h-8" />
                                WINNER
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="relative aspect-video rounded-lg overflow-hidden">
                                <Image
                                  src={winner.customThumbnail || getThumbnailUrl(winner.videoId, winner.videoSource)}
                                  alt={winner.title}
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute top-4 right-4 bg-yellow-500 text-black font-bold px-4 py-2 rounded-full flex items-center gap-2">
                                  <Trophy className="w-5 h-5" />
                                  {winnerVotes} {winnerVotes === 1 ? "vote" : "votes"}
                                </div>
                              </div>
                              <div className="text-center">
                                <h4 className="text-xl font-bold text-white mb-1">{winner.title}</h4>
                                <p className="text-gray-400">{winner.channelName}</p>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="max-w-4xl mx-auto space-y-4">
                            <h4 className="text-xl font-bold text-center text-white mb-4">All Nominees</h4>
                            {rankings.map((ranking, index) => {
                              const isWinner = index === 0
                              const Icon = index === 0 ? Crown : index === 1 ? Medal : Award
                              const voters = getVoterDetailsForCategory(category.id, ranking.nominee.id)
                              const isExpanded = expandedNominees.has(ranking.nominee.id)

                              return (
                                <Card
                                  key={ranking.nominee.id}
                                  className={`bg-zinc-900 border-zinc-800 transition-all hover:border-zinc-700 ${
                                    isWinner ? "border-yellow-500/50" : ""
                                  }`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex gap-4 items-center">
                                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 flex-shrink-0">
                                        <Icon
                                          className={`w-6 h-6 ${
                                            index === 0
                                              ? "text-yellow-500"
                                              : index === 1
                                                ? "text-gray-400"
                                                : index === 2
                                                  ? "text-amber-700"
                                                  : "text-gray-600"
                                          }`}
                                        />
                                      </div>
                                      <div className="relative w-28 h-16 rounded overflow-hidden flex-shrink-0">
                                        <Image
                                          src={
                                            ranking.nominee.customThumbnail ||
                                            getThumbnailUrl(ranking.nominee.videoId, ranking.nominee.videoSource) ||
                                            "/placeholder.svg" ||
                                            "/placeholder.svg"
                                           || "/placeholder.svg"}
                                          alt={ranking.nominee.title}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-2">
                                        <div>
                                          <h5 className="font-semibold text-sm line-clamp-1 text-white">
                                            {ranking.nominee.title}
                                          </h5>
                                          <p className="text-xs text-gray-400">{ranking.nominee.channelName}</p>
                                        </div>
                                        <div className="space-y-1">
                                          <Progress value={ranking.percentage} className="h-2" />
                                          <div className="flex justify-between text-xs text-gray-400">
                                            <span>
                                              {ranking.votes} {ranking.votes === 1 ? "vote" : "votes"}
                                            </span>
                                            <span>{ranking.percentage.toFixed(1)}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {voters.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-zinc-800">
                                        <button
                                          onClick={() => toggleVoterList(ranking.nominee.id)}
                                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                          <span>Voters ({voters.length})</span>
                                        </button>
                                        {isExpanded && (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {voters.map((voterName, idx) => (
                                              <div
                                                key={idx}
                                                className="group flex items-center gap-1 px-2 py-1 bg-zinc-800 text-xs text-gray-300 rounded-full hover:bg-zinc-700 transition-colors"
                                              >
                                                <span>{voterName}</span>
                                                <button
                                                  onClick={() =>
                                                    handleRemoveVote(category.id, ranking.nominee.id, voterName)
                                                  }
                                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500">No votes yet for this category</p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
