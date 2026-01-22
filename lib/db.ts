import { Pool } from "pg"

const globalForPg = globalThis as unknown as {
  pgPool?: Pool
}

export const pg =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pg
}
