"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
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
  categories?: string[]
}

type FeaturedCarouselItem = {
  videoId: string
  title: string
  description: string
  thumbnailUrl: string
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
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({})
  const [categorySaving, setCategorySaving] = useState<Record<string, boolean>>({})

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
  const [featuredVideoListInput, setFeaturedVideoListInput] = useState("")
  const [savedFeaturedVideoList, setSavedFeaturedVideoList] = useState<string[]>([])
  const [isSavingFeaturedVideoList, setIsSavingFeaturedVideoList] = useState(false)
  const [featuredCarouselItems, setFeaturedCarouselItems] = useState<FeaturedCarouselItem[]>([
    { videoId: "", title: "", description: "", thumbnailUrl: "" },
    { videoId: "", title: "", description: "", thumbnailUrl: "" },
    { videoId: "", title: "", description: "", thumbnailUrl: "" },
    { videoId: "", title: "", description: "", thumbnailUrl: "" },
    { videoId: "", title: "", description: "", thumbnailUrl: "" },
  ])
  const [featuredCarouselIndex, setFeaturedCarouselIndex] = useState(0)
  const [isSavingFeaturedCarousel, setIsSavingFeaturedCarousel] = useState(false)
  const [isFontEditorOpen, setIsFontEditorOpen] = useState(false)
  const [featuredTitleFont, setFeaturedTitleFont] = useState("")
  const [featuredTitleSize, setFeaturedTitleSize] = useState("")
  const [featuredTitleOffsetX, setFeaturedTitleOffsetX] = useState("")
  const [featuredTitleOffsetY, setFeaturedTitleOffsetY] = useState("")
  const [featuredTitleFontUrl, setFeaturedTitleFontUrl] = useState<string | null>(null)
  const [featuredTitleOverride, setFeaturedTitleOverride] = useState("")
  const [savedFeaturedTitleOverride, setSavedFeaturedTitleOverride] = useState<string | null>(null)
  const [isSavingFeaturedTitleOverride, setIsSavingFeaturedTitleOverride] = useState(false)
  const [savedFeaturedTitleStyle, setSavedFeaturedTitleStyle] = useState<{
    fontFamily: string
    fontSizePx: number
    fontUrl?: string | null
    offsetXPx?: number
    offsetYPx?: number
  } | null>(null)
  const [uploadedFonts, setUploadedFonts] = useState<{ name: string; url: string; fileName: string }[]>([])
  const [selectedFontName, setSelectedFontName] = useState("")
  const [selectedFontUrl, setSelectedFontUrl] = useState<string | null>(null)
  const [fontUploadFile, setFontUploadFile] = useState<File | null>(null)
  const [isUploadingFont, setIsUploadingFont] = useState(false)
  const [isSavingFeaturedTitleStyle, setIsSavingFeaturedTitleStyle] = useState(false)
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop")
  const previewHostRef = useRef<HTMLDivElement | null>(null)
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [isSavingFeaturedAll, setIsSavingFeaturedAll] = useState(false)
  type TabKey = "featured" | "more" | "current" | "game"
  const [activeTab, setActiveTab] = useState<TabKey>("featured")
  const tabs: { key: TabKey; label: string; panelId: string }[] = [
    { key: "featured", label: "Featured Video Editor", panelId: "tab-panel-featured" },
    { key: "more", label: "More Videos", panelId: "tab-panel-more" },
    { key: "current", label: "Current More Videos", panelId: "tab-panel-current" },
    { key: "game", label: "Game Leaderboard", panelId: "tab-panel-game" },
  ]
  const [gameLeaderboard, setGameLeaderboard] = useState<{ name: string; score: number; ts: number }[]>([])
  const [isLoadingGameLeaderboard, setIsLoadingGameLeaderboard] = useState(false)
  const [editingLeaderboardTs, setEditingLeaderboardTs] = useState<number | null>(null)
  const [editingLeaderboardName, setEditingLeaderboardName] = useState("")

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

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch("/api/admin/auth", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (res.ok && data?.authenticated) {
          setIsAuthenticated(true)
          setShowPasswordDialog(false)
          setPasswordError("")
        }
      } catch {
        // ignore; user can still manually enter password
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const normalizeCategories = (value: string) =>
    value
      .split(",")
      .map((cat) => cat.trim())
      .filter(Boolean)

  const getCategoryText = (video: Video) => categoryEdits[video.id] ?? (video.categories ?? []).join(", ")

  const handleSaveCategories = async (video: Video) => {
    const categories = normalizeCategories(getCategoryText(video))
    setCategorySaving((prev) => ({ ...prev, [video.id]: true }))
    try {
      const res = await fetch("/api/admin/more", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, categories }),
      })
      if (!res.ok) throw new Error("Failed to update categories")
      setMoreVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, categories } : v)))
      setCategoryEdits((prev) => ({ ...prev, [video.id]: categories.join(", ") }))
      showMessage("success", "Categories updated")
    } catch (error) {
      console.error("Failed to update categories:", error)
      showMessage("error", "Failed to update categories")
    } finally {
      setCategorySaving((prev) => ({ ...prev, [video.id]: false }))
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ;(async () => {
      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok) {
          setIsAuthenticated(true)
          setShowPasswordDialog(false)
          setPasswordError("")
          return
        }
        setPasswordError(data?.error || "Incorrect password. Please try again.")
        setPassword("")
      } catch {
        setPasswordError("Failed to authenticate. Please try again.")
      }
    })()
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

  const loadFeaturedVideoListOverride = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-videos", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured video list")
      const json = await res.json()
      const data = json?.data ?? null
      const list = Array.isArray(data?.videoIds) ? data.videoIds : []
      setSavedFeaturedVideoList(list)
      setFeaturedVideoListInput(list.join("\n"))
    } catch (error) {
      console.error("Failed to load featured video list:", error)
      setSavedFeaturedVideoList([])
      setFeaturedVideoListInput("")
    }
  }

  const loadFeaturedCarousel = async () => {
    try {
      const res = await fetch("/api/admin/more/featured-carousel", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch featured carousel")
      const json = await res.json()
      const items = Array.isArray(json?.data?.items) ? json.data.items : []
      let normalized: FeaturedCarouselItem[] = items.slice(0, 5).map((item: any) => ({
        videoId: typeof item?.videoId === "string" ? item.videoId : "",
        title: typeof item?.title === "string" ? item.title : "",
        description: typeof item?.description === "string" ? item.description : "",
        thumbnailUrl: typeof item?.thumbnailUrl === "string" ? item.thumbnailUrl : "",
      }))

      if (normalized.length === 0) {
        const autoRes = await fetch("/api/admin/more/featured-auto", { cache: "no-store" })
        if (autoRes.ok) {
          const autoJson = await autoRes.json()
          const autoItems = Array.isArray(autoJson?.data?.items) ? autoJson.data.items : []
          normalized = autoItems.slice(0, 5).map((item: any) => ({
            videoId: typeof item?.videoId === "string" ? item.videoId : "",
            title: typeof item?.title === "string" ? item.title : "",
            description: typeof item?.description === "string" ? item.description : "",
            thumbnailUrl: typeof item?.thumbnailUrl === "string" ? item.thumbnailUrl : "",
          }))
        }
      }
      while (normalized.length < 5) {
        normalized.push({ videoId: "", title: "", description: "", thumbnailUrl: "" })
      }
      setFeaturedCarouselItems(normalized)
      setFeaturedCarouselIndex(0)
    } catch (error) {
      console.error("Failed to load featured carousel:", error)
      setFeaturedCarouselItems([
        { videoId: "", title: "", description: "", thumbnailUrl: "" },
        { videoId: "", title: "", description: "", thumbnailUrl: "" },
        { videoId: "", title: "", description: "", thumbnailUrl: "" },
        { videoId: "", title: "", description: "", thumbnailUrl: "" },
        { videoId: "", title: "", description: "", thumbnailUrl: "" },
      ])
      setFeaturedCarouselIndex(0)
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

  const handleSaveFeaturedAll = async () => {
    if (isSavingFeaturedAll) return

    const pending: Array<() => Promise<void>> = []

    const nextVideoId = featuredVideoUrl.trim() ? extractYouTubeVideoId(featuredVideoUrl) : null
    if (featuredVideoUrl.trim() && !nextVideoId) {
      showMessage("error", "Enter a valid YouTube link or video ID")
      return
    }

    const nextTitle = featuredTitleOverride.trim()
    const nextThumbUrl = featuredThumbUrl.trim()

    const nextFontFamily = featuredTitleFont.trim()
    const nextFontSizePx = Number.parseInt(featuredTitleSize || "", 10)
    const nextOffsetXPx = Number.parseInt(featuredTitleOffsetX || "0", 10)
    const nextOffsetYPx = Number.parseInt(featuredTitleOffsetY || "0", 10)

    if (nextVideoId && nextVideoId !== savedFeaturedVideoId) {
      pending.push(async () => {
        const res = await fetch("/api/admin/more/featured-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: nextVideoId }),
        })
        if (!res.ok) throw new Error("Failed to save featured video override")
        setFeaturedVideoUrl("")
        await loadFeaturedVideoOverride()
      })
    }

    if (nextTitle && nextTitle !== (savedFeaturedTitleOverride ?? "")) {
      pending.push(async () => {
        const res = await fetch("/api/admin/more/featured-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        })
        if (!res.ok) throw new Error("Failed to save featured title override")
        await loadFeaturedTitleOverride()
      })
    }

    const styleChanged =
      nextFontFamily &&
      Number.isFinite(nextFontSizePx) &&
      (nextFontFamily !== (savedFeaturedTitleStyle?.fontFamily ?? "") ||
        nextFontSizePx !== (savedFeaturedTitleStyle?.fontSizePx ?? 0) ||
        (featuredTitleFontUrl ?? null) !== (savedFeaturedTitleStyle?.fontUrl ?? null) ||
        nextOffsetXPx !== (savedFeaturedTitleStyle?.offsetXPx ?? 0) ||
        nextOffsetYPx !== (savedFeaturedTitleStyle?.offsetYPx ?? 0))

    if (styleChanged) {
      if (nextFontSizePx < 12 || nextFontSizePx > 200) {
        showMessage("error", "Enter a font size between 12 and 200")
        return
      }
      if (!Number.isFinite(nextOffsetXPx) || nextOffsetXPx < -800 || nextOffsetXPx > 800) {
        showMessage("error", "X offset must be between -800 and 800")
        return
      }
      if (!Number.isFinite(nextOffsetYPx) || nextOffsetYPx < -800 || nextOffsetYPx > 800) {
        showMessage("error", "Y offset must be between -800 and 800")
        return
      }

      pending.push(async () => {
        const res = await fetch("/api/admin/more/featured-title-style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fontFamily: nextFontFamily,
            fontSizePx: nextFontSizePx,
            fontUrl: featuredTitleFontUrl ?? null,
            offsetXPx: nextOffsetXPx,
            offsetYPx: nextOffsetYPx,
          }),
        })
        if (!res.ok) throw new Error("Failed to save featured title style")
        await loadFeaturedTitleStyle()
      })
    }

    if (featuredThumbFile) {
      pending.push(async () => {
        const fd = new FormData()
        fd.append("file", featuredThumbFile)
        const res = await fetch("/api/admin/more/featured-thumbmail/upload", { method: "POST", body: fd })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          const msg = json?.error || "Failed to upload thumbnail"
          throw new Error(msg)
        }
        setFeaturedThumbFile(null)
        setFeaturedThumbUrl("")
        await loadFeaturedOverride()
      })
    } else if (nextThumbUrl) {
      pending.push(async () => {
        const res = await fetch("/api/admin/more/featured-thumbmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnailUrl: nextThumbUrl }),
        })
        if (!res.ok) throw new Error("Failed to save featured thumbnail")
        setFeaturedThumbUrl("")
        await loadFeaturedOverride()
      })
    }

    if (pending.length === 0) {
      showMessage("success", "No changes to save")
      return
    }

    setIsSavingFeaturedAll(true)
    try {
      for (const task of pending) {
        await task()
      }
      showMessage("success", "Saved featured changes")
    } catch (error) {
      console.error("Failed to save featured changes:", error)
      showMessage("error", error instanceof Error ? error.message : "Failed to save changes")
    } finally {
      setIsSavingFeaturedAll(false)
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

  const handleSaveFeaturedVideoList = async () => {
    const lines = featuredVideoListInput.split("\n").map((line) => line.trim()).filter(Boolean)
    const ids: string[] = []
    for (const line of lines) {
      const id = extractYouTubeVideoId(line)
      if (id && !ids.includes(id)) ids.push(id)
      if (ids.length >= 5) break
    }
    if (ids.length === 0) {
      showMessage("error", "Enter at least one valid YouTube link or ID")
      return
    }
    setIsSavingFeaturedVideoList(true)
    try {
      const res = await fetch("/api/admin/more/featured-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: ids }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedVideoListOverride()
      showMessage("success", "Featured video list updated")
    } catch (error) {
      console.error("Failed to save featured video list:", error)
      showMessage("error", "Failed to save featured video list")
    } finally {
      setIsSavingFeaturedVideoList(false)
    }
  }

  const handleClearFeaturedVideoList = async () => {
    if (!confirm("Remove the featured video list override?")) return
    setIsSavingFeaturedVideoList(true)
    try {
      const res = await fetch("/api/admin/more/featured-videos", { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setSavedFeaturedVideoList([])
      setFeaturedVideoListInput("")
      showMessage("success", "Featured video list cleared")
    } catch (error) {
      console.error("Failed to clear featured video list:", error)
      showMessage("error", "Failed to clear featured video list")
    } finally {
      setIsSavingFeaturedVideoList(false)
    }
  }

  const updateFeaturedCarouselItem = (index: number, patch: Partial<FeaturedCarouselItem>) => {
    setFeaturedCarouselItems((prev) => {
      const next = [...prev]
      const current = next[index] ?? { videoId: "", title: "", description: "", thumbnailUrl: "" }
      next[index] = { ...current, ...patch }
      return next
    })
  }

  const handleSaveFeaturedCarousel = async () => {
    const cleaned = featuredCarouselItems
      .slice(0, 5)
      .map((item) => ({
        videoId: extractYouTubeVideoId(item.videoId) || item.videoId.trim(),
        title: item.title.trim(),
        description: item.description.trim(),
        thumbnailUrl: item.thumbnailUrl.trim(),
      }))
      .filter((item) => item.videoId)

    setIsSavingFeaturedCarousel(true)
    try {
      const res = await fetch("/api/admin/more/featured-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cleaned }),
      })
      if (!res.ok) throw new Error("Save failed")
      await loadFeaturedCarousel()
      showMessage("success", "Featured carousel updated")
    } catch (error) {
      console.error("Failed to save featured carousel:", error)
      showMessage("error", "Failed to save featured carousel")
    } finally {
      setIsSavingFeaturedCarousel(false)
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
          offsetXPx: typeof data.offsetXPx === "number" ? data.offsetXPx : 0,
          offsetYPx: typeof data.offsetYPx === "number" ? data.offsetYPx : 0,
        })
        setFeaturedTitleFont(data.fontFamily)
        setFeaturedTitleSize(String(data.fontSizePx))
        setFeaturedTitleFontUrl(data.fontUrl ?? null)
        setFeaturedTitleOffsetX(String(typeof data.offsetXPx === "number" ? data.offsetXPx : 0))
        setFeaturedTitleOffsetY(String(typeof data.offsetYPx === "number" ? data.offsetYPx : 0))
      } else {
        setSavedFeaturedTitleStyle(null)
        setFeaturedTitleFont("")
        setFeaturedTitleSize("")
        setFeaturedTitleFontUrl(null)
        setFeaturedTitleOffsetX("")
        setFeaturedTitleOffsetY("")
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
    const offsetXValue = Number.parseInt(featuredTitleOffsetX || "0", 10)
    const offsetYValue = Number.parseInt(featuredTitleOffsetY || "0", 10)
    if (!fontFamily) {
      showMessage("error", "Enter a font family")
      return
    }
    if (!Number.isFinite(sizeValue) || sizeValue < 12 || sizeValue > 200) {
      showMessage("error", "Enter a font size between 12 and 200")
      return
    }
    if (!Number.isFinite(offsetXValue) || offsetXValue < -800 || offsetXValue > 800) {
      showMessage("error", "X offset must be between -800 and 800")
      return
    }
    if (!Number.isFinite(offsetYValue) || offsetYValue < -800 || offsetYValue > 800) {
      showMessage("error", "Y offset must be between -800 and 800")
      return
    }
    setIsSavingFeaturedTitleStyle(true)
    try {
      const res = await fetch("/api/admin/more/featured-title-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fontFamily,
          fontSizePx: sizeValue,
          fontUrl: featuredTitleFontUrl ?? null,
          offsetXPx: offsetXValue,
          offsetYPx: offsetYValue,
        }),
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
      setFeaturedTitleOffsetX("")
      setFeaturedTitleOffsetY("")
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

  const loadGameLeaderboard = async () => {
    setIsLoadingGameLeaderboard(true)
    try {
      const res = await fetch("/api/game/leaderboard", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch game leaderboard")
      const json = await res.json()
      setGameLeaderboard(Array.isArray(json?.data) ? json.data : [])
    } catch (error) {
      console.error("Failed to load game leaderboard:", error)
      setGameLeaderboard([])
    } finally {
      setIsLoadingGameLeaderboard(false)
    }
  }

  const handleEditLeaderboardName = (entry: { ts: number; name: string }) => {
    setEditingLeaderboardTs(entry.ts)
    setEditingLeaderboardName(entry.name)
  }

  const handleSaveLeaderboardName = async () => {
    if (editingLeaderboardTs == null) return
    const name = editingLeaderboardName.trim()
    if (!name) {
      showMessage("error", "Enter a name")
      return
    }
    try {
      const res = await fetch(
        `/api/game/leaderboard?ts=${encodeURIComponent(String(editingLeaderboardTs))}&name=${encodeURIComponent(name)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ts: editingLeaderboardTs, name }),
        },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Update failed")
      await loadGameLeaderboard()
      setEditingLeaderboardTs(null)
      setEditingLeaderboardName("")
      showMessage("success", "Leaderboard name updated")
    } catch (error) {
      console.error("Failed to update leaderboard name:", error)
      showMessage("error", error instanceof Error ? error.message : "Failed to update leaderboard name")
    }
  }

  const handleDeleteLeaderboardEntry = async (entryTs: number) => {
    if (!confirm("Remove this leaderboard entry?")) return
    try {
      const res = await fetch(`/api/game/leaderboard?ts=${encodeURIComponent(String(entryTs))}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ts: entryTs }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Delete failed")
      await loadGameLeaderboard()
      showMessage("success", "Leaderboard entry removed")
    } catch (error) {
      console.error("Failed to remove leaderboard entry:", error)
      showMessage("error", error instanceof Error ? error.message : "Failed to remove leaderboard entry")
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
      loadGameLeaderboard()
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
  const previewFontSizePx = (() => {
    const size = Number.parseInt(featuredTitleSize || "", 10)
    if (Number.isFinite(size)) return size
    return savedFeaturedTitleStyle?.fontSizePx ?? 48
  })()
  const previewOffsetXPx = (() => {
    const x = Number.parseInt(featuredTitleOffsetX || "", 10)
    if (Number.isFinite(x)) return x
    return savedFeaturedTitleStyle?.offsetXPx ?? 0
  })()
  const previewOffsetYPx = (() => {
    const y = Number.parseInt(featuredTitleOffsetY || "", 10)
    if (Number.isFinite(y)) return y
    return savedFeaturedTitleStyle?.offsetYPx ?? 0
  })()
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

  useEffect(() => {
    const deviceWidth = previewViewport === "mobile" ? 390 : 1280
    const computeScale = () => {
      const host = previewHostRef.current
      if (!host) return
      const available = host.clientWidth
      if (!available) return
      setPreviewScale(Math.min(1, available / deviceWidth))
    }
    computeScale()
    window.addEventListener("resize", computeScale)
    return () => window.removeEventListener("resize", computeScale)
  }, [previewViewport])

  useEffect(() => {
    const frameWin = previewFrameRef.current?.contentWindow
    if (!frameWin) return

    frameWin.postMessage(
      {
        type: "ADMIN_PREVIEW_FEATURED_TITLE_STYLE",
        payload: {
          style: {
            fontFamily: previewFontFamily,
            fontSizePx: previewFontSizePx,
            fontUrl: previewFontUrl,
            offsetXPx: previewOffsetXPx,
            offsetYPx: previewOffsetYPx,
          },
          title: featuredTitleOverride || savedFeaturedTitleOverride || "",
        },
      },
      window.location.origin,
    )
  }, [
    previewFontFamily,
    previewFontSizePx,
    previewFontUrl,
    previewOffsetXPx,
    previewOffsetYPx,
    featuredTitleOverride,
    savedFeaturedTitleOverride,
  ])

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
            <div className="bg-black rounded-lg p-6 border border-zinc-800 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-200">Full-page preview</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        previewViewport === "desktop"
                          ? "bg-red-600 text-white"
                          : "bg-zinc-900 text-gray-300 hover:text-white border border-zinc-800"
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        previewViewport === "mobile"
                          ? "bg-red-600 text-white"
                          : "bg-zinc-900 text-gray-300 hover:text-white border border-zinc-800"
                      }`}
                    >
                      Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => previewFrameRef.current?.contentWindow?.location.reload()}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-gray-300 hover:text-white border border-zinc-800"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div ref={previewHostRef} className="relative rounded-lg border border-zinc-800 bg-black overflow-hidden">
                  <div
                    style={{
                      width: previewViewport === "mobile" ? 390 : 1280,
                      height: previewViewport === "mobile" ? 844 : 720,
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <iframe
                      ref={previewFrameRef}
                      title="Homepage preview"
                      src="/?adminPreview=1"
                      className="border-0 bg-black"
                      style={{
                        width: previewViewport === "mobile" ? 390 : 1280,
                        height: previewViewport === "mobile" ? 844 : 720,
                      }}
                      onLoad={() => {
                        const frameWin = previewFrameRef.current?.contentWindow
                        if (!frameWin) return
                        frameWin.postMessage(
                          {
                            type: "ADMIN_PREVIEW_FEATURED_TITLE_STYLE",
                            payload: {
                              style: {
                                fontFamily: previewFontFamily,
                                fontSizePx: previewFontSizePx,
                                fontUrl: previewFontUrl,
                                offsetXPx: previewOffsetXPx,
                                offsetYPx: previewOffsetYPx,
                              },
                              title: featuredTitleOverride || savedFeaturedTitleOverride || "",
                            },
                          },
                          window.location.origin,
                        )
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  Preview renders the real homepage layout at {previewViewport === "mobile" ? 390 : 1280}px width. Changes update
                  live; click Save Changes to persist.
                </div>

                <div className="text-xs text-gray-400">Current video: {savedFeaturedVideoId ?? "Auto (most recent upload)"}</div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-white">Featured video override (YouTube link or ID)</Label>
                    <Input
                      value={featuredVideoUrl}
                      onChange={(e) => setFeaturedVideoUrl(e.target.value)}
                      className="bg-black border-zinc-700 text-white"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <div className="flex gap-3">
                      {savedFeaturedVideoId && (
                        <Button
                          onClick={handleClearFeaturedVideo}
                          variant="secondary"
                          disabled={isSavingFeaturedVideo}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Featured title override</Label>
                    <Input
                      value={featuredTitleOverride}
                      onChange={(e) => setFeaturedTitleOverride(e.target.value)}
                      className="bg-black border-zinc-700 text-white"
                      placeholder="TITLE"
                    />
                    <div className="flex gap-3">
                      {savedFeaturedTitleOverride && (
                        <Button
                          onClick={handleClearFeaturedTitleOverride}
                          variant="secondary"
                          disabled={isSavingFeaturedTitleOverride}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsFontEditorOpen((prev) => !prev)}
                      className="w-full"
                    >
                      {isFontEditorOpen ? "Hide Title Style Editor" : "Edit Title Style (Font/Size/Position)"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-white">Featured thumbnail URL</Label>
                    <Input
                      value={featuredThumbUrl}
                      onChange={(e) => setFeaturedThumbUrl(e.target.value)}
                      className="bg-black border-zinc-700 text-white"
                      placeholder="https://..."
                    />
                    <div className="flex gap-3">
                      {featuredOverride?.thumbnailUrl && (
                        <Button onClick={handleClearFeaturedOverride} variant="secondary" disabled={isSavingFeaturedAll}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-black px-3 py-2">
                        <input
                          id="featured-thumb-file"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setFeaturedThumbFile(e.target.files?.[0] ?? null)}
                        />
                        <label
                          htmlFor="featured-thumb-file"
                          className="cursor-pointer rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600"
                        >
                          Choose File
                        </label>
                        <span className="text-sm text-gray-400 truncate">{featuredThumbFile?.name ?? "No file chosen"}</span>
                      </div>
                      <div className="text-xs text-gray-400">Paste a URL or choose a file, then click Save Changes.</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                  <Button onClick={handleSaveFeaturedAll} disabled={isSavingFeaturedAll} className="bg-red-600 hover:bg-red-700">
                    {isSavingFeaturedAll ? "Saving..." : "Save Changes"}
                  </Button>
                  <div className="text-xs text-gray-400">
                    Saves: video override, title override, thumbnail (URL or file), and title style (if changed).
                  </div>
                </div>
              </div>

              {isFontEditorOpen && (
                <div className="mt-6 rounded-lg border border-red-600/40 bg-black p-4 space-y-4">
                  <div className="text-sm font-semibold text-red-500 uppercase tracking-[0.2em]">Title Font</div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white">Upload font file (ttf, otf, woff, woff2)</Label>
                      <div className="flex items-center gap-3 rounded-md border border-zinc-700 bg-black px-3 py-2">
                        <input
                          id="featured-title-font-file-inline"
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          className="hidden"
                          onChange={(e) => setFontUploadFile(e.target.files?.[0] ?? null)}
                        />
                        <label
                          htmlFor="featured-title-font-file-inline"
                          className="cursor-pointer rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600"
                        >
                          Choose File
                        </label>
                        <span className="text-sm text-gray-400 truncate">
                          {fontUploadFile?.name ?? "No file chosen"}
                        </span>
                      </div>
                      <Button onClick={handleUploadFont} disabled={isUploadingFont} className="bg-red-600 hover:bg-red-700">
                        {isUploadingFont ? "Uploading..." : "Upload Font"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Select uploaded font</Label>
                      <select
                        value={selectedFontName}
                        onChange={(e) => handleSelectFont(e.target.value)}
                        className="w-full bg-black border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">-- Select a font --</option>
                        {uploadedFonts.map((font) => (
                          <option key={font.fileName} value={font.name}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                      {selectedFontName && (
                        <p className="text-xs text-gray-400">Using uploaded font: {selectedFontName}</p>
                      )}

                      <div className="space-y-2 pt-3">
                        <Label className="text-white">Title Size</Label>
                        <input
                          type="range"
                          min={24}
                          max={200}
                          value={previewFontSizePx}
                          onChange={(e) => setFeaturedTitleSize(e.target.value)}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-400">
                          {previewFontSizePx}px
                        </div>
                      </div>

                      <div className="space-y-2 pt-3">
                        <Label className="text-white">Title X Offset</Label>
                        <input
                          type="range"
                          min={-800}
                          max={800}
                          value={previewOffsetXPx}
                          onChange={(e) => setFeaturedTitleOffsetX(e.target.value)}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-400">{previewOffsetXPx}px</div>
                      </div>

                      <div className="space-y-2 pt-3">
                        <Label className="text-white">Title Y Offset</Label>
                        <input
                          type="range"
                          min={-800}
                          max={800}
                          value={previewOffsetYPx}
                          onChange={(e) => setFeaturedTitleOffsetY(e.target.value)}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-400">{previewOffsetYPx}px</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {savedFeaturedTitleStyle && (
                      <Button onClick={handleClearFeaturedTitleStyle} variant="secondary" disabled={isSavingFeaturedAll}>
                        Clear
                      </Button>
                    )}
                    <div className="text-xs text-gray-400 self-center">Adjust sliders, then click Save Changes below the preview.</div>
                  </div>
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
                <div key={video.id} className="flex items-start gap-4 p-4 hover:bg-zinc-800/50 transition-colors">
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
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Input
                        value={getCategoryText(video)}
                        onChange={(e) => setCategoryEdits((prev) => ({ ...prev, [video.id]: e.target.value }))}
                        placeholder="Categories (comma separated)"
                        className="bg-black border-zinc-700 text-white text-xs h-8"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => handleSaveCategories(video)}
                        disabled={!!categorySaving[video.id]}
                      >
                        {categorySaving[video.id] ? "Saving..." : "Save"}
                      </Button>
                    </div>
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

        {activeTab === "game" && (
        <section id="tab-panel-game" role="tabpanel" aria-labelledby="tab-game" className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Game Leaderboard</h2>
            <Button
              onClick={loadGameLeaderboard}
              variant="secondary"
              className="text-xs"
              disabled={isLoadingGameLeaderboard}
            >
              {isLoadingGameLeaderboard ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {isLoadingGameLeaderboard ? (
            <p className="text-gray-400">Loading leaderboard...</p>
          ) : gameLeaderboard.length === 0 ? (
            <div className="bg-zinc-900 rounded-lg p-8 text-center text-gray-400 border border-zinc-800">
              <p>No leaderboard entries yet.</p>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {gameLeaderboard.map((entry, index) => (
                <div key={entry.ts} className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                  <div className="text-sm text-gray-400 w-10">#{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    {editingLeaderboardTs === entry.ts ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={editingLeaderboardName}
                          onChange={(e) => setEditingLeaderboardName(e.target.value)}
                          className="bg-black border-zinc-700 text-white"
                          maxLength={20}
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveLeaderboardName} className="bg-red-600 hover:bg-red-700">
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingLeaderboardTs(null)
                              setEditingLeaderboardName("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-white font-medium truncate">{entry.name}</div>
                        <div className="text-gray-400 text-xs">Score: {entry.score}</div>
                      </div>
                    )}
                  </div>
                  {editingLeaderboardTs !== entry.ts && (
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleEditLeaderboardName(entry)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLeaderboardEntry(entry.ts)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        )}
      </main>
    </div>
  )
}

