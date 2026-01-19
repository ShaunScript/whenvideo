"use client"

import * as React from "react"

interface TwitchLiveIndicatorProps {
  channelName: string
}

export function TwitchLiveIndicator({ channelName }: TwitchLiveIndicatorProps) {
  const [isLive, setIsLive] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const response = await fetch(`/api/twitch-live?channel=${channelName}`)
        const data = await response.json()
        setIsLive(data.isLive)
      } catch (error) {
        console.error("Failed to check Twitch live status:", error)
        setIsLive(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkLiveStatus()
    // Check every 60 seconds
    const interval = setInterval(checkLiveStatus, 60000)
    return () => clearInterval(interval)
  }, [channelName])

  if (isLoading || !isLive) {
    return null
  }

  return (
    <a
      href={`https://www.twitch.tv/${channelName}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-red-500 bg-black/80 hover:bg-red-950/50 transition-colors cursor-pointer mr-2 shadow-[0_0_10px_2px_rgba(239,68,68,0.4),inset_0_0_10px_rgba(239,68,68,0.1)] animate-pulse"
    >
      {/* Pulsating LED dot */}
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_4px_rgba(239,68,68,0.6)]"></span>
      </span>
      {/* LIVE NOW text */}
      <span className="text-sm font-bold text-red-500 uppercase tracking-wider drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
        LIVE NOW
      </span>
    </a>
  )
}
