"use client"

import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/site-header"

type LeaderboardRow = {
  userId: string
  userName: string
  score: number
  opens: number
  common: number
  epic: number
  legendary: number
}

const POINTS_COMMON = 5
const POINTS_EPIC = 15
const POINTS_LEGENDARY = 25

export default function TwitchStatsPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const sortedRows = [...rows]
    .filter((row) => row.userName.toLowerCase() !== "dozaproduction")
    .sort((a, b) => {
    const aScore = a.common * POINTS_COMMON + a.epic * POINTS_EPIC + a.legendary * POINTS_LEGENDARY
    const bScore = b.common * POINTS_COMMON + b.epic * POINTS_EPIC + b.legendary * POINTS_LEGENDARY
    return bScore - aScore
    })

  const filteredRows = sortedRows.filter((row) =>
    row.userName.toLowerCase().includes(query.trim().toLowerCase())
  )

  const topRows = filteredRows.slice(0, 20)

  const rankByUserId = new Map(sortedRows.map((row, idx) => [row.userId, idx + 1]))

  const totals = rows.reduce(
    (acc, row) => {
      acc.opens += row.opens
      acc.epic += row.epic
      acc.legendary += row.legendary
      return acc
    },
    { opens: 0, epic: 0, legendary: 0 }
  )

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/case-stats/leaderboard", {
          cache: "no-store",
        })

        if (!res.ok) throw new Error("Failed to load leaderboard")

        const data = await res.json()
        setRows(data.rows ?? [])
      } catch (err) {
        setError("Could not load case leaderboard")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6 tracking-tight">Case Leaderboard</h1>

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Total Cases Opened</div>
              <div className="text-2xl font-semibold mt-1">{totals.opens}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Total Epic Cases</div>
              <div className="text-2xl font-semibold mt-1">{totals.epic}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Total Legendary Cases</div>
              <div className="text-2xl font-semibold mt-1">{totals.legendary}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          </div>
        )}

        {error && <div className="text-red-400 text-center py-12">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <div className="text-gray-400 text-center py-12">No case data yet</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username..."
              className="w-full md:w-80 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-right">Cash</th>
                  <th className="px-4 py-3 text-center">Cases Opened</th>
                  <th className="px-4 py-3 text-right">C</th>
                  <th className="px-4 py-3 text-right">E</th>
                  <th className="px-4 py-3 text-right">L</th>
                  <th className="px-4 py-3 text-left">Inventory</th>
                </tr>
              </thead>

              <tbody>
                {topRows.map((row) => {
                  const dollars =
                    row.common * POINTS_COMMON + row.epic * POINTS_EPIC + row.legendary * POINTS_LEGENDARY
                  const rank = rankByUserId.get(row.userId) ?? 0
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""
                  const nameClass =
                    rank === 1 ? "text-yellow-300" : rank === 2 ? "text-gray-300" : rank === 3 ? "text-amber-600" : ""

                  return (
                  <tr key={row.userId} className="border-t border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-gray-400">
                      {medal ? <span className="inline-flex align-middle">{medal}</span> : rank || "-"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${nameClass}`}>
                      {row.userName}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">${dollars}</td>
                    <td className="px-4 py-3 text-center">{row.opens}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{row.common}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{row.epic}</td>
                    <td className="px-4 py-3 text-right text-yellow-400">{row.legendary}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/twitch-stats/${row.userId}`}
                        className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
