import { type NextRequest, NextResponse } from "next/server"

const CLIENT_ID = "1418035310092095659"

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const REDIRECT_URI = `${origin}/api/auth/discord/callback`

  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  if (error) return NextResponse.redirect(`${origin}/awards?error=access_denied`)
  if (!code) return NextResponse.redirect(`${origin}/awards?error=no_code`)

  const clientSecret = process.env.DISCORD_CLIENT_SECRET
  if (!clientSecret) return NextResponse.redirect(`${origin}/awards?error=config_error`)

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text())
      return NextResponse.redirect(`${origin}/awards?error=token_error`)
    }

    const tokenData = await tokenResponse.json()

    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userResponse.ok) {
      console.error("User fetch failed:", await userResponse.text())
      return NextResponse.redirect(`${origin}/awards?error=user_error`)
    }

    const userData = await userResponse.json()

    const userInfo = {
      id: userData.id,
      username: userData.username,
      globalName: userData.global_name || userData.username,
      avatar: userData.avatar,
    }

    const encodedUser = encodeURIComponent(JSON.stringify(userInfo))
    return NextResponse.redirect(`${origin}/awards?discord_user=${encodedUser}`)
  } catch (err) {
    console.error("Discord OAuth error:", err)
    return NextResponse.redirect(`${origin}/awards?error=oauth_error`)
  }
}
