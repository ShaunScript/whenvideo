"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, ArrowLeft, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

// ✅ Replacement for awards-data extractVideoId (YouTube-only)
function extractYouTubeVideoId(input: string): string | null {
  const s = (input || "").trim()
  if (!s) return null

  // If user pasted only an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s

  try {
    const url = new URL(s)

    // youtu.be/<id>
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }

    // youtube.com/watch?v=<id>
    const v = url.searchParams.get("v")
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v

    const parts = url.pathname.split("/").filter(Boolean)

    // youtube.com/shorts/<id>
    const shortsIndex = parts.indexOf("shorts")
    if (shortsIndex !== -1 && parts[shortsIndex + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortsIndex + 1])) {
      return parts[shortsIndex + 1]
    }

    // youtube.com/embed/<id>
    const embedIndex = parts.indexOf("embed")
    if (embedIndex !== -1 && parts[embedIndex + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIndex + 1])) {
      return parts[embedIndex + 1]
    }

    return null
  } catch {
    return null
  }
}

export default function AdminPanel() {
  const router = useRouter()

  // ===== Main Admin state (kept) =====
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
  const [newHighScoreName, setNewHighScoreName] = useState("")
  const [featuredOverride, setFeaturedOverride] = useState<{ thumbnailUrl: string } | null>(null)
  const [featuredThumbUrl, setFeaturedThumbUrl] = useState("")
  const [isSavingFeatured, setIsSavingFeatured] = useState(false)
  const [featuredThumbFile, setFeaturedThumbFile] = useState<File | null>(null)
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false)

  // ===== Auth gate (kept) =====
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(true)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const ADMIN_PASSWORD = "AdminD26"

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

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

  // ===== Loaders (kept) =====
  const loadMoreVideos = async () => {
    try {
      console.log("[v0] Admin - Loading more videos")
      const videos = await getMoreVideos()
      console.log("[v0] Admin - Videos from Blob:", videos.length)
      setMoreVideos(videos)
    } catch (error) {
      console.error("Failed to load more videos:", error)
      showMessage("error", "Failed to load More videos")
    } finally {
      setIsLoading(false)
    }
  }

  // Your retry helper (kept)
  const loadMoreVideosWithRetry = async (expectedMinCount = 0, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[v0] Admin - Loading videos (attempt ${i + 1}/${retries})`)
        const videos = await getMoreVideos()
        console.log("[v0] Admin - Videos loaded:", videos.length)

        if (videos.length >= expectedMinCount || i === retries - 1) {
          setMoreVideos(videos)
          return videos.length
        }

        const delay = Math.pow(2, i) * 1000
        console.log(
          `[v0] Admin - Got ${videos.length} videos, expected at least ${expectedMinCount}. Retrying in ${delay}ms...`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (error) {
        console.error("Failed to load more videos:", error)
        if (i === retries - 1) throw error
      }
    }
    setIsLoading(false)
    return 0
  }

  const loadGameHighScore = async () => {
    try {
      const res = await fetch("/api/game/highscore", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch high score")
      const json = await res.json()
      setGameHighScore(json?.data ?? null)
      setNewHighScoreName(json?.data?.name ?? "")
    } catch (error) {
      console.error("Failed to load game high score:", error)
      showMessage("error", "Could not load game high score")
    }
  }

  const handleResetGameHighScore = async () => {
    if (!confirm("Delete the stored high score and name?")) return
    try {
      const res = await fetch("/api/game/highscore", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setGameHighScore(null)
      setNewHighScoreName("")
      showMessage("success", "High score deleted")
    } catch (error) {
      console.error("Failed to delete high score:", error)
      showMessage("error", "Failed to delete high score")
    }
  }

  const handleRenameHighScore = async () => {
    const name = newHighScoreName.trim()
    if (!name) {
      showMessage("error", "Enter a name first")
      return
    }
    try {
      const res = await fetch("/api/game/highscore", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Rename failed")
      await loadGameHighScore()
      showMessage("success", "High score name updated")
    } catch (error) {
      console.error("Failed to rename high score:", error)
      showMessage("error", "Failed to rename high score")
    }
  }

  const loadFeaturedOverride = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-thumbmail", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured override")
      const json = await res.json()
      const data = json?.data ?? null
      setFeaturedOverride(data)
      setFeaturedThumbUrl(data?.thumbnailUrl ?? "")
    } catch (error) {
      console.error("Failed to load featured thumbnail override:", error)
    }
  }

  const handleSaveFeaturedOverride = async () => {
    if (!featuredThumbUrl.trim()) {
      showMessage("error", "Upload or paste a thumbnail URL first")
      return
    }
    setIsSavingFeatured(true)
    try {
      const res = await fetch("/api/admin/more/featured-thumbmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl: featuredThumbUrl.trim() }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedOverride()
      showMessage("success", "Featured thumbnail updated")
    } catch (error) {
      console.error("Failed to save featured override:", error)
      showMessage("error", "Failed to save featured thumbnail")
    } finally {
      setIsSavingFeatured(false)
    }
  }

  const handleClearFeaturedOverride = async () => {
    if (!confirm("Remove the custom featured thumbnail?")) return
    setIsSavingFeatured(true)
    try {
      const res = await fetch("/api/admin/more/featured-thumbmail", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setFeaturedOverride(null)
      setFeaturedThumbUrl("")
      showMessage("success", "Featured thumbnail cleared")
    } catch (error) {
      console.error("Failed to clear featured override:", error)
      showMessage("error", "Failed to clear featured thumbnail")
    } finally {
      setIsSavingFeatured(false)
    }
  }

  const handleUploadFeaturedThumb = async () => {
    if (!featuredThumbFile) {
      showMessage("error", "Choose an image file first")
      return
    }
    setIsUploadingFeatured(true)
    try {
      const fd = new FormData()
      fd.append("file", featuredThumbFile)

      const res = await fetch("/api/admin/more/featured-thumbmail/upload", {
        method: "POST",
        body: fd,
      })

      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || "Upload failed")

      const url = json.url as string
      setFeaturedThumbUrl(url)
      showMessage("success", "Image uploaded, URL filled below")
    } catch (error: any) {
      console.error("Failed to upload featured thumbnail:", error)
      showMessage("error", error?.message || "Upload failed")
    } finally {
      setIsUploadingFeatured(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadMoreVideos()
      loadGameHighScore()
      loadFeaturedOverride()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // ===== Add videos by URL (kept, but uses extractYouTubeVideoId) =====
  const handleAddVideoByUrl = async () => {
    if (!videoUrl.trim()) return

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
        const videoId = extractYouTubeVideoId(url)
        if (videoId) videoIds.push(videoId)
      }

      if (videoIds.length === 0) {
        showMessage("error", "No valid YouTube URLs found")
        return
      }

      // 1) Fetch metadata
      const metaRes = await fetch(`/api/admin/more?videoIds=${encodeURIComponent(JSON.stringify(videoIds))}`)
      const metaBody = await tryJson(metaRes)

      if (!metaRes.ok) {
        const msg = metaBody?.error || metaBody?.message || `Metadata fetch failed (${metaRes.status})`
        showMessage("error", msg)
        return
      }

      const videosArr = metaBody?.videos
      if (!Array.isArray(videosArr) || videosArr.length === 0) {
        showMessage("error", "Failed to fetch video details (no videos returned).")
        return
      }

      const batchVideos = videosArr.map((video: any) => ({
        id: video.id,
        title: video.title,
        channelName: video.channelTitle || video.channelName || "Unknown Channel",
        thumbnail: video.thumbnail,
        description: video.description,
        publishedAt: video.publishedAt,
        viewCount: video.viewCount,
        commentCount: video.commentCount || 0,
        duration: video.duration,
      }))

      // 2) Persist
      const addRes = await fetch("/api/admin/more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: batchVideos }),
      })

      const addBody = await tryJson(addRes)
      console.log("[admin] /api/admin/more POST status:", addRes.status, "body:", addBody)

      if (!addRes.ok) {
        const msg = addBody?.error || addBody?.message || `Add failed (${addRes.status})`
        showMessage("error", msg)
        return
      }

      const explicitlyFailed = addBody?.success === false || !!addBody?.error
      if (explicitlyFailed) {
        showMessage("error", addBody?.message || addBody?.error || "Failed to add video")
        return
      }

      showMessage("success", addBody?.message || "Video(s) added to More.")

      // Refresh list (don’t turn refresh failure into “add failed”)
      try {
        await loadMoreVideos()
      } catch (e) {
        console.warn("[admin] refresh after add failed:", e)
      }

      setVideoUrl("")
    } catch (error) {
      console.error("[admin] handleAddVideoByUrl error:", error)
      showMessage("error", error instanceof Error ? error.message : "Failed to add video")
    } finally {
      setIsAdding(false)
    }
  }

  /* ===========================
     MANUAL UPLOAD → MORE (kept)
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
        showMessage("error", uploadData?.error || `Upload failed (${uploadRes.status})`)
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
        showMessage("error", addData?.error || addData?.message || "Failed to save uploaded video")
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
    } catch {
      showMessage("error", "Failed to remove video")
    }
  }

  const handleClearAllVideos = async () => {
    if (!confirm("Are you sure you want to delete ALL videos from More? This action cannot be undone.")) return

    try {
      const response = await fetch("/api/admin/more", { method: "PATCH" })
      if (!response.ok) throw new Error("Failed to clear videos")

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

  // ===== Auth UI (kept) =====
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

  // ===== Main Admin UI (Awards removed) =====
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Current High Score</p>
                    <p className="text-2xl font-bold">{gameHighScore.score}</p>
                    <p className="text-gray-400 mt-1">by {gameHighScore.name}</p>
                  </div>
                  <Button onClick={handleResetGameHighScore} variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <Input
                    value={newHighScoreName}
                    onChange={(e) => setNewHighScoreName(e.target.value)}
                    placeholder="Rename high score holder"
                    className="bg-black border-zinc-700 text-white"
                  />
                  <Button onClick={handleRenameHighScore} className="bg-red-600 hover:bg-red-700">
                    Save Name
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center">No high score set yet</p>
            )}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Featured Thumbnail Override</h2>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-3">
            <div className="space-y-2">
              <Label className="text-white">Thumbnail URL (auto-filled after upload or paste manually)</Label>
              <Input
                value={featuredThumbUrl}
                onChange={(e) => setFeaturedThumbUrl(e.target.value)}
                className="bg-black border-zinc-700 text-white"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div className="space-y-2">
                <Label className="text-white">Upload Image (jpg, png, webp)</Label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="bg-black border-zinc-700 text-white"
                  onChange={(e) => setFeaturedThumbFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleUploadFeaturedThumb}
                  disabled={isUploadingFeatured}
                  className="bg-zinc-700 hover:bg-zinc-600 flex-1"
                >
                  {isUploadingFeatured ? "Uploading..." : "Upload & Fill URL"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveFeaturedOverride} disabled={isSavingFeatured} className="bg-red-600 hover:bg-red-700">
                {isSavingFeatured ? "Saving..." : "Save Override"}
              </Button>
              {featuredOverride && (
                <Button onClick={handleClearFeaturedOverride} variant="secondary" disabled={isSavingFeatured}>
                  Remove Override
                </Button>
              )}
            </div>

            {featuredOverride ? (
              <div className="text-sm text-gray-300 space-y-2">
                <p>Current override:</p>
                <p className="text-gray-200 break-all">Thumbnail: {featuredOverride.thumbnailUrl}</p>
                <div className="relative w-48 h-28 border border-zinc-800 rounded overflow-hidden">
                  <Image src={featuredOverride.thumbnailUrl || "/placeholder.svg"} alt="Featured thumb" fill className="object-cover" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No override set. The featured video uses its default thumbnail.</p>
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
            <Button onClick={handleAddVideoByUrl} disabled={isAdding} className="bg-red-600 hover:bg-red-700 w-full">
              <Plus className="w-5 h-5 mr-2" />
              {isAdding ? "Adding..." : "Add Videos"}
            </Button>
          </div>
          <p className="text-sm text-gray-400">Paste YouTube URLs (one per line). Supports full URLs or video IDs.</p>
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
                <div className="flex justify-end p-4">
                  <Button variant="destructive" size="sm" onClick={handleClearAllVideos} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear All Videos
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
