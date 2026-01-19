"use client"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"

export default function TwitchStatsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
        <div className="max-w-2xl w-full px-4">
          <Image
            src="/images/image.png"
            alt="Page under development"
            width={800}
            height={800}
            className="w-full h-auto"
            priority
          />
        </div>
      </div>
    </div>
  )
}
