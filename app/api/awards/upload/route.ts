import { NextResponse } from "next/server"

// Video file uploads are disabled - please use YouTube links instead
// This endpoint is kept for backwards compatibility but returns an error
export async function POST() {
  return NextResponse.json(
    { 
      error: "Video file uploads are currently disabled. Please use a YouTube link instead.",
      suggestion: "Upload your video to YouTube and paste the link in the Video URL field."
    },
    { status: 503 }
  )
}
