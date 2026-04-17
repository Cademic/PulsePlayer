-- Stores up to 5 most recent searches per authenticated user.
-- Depends on users table from users_schema.sql.

CREATE TABLE IF NOT EXISTS user_recent_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query VARCHAR(255) NOT NULL,
  query_normalized VARCHAR(255) NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_recent_searches_user_query
  ON user_recent_searches (user_id, query_normalized);

CREATE INDEX IF NOT EXISTS ix_user_recent_searches_user_searched_at
  ON user_recent_searches (user_id, searched_at DESC);
