// lib/db.ts
import { Pool } from "pg"

const globalForPg = globalThis as unknown as {
  pgPool?: Pool
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

export const pg =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  })

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pg
