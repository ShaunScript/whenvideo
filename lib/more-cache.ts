import fs from "fs/promises"
import path from "path"

export type MoreCache = {
  videos: any[]
  updatedAt: string
}

const CACHE_PATH = path.join(process.cwd(), "data", "more-cache.json")

async function ensureDataDir() {
  const dir = path.dirname(CACHE_PATH)
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {
    // ignore
  }
}

export async function readMoreCache(): Promise<MoreCache | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8")
    const parsed = JSON.parse(raw)
    if (!parsed?.videos || !Array.isArray(parsed.videos)) return null
    return parsed as MoreCache
  } catch {
    return null
  }
}

export async function writeMoreCache(videos: any[]): Promise<void> {
  await ensureDataDir()
  const payload: MoreCache = {
    videos,
    updatedAt: new Date().toISOString(),
  }

  // atomic write
  const tmp = `${CACHE_PATH}.tmp`
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), "utf8")
  await fs.rename(tmp, CACHE_PATH)
}

export async function clearMoreCache(): Promise<void> {
  try {
    await fs.unlink(CACHE_PATH)
  } catch {
    // ignore
  }
}
