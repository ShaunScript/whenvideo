import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "data", "flappy-highscore.json")
export type HighScore = { score: number; name: string } | null

export async function readHighScore(): Promise<HighScore> {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, "utf8"))
  } catch {
    return null
  }
}

export async function writeHighScore(data: HighScore) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8")
}