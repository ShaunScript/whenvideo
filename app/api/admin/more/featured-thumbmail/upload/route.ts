import { NextResponse } from "next/server"
import { writeFeaturedThumb } from "@/lib/featured-thumbnail-cache"

export const runtime = "nodejs"

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
const MAX_BYTES = 25 * 1024 * 1024 // 25MB

const mimeFromExt: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

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
      return NextResponse.json({ success: false, error: "File too large (max 25MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mime = mimeFromExt[ext] ?? "image/png"
    const dataUrl = `data:${mime};base64,${base64}`

    await writeFeaturedThumb({ thumbnailUrl: dataUrl })

    return NextResponse.json({ success: true, url: dataUrl })
  } catch (e) {
    console.error("[api/admin/more/featured-thumbmail/upload] error:", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 })
  }
}
