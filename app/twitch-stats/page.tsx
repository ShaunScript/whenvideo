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
  inventory?: Record<string, number>
}

export default function TwitchStatsPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const inventoryPrices = [
    { key: "boink_count", altKeys: ["boink"], price: 2 },
    { key: "cheeseburger_count", price: 1 },
    { key: "happyJump_count", price: 2 },
    { key: "kebab_count", price: 2 },
    { key: "miku_count", price: 3 },
    { key: "mikuShoots_count", price: 14 },
    { key: "monster_count", price: 2 },
    { key: "nugget_count", price: 1 },
    { key: "rocky_count", price: 3 },
    { key: "wings_count", altKeys: ["wings_opened"], price: 3 },
    { key: "wumpa_count", price: 1 },
    { key: "candy_count", price: 18 },
    { key: "flashbang_count", price: 24 },
    { key: "timeout_count", price: 10 },
    { key: "nuke_count", price: 66 },
    { key: "taxRefund_count", price: 50 },
    { key: "unVip_count", price: 32 },
    { key: "vip_count", price: 100 },
  ]

  const getInventoryValue = (row: LeaderboardRow, key: string, altKeys?: string[]) => {
    const inventory = row.inventory ?? {}
    const toNumber = (value: unknown) => {
      if (value === undefined || value === null) return 0
      const num = Number(value)
      return Number.isFinite(num) ? num : 0
    }
    const primary = inventory[key]
    if (primary !== undefined && primary !== null) return toNumber(primary)
    if (altKeys) {
      for (const altKey of altKeys) {
        const value = inventory[altKey]
        if (value !== undefined && value !== null) return toNumber(value)
      }
    }
    return 0
  }

  const profitForRow = (row: LeaderboardRow) => {
    const rewards = inventoryPrices.reduce((acc, item) => {
      const count = getInventoryValue(row, item.key, item.altKeys)
      return acc + count * item.price
    }, 0)
    const caseCost = (row.opens ?? 0) * 5
    return rewards - caseCost
  }

  const sortedRows = [...rows]
    .filter((row) => row.userName.toLowerCase() !== "dozaproduction")
    .sort((a, b) => {
    const aProfit = profitForRow(a)
    const bProfit = profitForRow(b)
    return bProfit - aProfit
    })

  const filteredRows = sortedRows.filter((row) =>
    row.userName.toLowerCase().includes(query.trim().toLowerCase())
  )

  const [page, setPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const pagedRows = filteredRows.slice(startIndex, startIndex + pageSize)

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

  useEffect(() => {
    setPage(1)
  }, [query])

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="pt-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-8xl font-normal uppercase mb-6 tracking-tight text-center">Case Leaderboard</h1>

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-400">Total Cases Opened</div>
              <div className="text-2xl font-semibold mt-1">{totals.opens}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-400">Total Epic Cases</div>
              <div className="text-2xl font-semibold mt-1">{totals.epic}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
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
          <>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-2 py-3 text-left w-20">Profit</th>
                  <th className="px-2 py-3 text-center w-28">Cases Opened</th>
                  <th className="px-2 py-3 text-right w-16">C</th>
                  <th className="px-4 py-3 text-right">E</th>
                  <th className="px-4 py-3 text-right">L</th>
                  <th className="px-4 py-3 text-center">Inventory</th>
                </tr>
              </thead>

              <tbody>
                {pagedRows.map((row) => {
                  const profit = profitForRow(row)
                  const profitLabel = `${profit >= 0 ? "+" : "-"}$${Math.abs(profit)}`
                  const profitClass = profit >= 0 ? "text-green-400" : "text-red-400"
                  const rank = rankByUserId.get(row.userId) ?? 0
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""
                  const nameClass =
                    rank === 1
                      ? "text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.9)]"
                      : rank === 2
                        ? "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.9)]"
                        : rank === 3
                          ? "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.9)]"
                          : ""

                  return (
                  <tr key={row.userId} className="border-t border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-gray-400 text-center w-10 align-middle">
                      {medal ? <span className="inline-flex align-middle">{medal}</span> : rank || "-"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${nameClass}`}>
                      {row.userName}
                    </td>
                    <td className={`px-2 py-3 text-left w-20 ${profitClass}`}>{profitLabel}</td>
                    <td className="px-2 py-3 text-center w-28">{row.opens}</td>
                    <td className="px-2 py-3 text-right text-blue-400 w-16">{row.common}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{row.epic}</td>
                    <td className="px-4 py-3 text-right text-yellow-400">{row.legendary}</td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`/twitch-stats/${row.userId}`}
                        className="inline-flex items-center justify-center rounded-lg bg-[#b83236] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8f2428]"
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
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                ←
              </button>
              <div className="text-sm text-gray-400">
                Page {safePage} of {totalPages}
              </div>
              <button
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
