import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "DØZA",
  description: "DØZA PRODUCTION",
  openGraph: {
    title: "DOZA",
    description: "DOZA PRODUCTION",
    images: [
      {
        url: "/images/doza-og.png",
        width: 1200,
        height: 630,
        alt: "DOZA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DOZA",
    description: "DOZA PRODUCTION",
    images: ["/images/doza-og.png"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  )
}
