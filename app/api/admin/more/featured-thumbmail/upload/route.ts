import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

export const runtime = "nodejs"

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
const MAX_BYTES = 8 * 1024 * 1024 // 8MB

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 })
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "File too large (max 8MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), "public", "featured-uploads")
    await fs.mkdir(uploadDir, { recursive: true })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filename = `${Date.now()}-${safeName}`
    const filepath = path.join(uploadDir, filename)

    await fs.writeFile(filepath, buffer)

    return NextResponse.json({
      success: true,
      url: `/featured-uploads/${filename}`,
      filename,
    })
  } catch (e) {
    console.error("[api/admin/more/featured-thumbmail/upload] error:", e)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}
