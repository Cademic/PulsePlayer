/**
 * Applies Docs/Milestone Guides/CST-391-Milestone5/recent_searches_schema.sql
 * using POSTGRES_URL or DATABASE_URL from the environment or .env.local.
 *
 * Usage (from cst391-music-app folder): npm run db:recent-searches
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const repoRoot = path.join(__dirname, "..", "..");

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
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal();

const connectionString =
  process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";

if (!connectionString) {
  console.error(
    "Set POSTGRES_URL or DATABASE_URL (e.g. in .env.local) before running this script."
  );
  process.exit(1);
}

const sqlPath = path.join(
  repoRoot,
  "Docs",
  "Milestone Guides",
  "CST-391-Milestone5",
  "recent_searches_schema.sql"
);

if (!fs.existsSync(sqlPath)) {
  console.error("SQL file not found:", sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query(sql);
  console.log("Applied recent_searches_schema.sql successfully.");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
