import { kv } from "@vercel/kv"

const KEY = "more:videos"

export async function kvReadMoreVideos(): Promise<any[]> {
  const videos = await kv.get<any[]>(KEY)
  return Array.isArray(videos) ? videos : []
}

export async function kvWriteMoreVideos(videos: any[]): Promise<void> {
  await kv.set(KEY, videos)
}

export async function kvClearMoreVideos(): Promise<void> {
  await kv.del(KEY)
}
