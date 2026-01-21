import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 })
    }

    const allowed = [".mp4", ".webm", ".mov", ".m4v"]
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Allowed: ${allowed.join(", ")}` },
        { status: 400 },
      )
    }

    // You can change this limit
    const maxBytes = 250 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json({ success: false, error: "File too large" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "more-uploads")
    await fs.mkdir(uploadDir, { recursive: true })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filename = `${Date.now()}-${safeName}`
    const filepath = path.join(uploadDir, filename)

    await fs.writeFile(filepath, buffer)

    return NextResponse.json({
      success: true,
      url: `/more-uploads/${filename}`,
      filename,
    })
  } catch (e) {
    console.error("[api/admin/more/upload] error:", e)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}
