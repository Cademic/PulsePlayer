import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(appRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    process.env[key] = val;
  }
}

loadEnvLocal();

const connectionString =
  process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";

if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const tableCheck = await client.query(
    "SELECT to_regclass('public.user_recent_searches') AS table_name"
  );
  console.log("table:", tableCheck.rows[0]?.table_name ?? null);

  const indexCheck = await client.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'user_recent_searches'
     ORDER BY indexname`
  );
  console.log("indexes:", indexCheck.rows.map((r) => r.indexname));

  const userRes = await client.query("SELECT id FROM users LIMIT 1");
  const userId = userRes.rows[0]?.id;
  if (!userId) {
    console.log("No users found; skipping row-behavior verification.");
    process.exit(0);
  }

  await client.query("BEGIN");
  await client.query("DELETE FROM user_recent_searches WHERE user_id = $1::uuid", [
    userId,
  ]);

  const testQueries = ["rock", "jazz", "metal", "house", "funk", "blues", "jazz"];
  for (const q of testQueries) {
    await client.query(
      `INSERT INTO user_recent_searches (user_id, query, query_normalized, searched_at)
       VALUES ($1::uuid, $2::varchar, lower($2::varchar), now())
       ON CONFLICT (user_id, query_normalized)
       DO UPDATE SET
         query = EXCLUDED.query,
         searched_at = EXCLUDED.searched_at`,
      [userId, q]
    );
    await client.query(
      `DELETE FROM user_recent_searches
       WHERE user_id = $1::uuid
         AND id NOT IN (
           SELECT id
           FROM user_recent_searches
           WHERE user_id = $1::uuid
           ORDER BY searched_at DESC
           LIMIT 5
         )`,
      [userId]
    );
  }

  const rows = await client.query(
    `SELECT query
     FROM user_recent_searches
     WHERE user_id = $1::uuid
     ORDER BY searched_at DESC`,
    [userId]
  );
  console.log("recent queries after test:", rows.rows.map((r) => r.query));
  console.log("row count:", rows.rowCount);

  await client.query("ROLLBACK");
} catch (error) {
  console.error(error);
  try {
    await client.query("ROLLBACK");
  } catch {}
  process.exit(1);
} finally {
  await client.end();
}
