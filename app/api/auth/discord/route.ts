import { NextResponse } from "next/server"

const CLIENT_ID = "1418035310092095659"

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/discord/callback`

  const discordAuthUrl =
    `https://discord.com/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=identify`

  return NextResponse.redirect(discordAuthUrl)
}
