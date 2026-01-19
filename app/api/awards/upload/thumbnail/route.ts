import { NextResponse } from "next/server"

// Thumbnail uploads are disabled - please use image URLs instead
export async function POST() {
  return NextResponse.json(
    { 
      error: "Thumbnail uploads are currently disabled. Please use an image URL instead.",
      suggestion: "Host your image on a service like Imgur and paste the direct URL."
    },
    { status: 503 }
  )
}
