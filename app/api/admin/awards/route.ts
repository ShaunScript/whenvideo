import { NextResponse } from "next/server"
import { pg } from "@/lib/db"

export const runtime = "nodejs"

/**
 * GET /api/admin/awards
 * Returns all categories
 */
export async function GET() {
  try {
    const result = await pg.query(
      `SELECT categories
       FROM awards_categories
       LIMIT 1`
    )

    return NextResponse.json({
      categories: result.rows[0]?.categories ?? [],
    })
  } catch (error) {
    console.error("Failed to fetch awards categories:", error)
    return NextResponse.json({ categories: [] }, { status: 500 })
  }
}

/**
 * POST /api/admin/awards
 * Saves categories
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { categories } = body

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: "Invalid categories data" }, { status: 400 })
    }

    await pg.query(
      `
      INSERT INTO awards_categories (id, categories)
      VALUES (1, $1)
      ON CONFLICT (id)
      DO UPDATE SET categories = EXCLUDED.categories
      `,
      [JSON.stringify(categories)]
    )

    return NextResponse.json({
      success: true,
      message: "Categories saved successfully",
    })
  } catch (error) {
    console.error("Failed to save categories:", error)
    return NextResponse.json({ error: "Failed to save categories" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/awards
 * Clears all categories
 */
export async function PATCH() {
  try {
    await pg.query(`UPDATE awards_categories SET categories = '[]' WHERE id = 1`)
    return NextResponse.json({
      success: true,
      message: "All categories cleared",
    })
  } catch (error) {
    console.error("Failed to clear categories:", error)
    return NextResponse.json({ error: "Failed to clear categories" }, { status: 500 })
  }
}
