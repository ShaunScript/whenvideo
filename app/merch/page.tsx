"use client"
import { SiteHeader } from "@/components/site-header"

export default function MerchPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="flex items-center justify-center min-h-screen pt-20">
        <h1 className="text-6xl font-bold">Coming Soon</h1>
      </div>
    </div>
  )
}
