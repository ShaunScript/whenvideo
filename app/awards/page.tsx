"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Trophy, ArrowLeft, Check, LogOut, Play, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  getCategories,
  getCurrentUser,
  setCurrentUser,
  saveVotes,
  getUserVotes,
  checkIfUserExists,
  getAllVotesData,
  getThumbnailUrl,
  type Category,
  type User,
} from "@/lib/awards-data"
import { sendDiscordLoginNotification } from "@/app/actions/discord-webhook"

export default function AwardsPage() {
  const searchParams = useSearchParams()
  const [user, setUser] = React.useState<User | null>(null)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [votes, setVotes] = React.useState<Record<string, string>>({})
  const [hasSubmitted, setHasSubmitted] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [showLoginDialog, setShowLoginDialog] = React.useState(false)
  const [playingVideo, setPlayingVideo] = React.useState<{
    videoId: string
    title: string
    videoSource?: string
    videoUrl?: string
  } | null>(null)
  const [discordUsername, setDiscordUsername] = React.useState("")
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      const discordUserParam = searchParams.get("discord_user")
      const errorParam = searchParams.get("error")

      if (errorParam) {
        console.error("Discord OAuth error:", errorParam)
        window.history.replaceState({}, "", "/awards")
      }

      if (discordUserParam) {
        try {
          const discordData = JSON.parse(decodeURIComponent(discordUserParam))
          const discordUsername = discordData.globalName || discordData.username
          const discordId = discordData.id

          if (typeof window !== "undefined") {
            const storedNames = localStorage.getItem("awards-users-display-names")
            const displayNames = storedNames ? JSON.parse(storedNames) : {}
            displayNames[discordId] = discordUsername
            localStorage.setItem("awards-users-display-names", JSON.stringify(displayNames))
          }

          if (checkIfUserExists(discordUsername)) {
            const allVotes = getAllVotesData()
            let existingUserId = ""
            Object.keys(allVotes).forEach((userId) => {
              const parts = userId.split("-")
              if (parts.length >= 2) {
                const username = parts.slice(1, -1).join("-")
                if (username.toLowerCase() === discordUsername.toLowerCase()) {
                  existingUserId = userId
                }
              }
            })

            if (existingUserId) {
              const existingUser: User = {
                id: existingUserId,
                name: discordUsername,
                provider: "Discord",
                hasVoted: false,
              }
              setCurrentUser(existingUser)
              setUser(existingUser)

              const existingVotes = getUserVotes(existingUserId)
              if (existingVotes) {
                setVotes(existingVotes)
              }

              window.history.replaceState({}, "", "/awards")
              setIsLoading(false)
              return
            }
          }

          const newUser: User = {
            id: `discord-${discordData.id}-${Date.now()}`,
            name: discordUsername,
            provider: "Discord",
            hasVoted: false,
          }
          setCurrentUser(newUser)
          setUser(newUser)

          await sendDiscordLoginNotification(discordUsername)

          window.history.replaceState({}, "", "/awards")
        } catch (err) {
          console.error("Failed to parse Discord user data:", err)
        }
      } else {
        const currentUser = getCurrentUser()
        setUser(currentUser)

        if (currentUser) {
          const existingVotes = getUserVotes(currentUser.id)
          if (existingVotes) {
            setVotes(existingVotes)
            setHasSubmitted(currentUser.hasVoted)
          }
        } else {
          setShowLoginDialog(true)
        }
      }

      const cats = await getCategories()
      setCategories(cats)
      setIsLoading(false)
    }

    loadData()

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [searchParams])

  const handleDiscordOAuth = () => {
    window.location.href = "/api/auth/discord"
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setUser(null)
    setVotes({})
    setHasSubmitted(false)
    setShowLoginDialog(true)
  }

  const handleVote = (categoryId: string, nomineeId: string) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }
    if (hasSubmitted) return

    setVotes((prev) => ({
      ...prev,
      [categoryId]: nomineeId,
    }))
  }

  const handleSubmitClick = () => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    const categoriesWithNominees = categories.filter((cat) => cat.nominees.length > 0)
    if (Object.keys(votes).length < categoriesWithNominees.length) {
      alert(`Please vote in all ${categoriesWithNominees.length} categories before submitting!`)
      return
    }

    setShowSubmitDialog(true)
  }

  const confirmSubmit = () => {
    if (!user) return

    saveVotes(user.id, votes)
    setHasSubmitted(true)
    setShowSubmitDialog(false)
  }

  const votedCount = Object.keys(votes).length
  const categoriesWithNominees = categories.filter((cat) => cat.nominees.length > 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(220, 38, 38, 0.3) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/5" />

        <Dialog
          open={showLoginDialog}
          onOpenChange={(open) => {
            if (!open) {
              window.location.href = "/"
            }
            setShowLoginDialog(open)
          }}
        >
          <DialogContent className="bg-gradient-to-br from-zinc-900 to-black border-red-600/30 text-white max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <Trophy className="w-12 h-12 text-red-500 animate-pulse" />
              </div>
              <DialogTitle className="text-3xl text-center bg-gradient-to-r from-red-300 via-red-500 to-red-300 bg-clip-text text-transparent font-bold">
                Doza Awards 2025
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Button
                onClick={handleDiscordOAuth}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-6 shadow-lg shadow-[#5865F2]/20 transition-all hover:shadow-[#5865F2]/40 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Sign in with Discord
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white relative">
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(220, 38, 38, 0.3) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/5 pointer-events-none z-0" />

      <div className="relative z-10">
        <header
          className={`fixed top-0 z-50 w-full transition-all duration-300 ${
            isScrolled ? "bg-black/90 backdrop-blur-md" : "bg-gradient-to-b from-black/80 to-transparent"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-8 md:px-16 h-24">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="hover:bg-red-600/10 border border-red-600/20">
                  <ArrowLeft className="w-5 h-5 text-red-400" />
                </Button>
              </Link>
              <Link href="/">
                <div className="relative h-8 w-24">
                  <Image src="/images/doza-logo.png" alt="DOZA" fill className="object-contain" />
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-full px-4 py-2">
                <Trophy className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-300">
                  {votedCount}/{categoriesWithNominees.length}
                </span>
              </div>
              <span className="text-sm font-medium text-red-300 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/30">
                {user ? user.name : "Guest"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="hover:bg-red-600/20 border border-red-600/20"
              >
                <LogOut className="w-5 h-5 text-red-400" />
              </Button>
            </div>
          </div>
        </header>

        <div className="relative w-full aspect-[21/9] min-h-[300px] max-h-[500px] flex items-center justify-center overflow-hidden mt-24">
          <div className="absolute inset-0">
            <Image
              src="/doza-awards-banner.png"
              alt="DOZA Awards 2025"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
        </div>

        {hasSubmitted && (
          <div className="sticky top-32 z-40 mx-auto max-w-md px-4 animate-in slide-in-from-top duration-500 mt-8">
            <Card className="bg-gradient-to-r from-green-600 to-emerald-600 border-green-400 shadow-xl shadow-green-500/20">
              <CardContent className="flex items-center gap-2 p-4">
                <Check className="w-5 h-5 text-white" />
                <span className="font-bold text-white">Voted Successfully!</span>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="container mx-auto px-4 md:px-16 py-12 space-y-20">
          {categoriesWithNominees.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-20 h-20 text-red-600 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-red-300 to-red-500 bg-clip-text text-transparent mb-3">
                Nominees Coming Soon
              </h2>
              <p className="text-gray-400 text-lg">The awards ceremony is being prepared. Check back soon!</p>
            </div>
          ) : (
            categories.map((category) => {
              if (category.nominees.length === 0) return null

              const selectedNominee = votes[category.id]

              return (
                <div key={category.id} className="space-y-8">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-500" />
                      <Trophy className="w-6 h-6 text-red-500" />
                      <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-500" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-300 via-red-500 to-red-300 bg-clip-text text-transparent">
                      {category.name}
                    </h2>
                    <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto">{category.description}</p>
                  </div>

                  <div
                    className={`grid gap-6 mx-auto ${
                      category.nominees.length === 1
                        ? "grid-cols-1 max-w-md"
                        : category.nominees.length === 2
                          ? "grid-cols-1 md:grid-cols-2 max-w-3xl"
                          : category.nominees.length === 3
                            ? "grid-cols-1 md:grid-cols-3 max-w-4xl"
                            : category.nominees.length === 4
                              ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-4 max-w-5xl"
                              : category.nominees.length === 5
                                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-6xl"
                                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6 max-w-7xl"
                    }`}
                  >
                    {category.nominees.map((nominee) => {
                      const isSelected = selectedNominee === nominee.id
                      const isDisabled = hasSubmitted

                      return (
                        <div key={nominee.id} className="space-y-3">
                          <button
                            onClick={() =>
                              setPlayingVideo({
                                videoId: nominee.videoId,
                                title: nominee.title,
                                videoSource: nominee.videoSource,
                                videoUrl: nominee.videoUrl,
                              })
                            }
                            className="group relative w-full transition-all duration-300"
                          >
                            <div
                              className={`relative aspect-video rounded-xl overflow-hidden transition-all duration-300 ring-2 ${
                                isSelected
                                  ? "ring-red-500 shadow-xl shadow-red-500/30"
                                  : "ring-zinc-800 group-hover:ring-red-400/50"
                              } group-hover:scale-105`}
                            >
                              {getThumbnailUrl(nominee) ? (
                                <Image
                                  src={getThumbnailUrl(nominee) || "/placeholder.svg"}
                                  alt={nominee.title}
                                  fill
                                  className="object-cover transition-all duration-300 brightness-75 group-hover:brightness-100"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                                  <Film className="w-16 h-16 text-zinc-600" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <div className="bg-red-500/20 backdrop-blur-sm rounded-full p-4 border-2 border-red-400 shadow-lg shadow-red-500/50">
                                  <Play className="w-8 h-8 text-red-300" fill="currentColor" />
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 shadow-lg animate-pulse">
                                  <Check className="w-5 h-5" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                          </button>
                          <div className="space-y-2">
                            <p className="text-sm font-bold line-clamp-2 text-white">{nominee.title}</p>
                            <p className="text-xs text-red-400/70 font-medium">{nominee.channelName}</p>
                            <Button
                              onClick={() => handleVote(category.id, nominee.id)}
                              disabled={isDisabled}
                              className={`w-full transition-all duration-300 font-bold shadow-lg ${
                                isSelected
                                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-500/30 border border-green-400/30"
                                  : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-500/20 border border-red-400/30 hover:shadow-red-500/40"
                              } ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" strokeWidth={3} />
                                  Voted
                                </>
                              ) : (
                                <>
                                  <Trophy className="w-4 h-4 mr-2" />
                                  Vote
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
          <DialogContent className="bg-black border-red-600/30 text-white max-w-4xl w-full p-0">
            {playingVideo && (
              <div className="aspect-video w-full">
                {(!playingVideo.videoSource || playingVideo.videoSource === "youtube") &&
                playingVideo.videoId &&
                !playingVideo.videoId.startsWith("file-") &&
                !playingVideo.videoId.startsWith("other-") &&
                !playingVideo.videoId.startsWith("insta-") &&
                !playingVideo.videoId.startsWith("tiktok-") &&
                !playingVideo.videoId.startsWith("gdrive-") &&
                !playingVideo.videoId.startsWith("medal-") ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${playingVideo.videoId}?autoplay=1`}
                    title={playingVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                ) : playingVideo.videoUrl ? (
                  <video
                    src={playingVideo.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full rounded-lg bg-black object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-zinc-900 rounded-lg p-8">
                    <p className="text-lg text-gray-300 text-center">Video URL not available</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {categoriesWithNominees.length > 0 && (
          <div className="flex justify-center pb-20 pt-8">
            <Button
              onClick={handleSubmitClick}
              disabled={hasSubmitted || votedCount < categoriesWithNominees.length}
              size="lg"
              className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold text-xl px-16 py-8 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 border-2 border-red-400/50"
            >
              {hasSubmitted ? (
                <>
                  <Check className="w-7 h-7 mr-3" strokeWidth={3} />
                  Submitted!
                </>
              ) : (
                <>
                  <Trophy className="w-7 h-7 mr-3" />
                  Submit All Votes ({votedCount}/{categoriesWithNominees.length})
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="bg-gradient-to-br from-zinc-900 to-black border-red-600/30 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-12 h-12 text-red-500 animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Doza Awards 2025
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowSubmitDialog(false)}
              variant="outline"
              className="flex-1 bg-transparent border-red-600/30 text-white hover:bg-red-600/10 font-bold py-6"
            >
              Review Votes
            </Button>
            <Button
              onClick={confirmSubmit}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-6 shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/40"
            >
              <Check className="w-5 h-5 mr-2" />
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
