-- MusicBrainz integration: link local album/track rows to MB entities (nullable for legacy/manual rows).
-- Safe to re-run.

ALTER TABLE albums ADD COLUMN IF NOT EXISTS release_mbid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_albums_release_mbid
  ON albums (release_mbid)
  WHERE release_mbid IS NOT NULL;

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS recording_mbid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_recording_mbid
  ON tracks (recording_mbid)
  WHERE recording_mbid IS NOT NULL;
