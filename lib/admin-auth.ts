import "server-only"

import crypto from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const COOKIE_NAME = "admin_auth"
const SIGNING_CONTEXT = "admin-auth-v1"

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PANEL_PASSWORD
  if (!password) return null
  return password
}

function expectedCookieValue(password: string): string {
  // Stateless, signed cookie value. Rotates automatically when password changes.
  return crypto.createHmac("sha256", password).update(SIGNING_CONTEXT).digest("base64url")
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const password = getAdminPassword()
  if (!password) return false

  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value
  if (!value) return false

  return timingSafeEqualString(value, expectedCookieValue(password))
}

export async function requireAdminAuth(): Promise<NextResponse | null> {
  if (await isAdminAuthenticated()) return null
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function setAdminAuthCookie(): Promise<NextResponse> {
  const password = getAdminPassword()
  if (!password) {
    return NextResponse.json({ error: "Missing ADMIN_PANEL_PASSWORD" }, { status: 500 })
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, expectedCookieValue(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return NextResponse.json({ success: true })
}

export async function clearAdminAuthCookie(): Promise<NextResponse> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return NextResponse.json({ success: true })
}

export async function verifyAdminPassword(rawPassword: unknown): Promise<NextResponse> {
  const configured = getAdminPassword()
  if (!configured) {
    return NextResponse.json({ error: "Missing ADMIN_PANEL_PASSWORD" }, { status: 500 })
  }

  if (typeof rawPassword !== "string") {
    return NextResponse.json({ error: "Missing password" }, { status: 400 })
  }

  const ok = timingSafeEqualString(rawPassword, configured)
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  return await setAdminAuthCookie()
}
