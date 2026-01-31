"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TwitchLiveIndicator } from "@/components/twitch-live-indicator"

interface SiteHeaderProps {
  showTimer?: boolean
  timerData?: {
    days: number
    hours: number
    minutes: number
    seconds: number
  }
  isCompactMode?: boolean
  onVideosClick?: () => void
}

export function SiteHeader({ showTimer = false, timerData, isCompactMode = false, onVideosClick }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false)
  const [activeMobileNav, setActiveMobileNav] = React.useState("home")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname
      if (pathname === "/") setActiveMobileNav("home")
      else if (pathname === "/merch") setActiveMobileNav("merch")
      else if (pathname === "/twitch-stats") setActiveMobileNav("stats")
      else if (pathname === "/socials") setActiveMobileNav("socials")
    }
  }, [])

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  React.useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchExpanded])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isSearchExpanded && !target.closest(".search-container")) {
        setIsSearchExpanded(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSearchExpanded])

const handleHomeClick = (e: React.MouseEvent) => {
  // If already on home, smooth scroll to top instead of hard navigation
  if (window.location.pathname === "/") {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
}

const handleVideosClick = (e: React.MouseEvent) => {
  e.preventDefault()

  // If we're already on the homepage, smooth scroll to the Movies/More section
  if (window.location.pathname === "/") {
    // Prefer scrolling to a known anchor
    const el = document.getElementById("movies") || document.getElementById("more")
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })

    // Keep your existing hook if the homepage uses it (e.g., to switch focus)
    onVideosClick?.()
    return
  }

  // If we're on any other page, go to homepage and tell it what to scroll to
  window.location.href = "/?scrollTo=movies"
}

  const closeSearch = () => {
    setIsSearchExpanded(false)
  }

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? "bg-black/90 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="relative flex items-center justify-between px-3 py-3 md:py-4 md:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center space-x-3 md:space-x-4 lg:space-x-6">
          <Link href="/" onClick={handleHomeClick} className="group flex items-center flex-shrink-0">
            <div className="relative h-8 w-20 sm:h-9 sm:w-24 lg:h-10 lg:w-28">
              <Image
  src="/images/doza-logo.png"
  alt="DOZA"
  fill
  className="object-contain transition duration-200 group-hover:brightness-75"
  priority
/>

            </div>
          </Link>
          <nav className="hidden md:flex space-x-2 xl:space-x-4 items-center text-xs xl:text-sm">
            <button
              onClick={handleVideosClick}
              className="hover:text-gray-300 transition-colors flex items-center whitespace-nowrap"
            >
              Videos
            </button>
            <Link href="/merch" className="hover:text-gray-300 transition-colors flex items-center whitespace-nowrap">
              Merch
            </Link>
            <Link
              href="/twitch-stats"
              className="hover:text-gray-300 transition-colors flex items-center whitespace-nowrap"
            >
              Case & Stats
            </Link>
<Link
href="/socials"
className="relative px-2 xl:px-3 py-1 rounded-full bg-gradient-to-r from-red-600/20 to-red-500/20 border border-red-500/50 text-red-400 hover:from-red-600/30 hover:to-red-500/30 hover:text-red-300 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 font-semibold text-xs xl:text-sm whitespace-nowrap"
>
Socials
</Link>

          </nav>
        </div>

        {showTimer && timerData && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 group hidden sm:block">
            <div className="flex items-center gap-0.5 sm:gap-1 text-white font-mono text-xs sm:text-sm lg:text-base tracking-wider bg-black/50 px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 rounded-lg border border-white/30">
              <span className="font-bold">{String(timerData.days).padStart(2, "0")}</span>
              <span className="text-white/70">:</span>
              <span className="font-bold">{String(timerData.hours).padStart(2, "0")}</span>
              <span className="text-white/70">:</span>
              <span className="font-bold">{String(timerData.minutes).padStart(2, "0")}</span>
              <span className="text-white/70">:</span>
              <span className="font-bold">{String(timerData.seconds).padStart(2, "0")}</span>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black/60 text-white text-xs rounded-md border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              Days since the last upload
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white/20" />
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Awards button - visible only on mobile */}
<Link
href="/socials"
onClick={() => setActiveMobileNav("socials")}
className={`md:hidden px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
  activeMobileNav === "socials"
    ? "bg-red-600 text-white"
    : "bg-red-600/20 text-red-400 border border-red-500/50"
}`}
>
Socials
</Link>


          <Button
            size="icon"
            variant="ghost"
            className="md:hidden hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

<div className="hidden md:flex items-center space-x-0.5 xl:space-x-1">
<TwitchLiveIndicator channelName="dozaproduction" />
</div>


          <div className="search-container hidden md:flex items-center">
            <div
              className={`flex items-center bg-black/50 rounded-full transition-all duration-300 ${
                isSearchExpanded ? "w-36 xl:w-48 border border-gray-600" : "w-8 xl:w-10"
              }`}
            >
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-transparent h-8 w-8 xl:h-10 xl:w-10 flex-shrink-0 border border-gray-600 rounded-full"
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              >
                <Search className="w-4 h-4 xl:w-5 xl:h-5" />
              </Button>
              <Input
                ref={searchInputRef}
                placeholder="Search"
                className={`bg-transparent border-0 text-white placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 text-sm ${
                  isSearchExpanded ? "w-full opacity-100 px-2" : "w-0 opacity-0 px-0"
                }`}
              />
              {isSearchExpanded && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-white/10 h-8 w-8 xl:h-10 xl:w-10 flex-shrink-0"
                  onClick={closeSearch}
                >
                  <X className="w-3 h-3 xl:w-4 xl:h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSearchExpanded && (
        <div className="md:hidden bg-black/95 backdrop-blur-sm border-t border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Search videos..."
              className="flex-1 bg-black border-gray-700 text-white placeholder-gray-400"
            />
            <Button size="icon" variant="ghost" className="hover:bg-white/10" onClick={closeSearch}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
