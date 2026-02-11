"use client"

import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/site-header"

type UserInventory = {
  userId: string
  userName: string
  opens: number
  common: number
  epic: number
  legendary: number
  inventory?: Record<string, number>
  score: number
}

const POINTS_COMMON = 5
const POINTS_EPIC = 15
const POINTS_LEGENDARY = 25

export default function UserInventoryPage({ params }: { params: { userId: string } }) {
  const [row, setRow] = useState<UserInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/case-stats/user?userId=${encodeURIComponent(params.userId)}`, {
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load user inventory")

        const data = await res.json()
        setRow(data.row ?? null)
      } catch (err) {
        setError("Could not load inventory")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.userId])

  const inventoryEntries = Object.entries(row?.inventory ?? {})
    .filter(([, value]) => value > 0)
    .sort(([a], [b]) => a.localeCompare(b))

  const dollars =
    (row?.common ?? 0) * POINTS_COMMON +
    (row?.epic ?? 0) * POINTS_EPIC +
    (row?.legendary ?? 0) * POINTS_LEGENDARY

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="pt-24 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
            {row && <div className="text-gray-400 mt-1">{row.userName}</div>}
          </div>
          <a href="/twitch-stats" className="text-blue-300 hover:text-blue-200 underline underline-offset-2">
            Back to leaderboard
          </a>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          </div>
        )}

        {error && <div className="text-red-400 text-center py-12">{error}</div>}

        {!loading && !error && row && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Cash</div>
                <div className="text-2xl font-semibold mt-1">${dollars}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Cases Opened</div>
                <div className="text-2xl font-semibold mt-1">{row.opens}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Common</div>
                <div className="text-2xl font-semibold mt-1 text-blue-400">{row.common}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Epic</div>
                <div className="text-2xl font-semibold mt-1 text-purple-400">{row.epic}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Legendary</div>
                <div className="text-2xl font-semibold mt-1 text-yellow-400">{row.legendary}</div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-sm uppercase tracking-wide text-gray-400 mb-3">Items</div>
              {inventoryEntries.length === 0 ? (
                <div className="text-gray-500">No items yet</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inventoryEntries.map(([key, value]) => (
                    <span key={key} className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-sm">
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
