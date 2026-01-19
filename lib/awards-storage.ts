"use client"

import type { Category } from "./awards-data"

export async function getAwardsCategories(): Promise<Category[]> {
  try {
    const response = await fetch("/api/admin/awards")
    const data = await response.json()
    return data.categories || []
  } catch (error) {
    console.error("Failed to get awards categories:", error)
    return []
  }
}

export async function saveAwardsCategories(categories: Category[]): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/awards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ categories }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to save awards categories:", error)
    return { success: false, message: "Failed to save categories" }
  }
}

export async function clearAwardsCategories(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/awards", {
      method: "PATCH",
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to clear awards categories:", error)
    return { success: false, message: "Failed to clear categories" }
  }
}
