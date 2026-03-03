import { promises as fs } from "fs"
import path from "path"

export type LeaderboardEntry = { name: string; score: number; ts: number }

const FILE_PATH = path.join(process.cwd(), "data", "flappy-leaderboard.json")
const MAX_ENTRIES = 10

export async function readLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8")
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function writeLeaderboard(entries: LeaderboardEntry[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true })
  await fs.writeFile(FILE_PATH, JSON.stringify(entries, null, 2), "utf8")
}

export async function submitLeaderboardEntry(score: number, name: string) {
  const entry: LeaderboardEntry = { score, name, ts: Date.now() }
  const existing = await readLeaderboard()
  const merged = [entry, ...existing]
    .filter((item) => Number.isFinite(item.score) && item.score > 0)
    .sort((a, b) => b.score - a.score || b.ts - a.ts)
    .slice(0, MAX_ENTRIES)

  await writeLeaderboard(merged)
  return merged
}
