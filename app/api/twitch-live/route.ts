import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get("channel")

  if (!channel) {
    return NextResponse.json({ error: "Channel name required" }, { status: 400 })
  }

  try {
    // Use Twitch's unauthenticated endpoint to check if channel is live
    // This scrapes the channel page to check live status without requiring API keys
    const response = await fetch(`https://www.twitch.tv/${channel}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    const html = await response.text()

    // Check for live indicators in the HTML
    const isLive =
      html.includes('"isLiveBroadcast":true') ||
      (html.includes("isLiveBroadcast") && html.includes('"true"')) ||
      html.includes("live_user_") ||
      html.includes('"stream":{"id"')

    return NextResponse.json({ isLive, channel })
  } catch (error) {
    console.error("Error checking Twitch live status:", error)
    return NextResponse.json({ isLive: false, error: "Failed to check status" })
  }
}
