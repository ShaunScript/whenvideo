import { NextResponse } from "next/server"

// In-memory storage for awards categories (persists during server session)
// For production, this should use a real database
let cachedCategories: any[] = []

export async function GET() {
  try {
    return NextResponse.json({ categories: cachedCategories })
  } catch (error) {
    console.error("Failed to fetch awards categories:", error)
    return NextResponse.json({ categories: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { categories } = body

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: "Invalid categories data" }, { status: 400 })
    }

    cachedCategories = categories
    return NextResponse.json({ success: true, message: "Categories saved successfully" })
  } catch (error) {
    console.error("Failed to save categories:", error)
    return NextResponse.json({ error: "Failed to save categories" }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    cachedCategories = []
    return NextResponse.json({ success: true, message: "All categories cleared from storage" })
  } catch (error) {
    console.error("Failed to clear categories:", error)
    return NextResponse.json({ error: "Failed to clear categories" }, { status: 500 })
  }
}
