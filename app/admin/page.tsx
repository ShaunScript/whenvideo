"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const searchParams = useSearchParams()

  // ===== Main Admin state (kept) =====
  const [moreVideos, setMoreVideos] = useState<Video[]>([])
  const [videoUrl, setVideoUrl] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [featuredOverride, setFeaturedOverride] = useState<{ thumbnailUrl: string } | null>(null)
  const [featuredThumbUrl, setFeaturedThumbUrl] = useState("")
  const [isSavingFeatured, setIsSavingFeatured] = useState(false)
  const [featuredThumbFile, setFeaturedThumbFile] = useState<File | null>(null)
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false)
  const [featuredDescription, setFeaturedDescription] = useState("")
  const [savedFeaturedDescription, setSavedFeaturedDescription] = useState<string | null>(null)
  const [isSavingFeaturedDescription, setIsSavingFeaturedDescription] = useState(false)
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState("")
  const [savedFeaturedVideoId, setSavedFeaturedVideoId] = useState<string | null>(null)
  const [isSavingFeaturedVideo, setIsSavingFeaturedVideo] = useState(false)
  const [featuredTitleFont, setFeaturedTitleFont] = useState("")
  const [featuredTitleSize, setFeaturedTitleSize] = useState("")
  const [featuredTitleFontUrl, setFeaturedTitleFontUrl] = useState<string | null>(null)
  const [featuredTitleOverride, setFeaturedTitleOverride] = useState("")
  const [savedFeaturedTitleOverride, setSavedFeaturedTitleOverride] = useState<string | null>(null)
  const [isSavingFeaturedTitleOverride, setIsSavingFeaturedTitleOverride] = useState(false)
  const [savedFeaturedTitleStyle, setSavedFeaturedTitleStyle] = useState<{
    fontFamily: string
    fontSizePx: number
    fontUrl?: string | null
  } | null>(null)
  const [uploadedFonts, setUploadedFonts] = useState<{ name: string; url: string; fileName: string }[]>([])
  const [selectedFontName, setSelectedFontName] = useState("")
  const [selectedFontUrl, setSelectedFontUrl] = useState<string | null>(null)
  const [fontUploadFile, setFontUploadFile] = useState<File | null>(null)
  const [isUploadingFont, setIsUploadingFont] = useState(false)
  const [isSavingFeaturedTitleStyle, setIsSavingFeaturedTitleStyle] = useState(false)
  type TabKey = "featured" | "more" | "current"
  const [activeTab, setActiveTab] = useState<TabKey>("featured")
  const tabs: { key: TabKey; label: string; panelId: string }[] = [
    { key: "featured", label: "Featured Video Editor", panelId: "tab-panel-featured" },
    { key: "more", label: "More Videos", panelId: "tab-panel-more" },
    { key: "current", label: "Current More Videos", panelId: "tab-panel-current" },
  ]
  const [featuredSubTab, setFeaturedSubTab] = useState<"video" | "style" | "title">("video")
  const featuredTabs: { key: "video" | "style" | "title"; label: string; panelId: string }[] = [
    { key: "video", label: "Video Override", panelId: "featured-panel-video" },
    { key: "style", label: "Featured Title Style", panelId: "featured-panel-style" },
    { key: "title", label: "Title Override", panelId: "featured-panel-title" },
  ]

  useEffect(() => {
    const fromUrl = searchParams.get("tab") as TabKey | null
    if (fromUrl && tabs.some((t) => t.key === fromUrl)) {
      setActiveTab(fromUrl)
      return
    }
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("admin.activeTab") as TabKey | null
    if (saved && tabs.some((t) => t.key === saved)) {
      setActiveTab(saved)
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.activeTab", activeTab)
    }
    router.replace(`/admin?tab=${activeTab}`)
  }, [activeTab, router])

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

  const loadFeaturedOverride = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-thumbmail", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured override")
      const json = await res.json()
      const data = json?.data ?? null
      setFeaturedOverride(data)
      // Don't populate the input with a long data URL; keep it empty unless user pastes something.
      setFeaturedThumbUrl("")
    } catch (error) {
      console.error("Failed to load featured thumbnail override:", error)
    }
  }

  const handleSaveFeaturedOverride = async () => {
    if (!featuredThumbUrl.trim()) {
      showMessage("error", "Upload or paste a thumbnail URL first")
      return
    }
    await saveFeaturedUrl(featuredThumbUrl.trim())
  }

  const saveFeaturedUrl = async (url: string) => {
    if (!url) return
    setIsSavingFeatured(true)
    try {
      const res = await fetch("/api/admin/more/featured-thumbmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl: url }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedOverride()
      showMessage("success", "Featured image updated")
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

      const text = await res.text()
      let json: any = null
      try {
        json = JSON.parse(text)
      } catch {
        /* ignore */
      }
      if (!res.ok || !json?.success) {
        const errMsg = json?.error || `Upload failed (${res.status})`
        throw new Error(errMsg)
      }

      const url = json.url as string
      // Keep the input clean; rely on preview below to show current image.
      setFeaturedThumbUrl("")
      await saveFeaturedUrl(url)
      showMessage("success", "Image uploaded and applied")
    } catch (error: any) {
      console.error("Failed to upload featured thumbnail:", error)
      showMessage("error", error?.message || "Upload failed")
    } finally {
      setIsUploadingFeatured(false)
    }
  }

  const loadFeaturedDescription = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-description", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured description")
      const json = await res.json()
      const data = json?.data ?? null
      setSavedFeaturedDescription(data?.description ?? null)
      setFeaturedDescription(data?.description ?? "")
    } catch (error) {
      console.error("Failed to load featured description:", error)
      setSavedFeaturedDescription(null)
      setFeaturedDescription("")
    }
  }

  const handleSaveFeaturedDescription = async () => {
    const description = featuredDescription.trim()
    if (!description) {
      showMessage("error", "Enter a featured description first")
      return
    }
    setIsSavingFeaturedDescription(true)
    try {
      const res = await fetch("/api/admin/more/featured-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedDescription()
      showMessage("success", "Featured description updated")
    } catch (error) {
      console.error("Failed to save featured description:", error)
      showMessage("error", "Failed to save featured description")
    } finally {
      setIsSavingFeaturedDescription(false)
    }
  }

  const handleClearFeaturedDescription = async () => {
    if (!confirm("Remove the custom featured description?")) return
    setIsSavingFeaturedDescription(true)
    try {
      const res = await fetch("/api/admin/more/featured-description", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setSavedFeaturedDescription(null)
      setFeaturedDescription("")
      showMessage("success", "Featured description cleared")
    } catch (error) {
      console.error("Failed to clear featured description:", error)
      showMessage("error", "Failed to clear featured description")
    } finally {
      setIsSavingFeaturedDescription(false)
    }
  }

  const loadFeaturedVideoOverride = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-video", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured video override")
      const json = await res.json()
      const data = json?.data ?? null
      setSavedFeaturedVideoId(data?.videoId ?? null)
    } catch (error) {
      console.error("Failed to load featured video override:", error)
      setSavedFeaturedVideoId(null)
    }
  }

  const handleSaveFeaturedVideo = async () => {
    const videoId = extractYouTubeVideoId(featuredVideoUrl)
    if (!videoId) {
      showMessage("error", "Enter a valid YouTube link or video ID")
      return
    }
    setIsSavingFeaturedVideo(true)
    try {
      const res = await fetch("/api/admin/more/featured-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      })
      if (!res.ok) throw new Error("Save failed")
      setFeaturedVideoUrl("")
      await loadFeaturedVideoOverride()
      showMessage("success", "Featured video override saved")
    } catch (error) {
      console.error("Failed to save featured video override:", error)
      showMessage("error", "Failed to save featured video override")
    } finally {
      setIsSavingFeaturedVideo(false)
    }
  }

  const handleClearFeaturedVideo = async () => {
    if (!confirm("Remove the featured video override?")) return
    setIsSavingFeaturedVideo(true)
    try {
      const res = await fetch("/api/admin/more/featured-video", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setSavedFeaturedVideoId(null)
      setFeaturedVideoUrl("")
      showMessage("success", "Featured video override cleared")
    } catch (error) {
      console.error("Failed to clear featured video override:", error)
      showMessage("error", "Failed to clear featured video override")
    } finally {
      setIsSavingFeaturedVideo(false)
    }
  }

  const loadFeaturedTitleStyle = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-title-style", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured title style")
      const json = await res.json()
      const data = json?.data ?? null
      if (data?.fontFamily && data?.fontSizePx) {
        setSavedFeaturedTitleStyle({
          fontFamily: data.fontFamily,
          fontSizePx: data.fontSizePx,
          fontUrl: data.fontUrl ?? null,
        })
        setFeaturedTitleFont(data.fontFamily)
        setFeaturedTitleSize(String(data.fontSizePx))
        setFeaturedTitleFontUrl(data.fontUrl ?? null)
      } else {
        setSavedFeaturedTitleStyle(null)
        setFeaturedTitleFont("")
        setFeaturedTitleSize("")
        setFeaturedTitleFontUrl(null)
      }
    } catch (error) {
      console.error("Failed to load featured title style:", error)
      setSavedFeaturedTitleStyle(null)
    }
  }

  const loadFeaturedTitleOverride = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-title", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured title override")
      const json = await res.json()
      const data = json?.data ?? null
      setSavedFeaturedTitleOverride(data?.title ?? null)
      setFeaturedTitleOverride(data?.title ?? "")
    } catch (error) {
      console.error("Failed to load featured title override:", error)
      setSavedFeaturedTitleOverride(null)
      setFeaturedTitleOverride("")
    }
  }

  const handleSaveFeaturedTitleOverride = async () => {
    const title = featuredTitleOverride.trim()
    if (!title) {
      showMessage("error", "Enter a featured title first")
      return
    }
    setIsSavingFeaturedTitleOverride(true)
    try {
      const res = await fetch("/api/admin/more/featured-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedTitleOverride()
      showMessage("success", "Featured title updated")
    } catch (error) {
      console.error("Failed to save featured title override:", error)
      showMessage("error", "Failed to save featured title override")
    } finally {
      setIsSavingFeaturedTitleOverride(false)
    }
  }

  const handleClearFeaturedTitleOverride = async () => {
    if (!confirm("Remove the featured title override?")) return
    setIsSavingFeaturedTitleOverride(true)
    try {
      const res = await fetch("/api/admin/more/featured-title", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setSavedFeaturedTitleOverride(null)
      setFeaturedTitleOverride("")
      showMessage("success", "Featured title override cleared")
    } catch (error) {
      console.error("Failed to clear featured title override:", error)
      showMessage("error", "Failed to clear featured title override")
    } finally {
      setIsSavingFeaturedTitleOverride(false)
    }
  }

  const handleSaveFeaturedTitleStyle = async () => {
    const fontFamily = featuredTitleFont.trim()
    const sizeValue = Number.parseInt(featuredTitleSize, 10)
    if (!fontFamily) {
      showMessage("error", "Enter a font family")
      return
    }
    if (!Number.isFinite(sizeValue) || sizeValue < 12 || sizeValue > 200) {
      showMessage("error", "Enter a font size between 12 and 200")
      return
    }
    setIsSavingFeaturedTitleStyle(true)
    try {
      const res = await fetch("/api/admin/more/featured-title-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fontFamily, fontSizePx: sizeValue, fontUrl: featuredTitleFontUrl ?? null }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedTitleStyle()
      showMessage("success", "Featured title style updated")
    } catch (error) {
      console.error("Failed to save featured title style:", error)
      showMessage("error", "Failed to save featured title style")
    } finally {
      setIsSavingFeaturedTitleStyle(false)
    }
  }

  const handleClearFeaturedTitleStyle = async () => {
    if (!confirm("Remove the featured title style override?")) return
    setIsSavingFeaturedTitleStyle(true)
    try {
      const res = await fetch("/api/admin/more/featured-title-style", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setSavedFeaturedTitleStyle(null)
      setFeaturedTitleFont("")
      setFeaturedTitleSize("")
      setFeaturedTitleFontUrl(null)
      showMessage("success", "Featured title style cleared")
    } catch (error) {
      console.error("Failed to clear featured title style:", error)
      showMessage("error", "Failed to clear featured title style")
    } finally {
      setIsSavingFeaturedTitleStyle(false)
    }
  }

  const loadUploadedFonts = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-fonts", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch fonts")
      const json = await res.json()
      setUploadedFonts(Array.isArray(json?.fonts) ? json.fonts : [])
    } catch (error) {
      console.error("Failed to load fonts:", error)
      setUploadedFonts([])
    }
  }

  const handleUploadFont = async () => {
    if (!fontUploadFile) {
      showMessage("error", "Choose a font file first")
      return
    }
    setIsUploadingFont(true)
    try {
      const fd = new FormData()
      fd.append("file", fontUploadFile)

      const res = await fetch("/api/admin/more/featured-fonts", {
        method: "POST",
        body: fd,
      })

      const text = await res.text()
      let json: any = null
      try {
        json = JSON.parse(text)
      } catch {
        /* ignore */
      }
      if (!res.ok || !json?.success) {
        const errMsg = json?.error || `Upload failed (${res.status})`
        throw new Error(errMsg)
      }

      setFontUploadFile(null)
      await loadUploadedFonts()
      showMessage("success", "Font uploaded")
    } catch (error: any) {
      console.error("Failed to upload font:", error)
      showMessage("error", error?.message || "Upload failed")
    } finally {
      setIsUploadingFont(false)
    }
  }

  const handleSelectFont = (value: string) => {
    setSelectedFontName(value)
    if (!value) {
      setSelectedFontUrl(null)
      setFeaturedTitleFontUrl(null)
      return
    }
    const match = uploadedFonts.find((font) => font.name === value)
    if (match) {
      setSelectedFontUrl(match.url)
      setFeaturedTitleFont(value)
      setFeaturedTitleFontUrl(match.url)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadMoreVideos()
      loadFeaturedOverride()
      loadFeaturedDescription()
      loadFeaturedVideoOverride()
      loadFeaturedTitleStyle()
      loadFeaturedTitleOverride()
      loadUploadedFonts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!uploadedFonts.length || !savedFeaturedTitleStyle?.fontFamily) return
    const match = uploadedFonts.find((font) => font.name === savedFeaturedTitleStyle.fontFamily)
    if (match) {
      setSelectedFontName(match.name)
      setSelectedFontUrl(match.url)
    }
  }, [uploadedFonts, savedFeaturedTitleStyle])

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

  const previewFontFamily = featuredTitleFont.trim() || savedFeaturedTitleStyle?.fontFamily || ""
  const previewFontUrl = featuredTitleFontUrl || selectedFontUrl || savedFeaturedTitleStyle?.fontUrl || null
  const previewFontFaceCss =
    previewFontFamily && previewFontUrl
      ? (() => {
          const safeFamily = previewFontFamily.replace(/"/g, '\\"')
          const ext = previewFontUrl.split(".").pop()?.toLowerCase() ?? ""
          const format =
            ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "otf" ? "opentype" : "truetype"
          return `
@font-face {
  font-family: "${safeFamily}";
  src: url("${previewFontUrl}") format("${format}");
  font-display: swap;
}
`
        })()
      : ""

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
      {previewFontFaceCss && <style jsx global>{previewFontFaceCss}</style>}
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

        <div
          role="tablist"
          aria-label="Admin sections"
          className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3"
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
            event.preventDefault()
            const currentIndex = tabs.findIndex((tab) => tab.key === activeTab)
            const direction = event.key === "ArrowRight" ? 1 : -1
            const nextIndex = (currentIndex + direction + tabs.length) % tabs.length
            const nextTab = tabs[nextIndex]
            if (nextTab) {
              setActiveTab(nextTab.key)
              const nextButton = document.getElementById(`tab-${nextTab.key}`) as HTMLButtonElement | null
              nextButton?.focus()
            }
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.key}
              aria-controls={tab.panelId}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key ? "bg-red-600 text-white" : "bg-zinc-900 text-gray-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "featured" && (
        <section id="tab-panel-featured" role="tabpanel" aria-labelledby="tab-featured" className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Featured Video Editor</h2>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-6">
            <div
              role="tablist"
              aria-label="Featured editor sections"
              className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3"
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                event.preventDefault()
                const currentIndex = featuredTabs.findIndex((tab) => tab.key === featuredSubTab)
                const direction = event.key === "ArrowRight" ? 1 : -1
                const nextIndex = (currentIndex + direction + featuredTabs.length) % featuredTabs.length
                const nextTab = featuredTabs[nextIndex]
                if (nextTab) {
                  setFeaturedSubTab(nextTab.key)
                  const nextButton = document.getElementById(`featured-tab-${nextTab.key}`) as HTMLButtonElement | null
                  nextButton?.focus()
                }
              }}
            >
              {featuredTabs.map((tab) => (
                <button
                  key={tab.key}
                  id={`featured-tab-${tab.key}`}
                  role="tab"
                  type="button"
                  aria-selected={featuredSubTab === tab.key}
                  aria-controls={tab.panelId}
                  tabIndex={featuredSubTab === tab.key ? 0 : -1}
                  onClick={() => setFeaturedSubTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    featuredSubTab === tab.key ? "bg-red-600 text-white" : "bg-black text-gray-300 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {featuredSubTab === "video" && (
            <div id="featured-panel-video" role="tabpanel" aria-labelledby="featured-tab-video" className="space-y-6">
              <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Featured Video Override</h3>
              <div className="space-y-2">
                <Label className="text-white">YouTube link or video ID</Label>
                <Input
                  value={featuredVideoUrl}
                  onChange={(e) => setFeaturedVideoUrl(e.target.value)}
                  className="bg-black border-zinc-700 text-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveFeaturedVideo}
                  disabled={isSavingFeaturedVideo}
                  className="bg-red-600 hover:bg-red-700 flex-1"
                >
                  {isSavingFeaturedVideo ? "Saving..." : "Save Featured Video"}
                </Button>
                {savedFeaturedVideoId && (
                  <Button
                    onClick={handleClearFeaturedVideo}
                    variant="secondary"
                    disabled={isSavingFeaturedVideo}
                    className="flex-1"
                  >
                    Remove Override
                  </Button>
                )}
              </div>

              {savedFeaturedVideoId ? (
                <p className="text-sm text-gray-300">Override active: {savedFeaturedVideoId}</p>
              ) : (
                <p className="text-sm text-gray-400">No override set. Homepage will use the most recent upload.</p>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Featured Thumbnail Override</h3>
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
                  <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-black px-3 py-2">
                    <input
                      id="featured-thumb-file"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => setFeaturedThumbFile(e.target.files?.[0] ?? null)}
                    />
                    <label
                      htmlFor="featured-thumb-file"
                      className="cursor-pointer rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600"
                    >
                      Choose File
                    </label>
                    <span className="text-sm text-gray-400 truncate">
                      {featuredThumbFile?.name ?? "No file chosen"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleUploadFeaturedThumb}
                    disabled={isUploadingFeatured}
                    className="bg-zinc-700 hover:bg-zinc-600 flex-1"
                  >
                    {isUploadingFeatured ? "Uploading..." : "Upload & Apply"}
                  </Button>
                  <Button
                    onClick={handleSaveFeaturedOverride}
                    disabled={isSavingFeatured}
                    className="bg-red-600 hover:bg-red-700 flex-1"
                  >
                    {isSavingFeatured ? "Saving..." : "Apply URL"}
                  </Button>
                  {featuredOverride && (
                    <Button
                      onClick={handleClearFeaturedOverride}
                      variant="secondary"
                      disabled={isSavingFeatured}
                      className="flex-1"
                    >
                      Remove Override
                    </Button>
                  )}
                </div>
              </div>

              {featuredOverride ? (
                <div className="text-sm text-gray-300 space-y-2">
                  <p>Current override (preview below):</p>
                  <div className="relative w-48 h-28 border border-zinc-800 rounded overflow-hidden">
                    <Image src={featuredOverride.thumbnailUrl || "/placeholder.svg"} alt="Featured thumb" fill className="object-cover" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No override set. Upload an image to replace the homepage hero.</p>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Featured Description Override</h3>
              <div className="space-y-2">
                <Label className="text-white">Description text</Label>
                <textarea
                  value={featuredDescription}
                  onChange={(e) => setFeaturedDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-zinc-700 text-white rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Featured description shown on the homepage hero..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveFeaturedDescription}
                  disabled={isSavingFeaturedDescription}
                  className="bg-red-600 hover:bg-red-700 flex-1"
                >
                  {isSavingFeaturedDescription ? "Saving..." : "Save Description"}
                </Button>
                {savedFeaturedDescription && (
                  <Button
                    onClick={handleClearFeaturedDescription}
                    variant="secondary"
                    disabled={isSavingFeaturedDescription}
                    className="flex-1"
                  >
                    Remove Override
                  </Button>
                )}
              </div>

              {savedFeaturedDescription ? (
                <p className="text-sm text-gray-300">Current override is live on the homepage hero.</p>
              ) : (
                <p className="text-sm text-gray-400">No override set. Default hero description will be used.</p>
              )}
            </div>
            </div>
            )}

            {featuredSubTab === "style" && (
            <div id="featured-panel-style" role="tabpanel" aria-labelledby="featured-tab-style" className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Featured Title Style</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white">Font family</Label>
                  <Input
                    value={featuredTitleFont}
                    onChange={(e) => {
                      setFeaturedTitleFont(e.target.value)
                      setFeaturedTitleFontUrl(null)
                      setSelectedFontName("")
                      setSelectedFontUrl(null)
                    }}
                    className="bg-black border-zinc-700 text-white"
                    placeholder='e.g. "Bebas Neue", "Oswald", "Impact"'
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Font size (px)</Label>
                  <Input
                    value={featuredTitleSize}
                    onChange={(e) => setFeaturedTitleSize(e.target.value)}
                    className="bg-black border-zinc-700 text-white"
                    placeholder="e.g. 64"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div className="space-y-2">
                  <Label className="text-white">Upload font file (ttf, otf, oft, woff, woff2)</Label>
                  <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-black px-3 py-2">
                    <input
                      id="featured-title-font-file"
                      type="file"
                      accept=".ttf,.otf,.oft,.woff,.woff2"
                      className="hidden"
                      onChange={(e) => setFontUploadFile(e.target.files?.[0] ?? null)}
                    />
                    <label
                      htmlFor="featured-title-font-file"
                      className="cursor-pointer rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600"
                    >
                      Choose File
                    </label>
                    <span className="text-sm text-gray-400 truncate">
                      {fontUploadFile?.name ?? "No file chosen"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleUploadFont}
                  disabled={isUploadingFont}
                  className="bg-zinc-700 hover:bg-zinc-600"
                >
                  {isUploadingFont ? "Uploading..." : "Upload Font"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Select uploaded font</Label>
                <select
                  value={selectedFontName}
                  onChange={(e) => handleSelectFont(e.target.value)}
                  className="w-full h-10 rounded-md border border-zinc-700 bg-black px-3 text-sm text-white"
                >
                  <option value="">-- Select a font --</option>
                  {uploadedFonts.map((font) => (
                    <option key={font.fileName} value={font.name}>
                      {font.name}
                    </option>
                  ))}
                </select>
                {selectedFontUrl && (
                  <p className="text-xs text-gray-400">Using uploaded font: {selectedFontName}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveFeaturedTitleStyle}
                  disabled={isSavingFeaturedTitleStyle}
                  className="bg-red-600 hover:bg-red-700 flex-1"
                >
                  {isSavingFeaturedTitleStyle ? "Saving..." : "Save Title Style"}
                </Button>
                {savedFeaturedTitleStyle && (
                  <Button
                    onClick={handleClearFeaturedTitleStyle}
                    variant="secondary"
                    disabled={isSavingFeaturedTitleStyle}
                    className="flex-1"
                  >
                    Remove Override
                  </Button>
                )}
              </div>

              {savedFeaturedTitleStyle ? (
                <p className="text-sm text-gray-300">
                  Override active: {savedFeaturedTitleStyle.fontFamily} @ {savedFeaturedTitleStyle.fontSizePx}px
                </p>
              ) : (
                <p className="text-sm text-gray-400">No title style override set.</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Preview</h3>
              <div className="relative overflow-hidden rounded-lg border border-zinc-800">
                <div className="relative h-48 w-full">
                  <Image
                    src={featuredOverride?.thumbnailUrl || "/placeholder.svg"}
                    alt="Featured preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <p
                    className="text-white font-semibold leading-[1.1] break-words"
                    style={{
                      fontFamily: previewFontFamily || "inherit",
                      fontSize: `${Math.min(
                        Math.max(
                          Number.parseInt(featuredTitleSize || "", 10) ||
                            savedFeaturedTitleStyle?.fontSizePx ||
                            32,
                          18,
                        ),
                        64,
                      )}px`,
                      lineHeight: "1.1",
                    }}
                  >
                    {featuredTitleOverride || savedFeaturedTitleOverride || "Featured Title Preview"}
                  </p>
                  <p className="text-xs text-gray-300 mt-2">
                    {featuredDescription || savedFeaturedDescription || "Featured description preview"}
                  </p>
                </div>
              </div>
            </div>
            </div>
            )}

            {featuredSubTab === "title" && (
            <div id="featured-panel-title" role="tabpanel" aria-labelledby="featured-tab-title" className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Featured Title Override</h3>
              <div className="space-y-2">
                <Label className="text-white">Title text</Label>
                <Input
                  value={featuredTitleOverride}
                  onChange={(e) => setFeaturedTitleOverride(e.target.value)}
                  className="bg-black border-zinc-700 text-white"
                  placeholder="Featured video title override..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveFeaturedTitleOverride}
                  disabled={isSavingFeaturedTitleOverride}
                  className="bg-red-600 hover:bg-red-700 flex-1"
                >
                  {isSavingFeaturedTitleOverride ? "Saving..." : "Save Title"}
                </Button>
                {savedFeaturedTitleOverride && (
                  <Button
                    onClick={handleClearFeaturedTitleOverride}
                    variant="secondary"
                    disabled={isSavingFeaturedTitleOverride}
                    className="flex-1"
                  >
                    Remove Override
                  </Button>
                )}
              </div>

              {savedFeaturedTitleOverride ? (
                <p className="text-sm text-gray-300">Current override is live on the homepage hero.</p>
              ) : (
                <p className="text-sm text-gray-400">No override set. Default title will be used.</p>
              )}
            </div>
            )}
          </div>
        </section>
        )}

        {activeTab === "more" && (
        <section id="tab-panel-more" role="tabpanel" aria-labelledby="tab-more" className="mb-12">
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
        )}

        {activeTab === "current" && (
        <section id="tab-panel-current" role="tabpanel" aria-labelledby="tab-current">
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
        )}
      </main>
    </div>
  )
}
