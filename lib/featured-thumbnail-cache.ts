import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "data", "featured-thumbnail.json")

type Data = { videoId: string; thumbnailUrl: string } | null

export async function readFeaturedThumb(): Promise<Data> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function writeFeaturedThumb(data: Data) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8")
}