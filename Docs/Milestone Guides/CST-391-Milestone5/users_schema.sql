-- Milestone 5: App users (OAuth) — run after pgcrypto extension and playlists exist.
-- Links playlists.owner_user_id to users.id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image VARCHAR(500),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Optional: enforce ownership FK (skip if playlists missing, duplicate constraint, or bad data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'playlists'
  ) THEN
    ALTER TABLE playlists
      ADD CONSTRAINT playlists_owner_user_id_users_fkey
      FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
