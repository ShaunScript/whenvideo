import { NextResponse } from "next/server"
import path from "path"
import fs from "fs/promises"

export const runtime = "nodejs"

const ALLOWED_EXTENSIONS = [".ttf", ".otf", ".oft", ".woff", ".woff2"]
const MAX_BYTES = 15 * 1024 * 1024

const FONT_DIR = path.join(process.cwd(), "public", "featured-fonts")

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function GET() {
  try {
    await fs.mkdir(FONT_DIR, { recursive: true })
    const files = await fs.readdir(FONT_DIR)
    const fonts = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase()
        return ALLOWED_EXTENSIONS.includes(ext)
      })
      .map((file) => {
        const ext = path.extname(file)
        const baseName = path.basename(file, ext)
        return {
          name: baseName,
          fileName: file,
          url: `/featured-fonts/${file}`,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ fonts })
  } catch (e) {
    console.error("[api/admin/more/featured-fonts] error:", e)
    return NextResponse.json({ fonts: [] }, { status: 500 })
  }
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
      return NextResponse.json({ success: false, error: "File too large (max 15MB)" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    await fs.mkdir(FONT_DIR, { recursive: true })

    const safeName = sanitizeFileName(file.name)
    const filename = `${Date.now()}-${safeName}`
    const filepath = path.join(FONT_DIR, filename)

    await fs.writeFile(filepath, buffer)

    const baseName = path.basename(filename, ext)
    return NextResponse.json({
      success: true,
      font: { name: baseName, fileName: filename, url: `/featured-fonts/${filename}` },
    })
  } catch (e) {
    console.error("[api/admin/more/featured-fonts] error:", e)
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
  }
}
