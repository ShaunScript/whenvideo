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
const POINTS_EPIC = 25
const POINTS_LEGENDARY = 50

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

  const inventoryConfig = [
    { key: "boink_count", label: "Boinks", image: "/inventory-items/Boink_00000.png", price: 2 },
    { key: "cheeseburger_count", label: "Cheeseburgers", image: "/inventory-items/Burger_00000.png", price: 1 },
    { key: "happyJump_count", label: "Happy Jumps", image: "/inventory-items/SteamHappy_00000.png", price: 2 },
    { key: "kebab_count", label: "Kebabs", image: "/inventory-items/Kebab_00000.png", price: 2 },
    { key: "miku_count", label: "Mikus", image: "/inventory-items/Miku_00000.png", price: 3 },
    { key: "mikuShoots_count", label: "Miku Shoots", image: "/inventory-items/MikuShoots_00000.png", price: 14 },
    { key: "monster_count", label: "Monsters", image: "/inventory-items/Monster_00000.png", price: 2 },
    { key: "nugget_count", label: "Nuggets", image: "/inventory-items/Nugget_00000.png", price: 1 },
    { key: "rocky_count", label: "Rockys", image: "/inventory-items/Rocky_00000.png", price: 3 },
    { key: "wings_opened", label: "Wings", image: "/inventory-items/Wings_00000.png", price: 3 },
    { key: "wumpa_count", label: "Wumpas", image: "/inventory-items/Wumpa_00000.png", price: 1 },
    { key: "candy_count", label: "Candy", image: "/inventory-items/Candy_00000.png", price: 18 },
    { key: "flashbang_count", label: "Flashbangs", image: "/inventory-items/Flashbang_00000.png", price: 24 },
    { key: "timeout_count", label: "Timeouts", image: "/inventory-items/timeout_00000.png", price: 10 },
    { key: "nuke_count", label: "Nukes", image: "/inventory-items/Nuke_00000.png", price: 66 },
    { key: "taxRefund_count", label: "Tax Refunds", image: "/inventory-items/TAX_00000.png", price: 50 },
    { key: "unVip_count", label: "INVips", image: "/inventory-items/INVIP_00000.png", price: 32 },
    { key: "vip_count", label: "VIPs", image: "/inventory-items/VIP_00000.png", price: 100 },
  ]

  const inventoryItems = inventoryConfig
    .map((item) => ({
      ...item,
      value: row?.inventory?.[item.key] ?? 0,
    }))
    .filter((item) => item.value > 0)

  const rewards = inventoryConfig.reduce((acc, item) => {
    const count = row?.inventory?.[item.key] ?? 0
    return acc + count * item.price
  }, 0)
  const caseCost = (row?.opens ?? 0) * 5
  const profit = rewards - caseCost
  const profitColor = profit >= 0 ? "text-green-400" : "text-red-400"
  const profitGlow = profit >= 0
    ? "drop-shadow-[0_0_12px_rgba(34,197,94,0.75)]"
    : "drop-shadow-[0_0_12px_rgba(239,68,68,0.75)]"
  const profitLabel = `${profit >= 0 ? "+" : "-"}$${Math.abs(profit)}`

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="pt-24 px-4 max-w-5xl mx-auto">
        <div className="flex flex-col items-center gap-3 mb-6 text-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-medium tracking-[0.04em] uppercase">
              {row ? `${row.userName} ` : ""}
              <span className={`${profitColor} ${profitGlow}`}>{profitLabel}</span> Inventory
            </h1>
          </div>
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

            <div>
              <div className="text-xl font-semibold text-gray-200 mb-6">Inventory</div>
              {inventoryItems.length === 0 ? (
                <div className="text-gray-500">No items yet</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 justify-items-center">
                  {inventoryItems.map((item) => (
                    <div key={item.key} className="flex flex-col items-center text-center">
                      <img
                        src={item.image}
                        alt={item.label}
                        className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 object-contain"
                      />
                      <div className="mt-3 text-sm sm:text-base font-medium text-white">{item.label}</div>
                      <div className="text-lg sm:text-xl font-semibold text-white">{item.value}</div>
                    </div>
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
