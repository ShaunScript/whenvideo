"use client"
import * as React from "react"
import { SiteHeader } from "@/components/site-header"

export default function AboutPage() {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

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

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <div className="flex items-center justify-center min-h-screen pt-20">
        <h1 className="text-6xl font-bold">About</h1>
      </div>
    </div>
  )
}
