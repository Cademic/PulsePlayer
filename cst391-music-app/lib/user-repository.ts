import { getPool } from "@/lib/db";

export interface AppUserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "user" | "admin";
}

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Creates or updates a user from OAuth profile data and applies ADMIN_EMAILS promotion.
 */
export async function upsertUserFromOAuth(params: {
  email: string;
  name: string | null;
  image: string | null;
}): Promise<AppUserRow> {
  const emailLower = params.email.toLowerCase();
  const isListedAdmin = parseAdminEmails().includes(emailLower);

  const result = await getPool().query<AppUserRow>(
    `INSERT INTO users (email, name, image, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, users.name),
       image = COALESCE(EXCLUDED.image, users.image),
       role = CASE
         WHEN $5 THEN 'admin'::varchar
         ELSE users.role
       END
     RETURNING id, email, name, image, role`,
    [
      params.email,
      params.name,
      params.image,
      isListedAdmin ? "admin" : "user",
      isListedAdmin,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("upsertUserFromOAuth: no row returned");
  }
  return row;
}

export async function getUserById(id: string): Promise<AppUserRow | null> {
  const result = await getPool().query<AppUserRow>(
    `SELECT id, email, name, image, role FROM users WHERE id = $1::uuid`,
    [id]
  );
  return result.rows[0] ?? null;
}
