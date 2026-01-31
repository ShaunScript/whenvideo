"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TwitchLiveIndicator } from "@/components/twitch-live-indicator"
import { usePathname } from "next/navigation"

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
  const pathname = usePathname()
  const isSocialsPage = pathname === "/socials"

  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false)
  const [activeMobileNav, setActiveMobileNav] = React.useState("home")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname
      if (p === "/") setActiveMobileNav("home")
      else if (p === "/merch") setActiveMobileNav("merch")
      else if (p === "/twitch-stats") setActiveMobileNav("stats")
      else if (p === "/socials") setActiveMobileNav("socials")
    }
  }, [])

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0)
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
    if (window.location.pathname === "/") {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleVideosClick = (e: React.MouseEvent) => {
    e.preventDefault()

    if (window.location.pathname === "/") {
      const el = document.getElementById("movies") || document.getElementById("more")
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      onVideosClick?.()
      return
    }

    window.location.href = "/?scrollTo=movies"
  }

  const closeSearch = () => setIsSearchExpanded(false)

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
                priority
                className={`object-contain transition duration-200 ${
                  isSocialsPage ? "group-hover:brightness-50" : "group-hover:brightness-75"
                }`}
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

            {/* Socials text button removed */}
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
          {/* Mobile Socials pill removed */}

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* ✅ Social icons restored */}
          <div className="hidden md:flex items-center space-x-0.5 xl:space-x-1">
            <TwitchLiveIndicator channelName="dozaproduction" />

            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
              onClick={() => window.open("https://www.twitch.tv/dozaproduction", "_blank")}
              aria-label="Twitch"
            >
              <svg className="w-4 h-4 xl:w-4 xl:h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
              </svg>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
              onClick={() => window.open("https://www.patreon.com/dozaproduction", "_blank")}
              aria-label="Patreon"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
              </svg>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
              onClick={() => window.open("https://x.com/havesomedoza", "_blank")}
              aria-label="X"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
              onClick={() => window.open("https://www.instagram.com/doza.production", "_blank")}
              aria-label="Instagram"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-white/10 h-7 w-7 xl:h-8 xl:w-8"
              onClick={() => window.open("https://www.tiktok.com/@dozaproduction", "_blank")}
              aria-label="TikTok"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.308v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </Button>
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
