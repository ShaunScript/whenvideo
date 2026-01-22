import { Pool } from "pg"

const globalForPg = globalThis as unknown as {
  pgPool?: Pool
}

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL / POSTGRES_URL env var. Set it in Vercel Project Settings → Environment Variables.",
  )
}

export const pg =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pg
}
