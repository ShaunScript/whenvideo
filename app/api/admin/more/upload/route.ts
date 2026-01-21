import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 })
    }

    // Validate extension
    const name = file.name || "upload.bin"
    const ext = name.toLowerCase().slice(name.lastIndexOf("."))
    const valid = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]
    if (!valid.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type ${ext}. Allowed: ${valid.join(", ")}` },
        { status: 400 },
      )
    }

    // Serverless-friendly limit
    const maxBytes = 50 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: "File too large. Max 50MB. Upload to YouTube for larger files." },
        { status: 400 },
      )
    }

    // Upload to Blob (public)
    const blob = await put(`more-uploads/${Date.now()}-${name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (err: any) {
    console.error("[more/upload] Failed:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Upload failed." },
      { status: 500 },
    )
  }
}
