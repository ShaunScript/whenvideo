"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import {
  getCategories,
  saveCategories,
  extractVideoId,
  CATEGORIES_CONFIG,
  type Category,
  type Nominee,
} from "@/lib/awards-data"

export default function AwardsAdminPage() {
  const router = useRouter()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("")
  const [videoUrl, setVideoUrl] = React.useState("")
  const [videoTitle, setVideoTitle] = React.useState("")
  const [channelName, setChannelName] = React.useState("")
  const [previewVideoId, setPreviewVideoId] = React.useState<string | null>(null)
  const [saveMessage, setSaveMessage] = React.useState("")
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = React.useState(true)
  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const ADMIN_PASSWORD = "AdmimD26"

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

  React.useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true)
      getCategories().then((loadedCategories) => {
        setCategories(loadedCategories)
        if (loadedCategories.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(loadedCategories[0].id)
        }
        setIsLoading(false)
      })
    }
  }, [isAuthenticated])

  React.useEffect(() => {
    const videoId = extractVideoId(videoUrl)
    setPreviewVideoId(videoId)
  }, [videoUrl])

  const handleAddNominee = async () => {
    if (!selectedCategoryId || !videoUrl || !videoTitle || !channelName) {
      alert("Please fill in all fields")
      return
    }

    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
      alert("Invalid YouTube URL. Please enter a valid YouTube video, Shorts, or Clip URL.")
      return
    }

    const newNominee: Nominee = {
      id: `${selectedCategoryId}-${Date.now()}`,
      title: videoTitle,
      videoId,
      channelName,
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
try {
  await saveCategories(updatedCategories)
} catch (e) {
  console.error(e)
  alert(e instanceof Error ? e.message : "Failed to save categories")
}


    // Reset form
    setVideoUrl("")
    setVideoTitle("")
    setChannelName("")
    setPreviewVideoId(null)

    setSaveMessage("Nominee added successfully!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const handleRemoveNominee = async (categoryId: string, nomineeId: string) => {
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
try {
  await saveCategories(updatedCategories)
} catch (e) {
  console.error(e)
  alert(e instanceof Error ? e.message : "Failed to save categories")
}


    setSaveMessage("Nominee removed successfully!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Dialog open={showPasswordDialog} onOpenChange={() => router.push("/awards")}>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 md:px-16">
          <div className="flex items-center gap-4">
            <Link href="/awards">
              <Button variant="ghost" size="icon" className="hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/">
              <div className="relative h-8 w-24">
                <Image src="/images/doza-logo.png" alt="DOZA" fill className="object-contain" />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/awards">
              <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white">
                <Eye className="w-4 h-4 mr-2" />
                View Awards Page
              </Button>
            </Link>
            <Link href="/awards-results">
              <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white">
                View Results
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-16 py-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">Awards Admin Panel</h1>
          <p className="text-gray-400">Manage nominees for each award category</p>
        </div>

        {saveMessage && (
          <div className="mb-6 p-4 bg-green-600/20 border border-green-600 rounded-lg text-green-400">
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Nominee Form */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Add Nominee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* form content unchanged */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
