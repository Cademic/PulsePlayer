import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL or DATABASE_URL environment variable is not set."
  );
}

const pool = new Pool({
  connectionString,
});

export interface DatabaseHealth {
  isConnected: boolean;
}

export async function checkDatabaseConnection(): Promise<DatabaseHealth> {
  const result = await pool.query("SELECT 1 AS result");
  const isConnected = result.rows?.[0]?.result === 1;

  return { isConnected };
}

/** Returns the first artist from the albums table, or null if empty. */
export async function getFirstArtist(): Promise<string | null> {
  const result = await pool.query<{ artist: string }>(
    "SELECT artist FROM albums LIMIT 1"
  );
  const row = result.rows?.[0];
  return row?.artist ?? null;
}

export { pool };
