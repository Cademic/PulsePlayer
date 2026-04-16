import { getPool } from "@/lib/db";

export interface RecentSearchRow {
  query: string;
  searchedAt: string;
}

export async function listRecentSearchesForUser(
  userId: string
): Promise<RecentSearchRow[]> {
  const result = await getPool().query<{
    query: string;
    searched_at: string;
  }>(
    `SELECT query, searched_at
     FROM user_recent_searches
     WHERE user_id = $1::uuid
     ORDER BY searched_at DESC
     LIMIT 5`,
    [userId]
  );
  return result.rows.map((row) => ({
    query: row.query,
    searchedAt: row.searched_at,
  }));
}

export async function upsertRecentSearchForUser(
  userId: string,
  rawQuery: string
): Promise<void> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return;
  }

  await getPool().query(
    `INSERT INTO user_recent_searches (user_id, query, query_normalized, searched_at)
     VALUES ($1::uuid, $2::varchar, lower($2::varchar), now())
     ON CONFLICT (user_id, query_normalized)
     DO UPDATE SET
       query = EXCLUDED.query,
       searched_at = EXCLUDED.searched_at`,
    [userId, query]
  );

  await getPool().query(
    `DELETE FROM user_recent_searches
     WHERE user_id = $1::uuid
       AND id NOT IN (
         SELECT id
         FROM user_recent_searches
         WHERE user_id = $1::uuid
         ORDER BY searched_at DESC, id DESC
         LIMIT 5
       )`,
    [userId]
  );
}

export async function deleteRecentSearchForUser(
  userId: string,
  rawQuery: string
): Promise<void> {
  const query = rawQuery.trim();
  if (!query) {
    return;
  }
  await getPool().query(
    `DELETE FROM user_recent_searches
     WHERE user_id = $1::uuid
       AND query_normalized = lower($2::varchar)`,
    [userId, query]
  );
}
