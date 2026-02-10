import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "data", "featured-thumbnail.json")

type Data = { thumbnailUrl: string } | null

export async function readFeaturedThumb(): Promise<Data> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8")
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      // Backward compatibility: previously stored { videoId, thumbnailUrl }
      if ("thumbnailUrl" in parsed) {
        return { thumbnailUrl: (parsed as any).thumbnailUrl }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function writeFeaturedThumb(data: Data) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8")
}
