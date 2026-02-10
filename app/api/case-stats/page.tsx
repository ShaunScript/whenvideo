"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"

type LeaderboardRow = {
  userId: string
  userName: string
  score: number
  opens: number
  common: number
  rare: number
  epic: number
  legendary: number
}

export default function TwitchStatsPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <h1 className="text-3xl font-semibold mb-6 tracking-tight">
          Case Leaderboard
        </h1>

        {loading && (
          <div className="flex justify-center py-24">
            <Image
              src="/images/image.png"
              alt="Loading"
              width={400}
              height={400}
              className="opacity-70"
            />
          </div>
        )}

        {error && (
          <div className="text-red-400 text-center py-12">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-gray-400 text-center py-12">
            No case data yet
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Opens</th>
                  <th className="px-4 py-3 text-right">C</th>
                  <th className="px-4 py-3 text-right">R</th>
                  <th className="px-4 py-3 text-right">E</th>
                  <th className="px-4 py-3 text-right">L</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.userId}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {row.userName}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {row.score}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.opens}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {row.common}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400">
                      {row.rare}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-400">
                      {row.epic}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-400">
                      {row.legendary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}