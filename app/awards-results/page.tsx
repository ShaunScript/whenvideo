"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Trophy, ArrowLeft, Crown, Medal, Award, Lock, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  getCategories,
  calculateResults,
  getAllVotesData,
  getVoterDetailsForCategory,
  removeVote,
  getThumbnailUrl,
  type Category,
  type Nominee,
} from "@/lib/awards-data"

export default function AwardsResultsPage() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [results, setResults] = React.useState<Record<string, Record<string, number>>>({})
  const [totalVotes, setTotalVotes] = React.useState(0)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [showAdminLogin, setShowAdminLogin] = React.useState(true)
  const [adminPassword, setAdminPassword] = React.useState("")
  const [expandedNominees, setExpandedNominees] = React.useState<Set<string>>(new Set())
  const [showAllVoters, setShowAllVoters] = React.useState(false)
  const [allVoters, setAllVoters] = React.useState<string[]>([])

  const refreshData = async () => {
    const loadedCategories = await getCategories()
    setCategories(loadedCategories)
    const calculatedResults = calculateResults()
    setResults(calculatedResults)
    const allVotes = getAllVotesData()
    setTotalVotes(Object.keys(allVotes).length)

    const voterNames: string[] = []
    const storedNames = typeof window !== "undefined" ? localStorage.getItem("awards-users-display-names") : null
    const displayNamesMap = storedNames ? JSON.parse(storedNames) : {}

    Object.keys(allVotes).forEach((userId) => {
      const parts = userId.split("-")
      if (parts.length >= 3 && parts[0] === "discord") {
        const discordId = parts[1]
        if (displayNamesMap[discordId]) {
          voterNames.push(displayNamesMap[discordId])
          return
        }
        if (parts.length >= 2) {
          const displayName = parts.slice(1, -1).join("-")
          if (displayName && !displayName.match(/^\d+$/)) {
            voterNames.push(displayName)
            return
          }
        }
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

  React.useEffect(() => {
    refreshData()
  }, [])

  const handleAdminLogin = () => {
    if (adminPassword === "AdmimD26") {
      setIsAdmin(true)
      setShowAdminLogin(false)
    } else {
      alert("Incorrect password")
    }
  }

  const handleRemoveVote = (categoryId: string, nomineeId: string, voterName: string) => {
    if (confirm(`Remove vote from ${voterName}?`)) {
      removeVote(categoryId, nomineeId, voterName)
      refreshData()
    }
  }

  const handleRemoveAllVotes = (voterName: string) => {
    if (confirm(`Remove ALL votes from ${voterName}? This cannot be undone.`)) {
      const allVotes = getAllVotesData()

      Object.keys(allVotes).forEach((userId) => {
        const parts = userId.split("-")
        if (parts.length >= 3 && parts[0] === "discord") {
          const discordId = parts[1]
          if (voterName === `User ${discordId.slice(0, 6)}...`) {
            delete allVotes[userId]
          }
        } else if (parts.length >= 2) {
          const username = parts.slice(1, -1).join("-")
          if (username === voterName) {
            delete allVotes[userId]
          }
        }
      })

      if (typeof window !== "undefined") {
        localStorage.setItem("awards-votes", JSON.stringify(allVotes))
      }
      refreshData()
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Lock className="w-5 h-5" />
                Admin Access Required
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                This page is only accessible to administrators. Please enter the admin password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <input
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <div className="flex gap-3">
                <Button onClick={handleAdminLogin} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  Login
                </Button>
                <Link href="/awards" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 hover:bg-zinc-800 bg-transparent text-white"
                  >
                    Back to Voting
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                Back to Voting
              </Button>
            </Link>
            <Link href="/awards-admin">
              <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent text-white">
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-yellow-950/20 to-black" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('/awards-background.jpg')] bg-cover bg-center" />
        </div>
        <div className="relative z-10 text-center px-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Trophy className="w-16 h-16 text-yellow-500 animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            AWARDS RESULTS
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-4">
            The community has spoken! Here are the winners based on {totalVotes} total{" "}
            {totalVotes === 1 ? "vote" : "votes"}.
          </p>
          <Button
            onClick={() => setShowAllVoters(!showAllVoters)}
            variant="outline"
            className="border-yellow-600/50 hover:bg-yellow-600/10 bg-transparent text-yellow-400 mt-4"
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
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 md:px-16 py-12 space-y-16">
        {categoriesWithNominees.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-400 mb-2">No Results Yet</h2>
            <p className="text-gray-500">Voting hasn't started yet. Check back later!</p>
          </div>
        ) : (
          categoriesWithNominees.map((category) => {
            const { nominee: winner, votes: winnerVotes } = getWinnerForCategory(category.id)
            const rankings = getRankingsForCategory(category.id)

            return (
              <div key={category.id} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl md:text-4xl font-bold text-white">{category.name}</h2>
                  <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">{category.description}</p>
                </div>

                {winner ? (
                  <div className="space-y-6">
                    {/* Winner Card */}
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
                            src={getThumbnailUrl(winner) || "/placeholder.svg"}
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
                          <h3 className="text-xl font-bold text-white mb-1">{winner.title}</h3>
                          <p className="text-gray-400">{winner.channelName}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Rankings */}
                    <div className="max-w-4xl mx-auto space-y-4">
                      <h3 className="text-xl font-bold text-center text-white mb-4">All Nominees</h3>
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
                                    src={getThumbnailUrl(ranking.nominee) || "/placeholder.svg"}
                                    alt={ranking.nominee.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div>
                                    <h4 className="font-semibold text-sm line-clamp-1 text-white">
                                      {ranking.nominee.title}
                                    </h4>
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
                                            onClick={() => handleRemoveVote(category.id, ranking.nominee.id, voterName)}
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
    </div>
  )
}
