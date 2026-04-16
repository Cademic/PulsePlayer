import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";

export interface PlaylistSummaryRow {
  id: string;
  name: string;
  owner_user_id: string | null;
  created_at: Date;
  track_count: number;
}

export interface PlaylistTrackDetailRow {
  track_id: number;
  recording_mbid: string | null;
  track_title: string;
  album_id: number;
  album_title: string;
  artist: string;
  album_image: string | null;
  added_at: Date;
}

export async function listPlaylistsByOwner(
  ownerUserId: string
): Promise<PlaylistSummaryRow[]> {
  const result = await getPool().query<PlaylistSummaryRow>(
    `SELECT p.id, p.name, p.owner_user_id, p.created_at,
      COUNT(pt.track_id)::int AS track_count
     FROM playlists p
     LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
     WHERE p.owner_user_id = $1::uuid
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [ownerUserId]
  );
  return result.rows;
}

export async function listAllPlaylists(): Promise<PlaylistSummaryRow[]> {
  const result = await getPool().query<PlaylistSummaryRow>(
    `SELECT p.id, p.name, p.owner_user_id, p.created_at,
      COUNT(pt.track_id)::int AS track_count
     FROM playlists p
     LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at DESC`
  );
  return result.rows;
}

export async function insertPlaylist(
  name: string,
  ownerUserId: string
): Promise<PlaylistSummaryRow> {
  const result = await getPool().query<
    Omit<PlaylistSummaryRow, "track_count"> & { track_count?: number }
  >(
    `INSERT INTO playlists (name, owner_user_id)
     VALUES ($1, $2::uuid)
     RETURNING id, name, owner_user_id, created_at`,
    [name, ownerUserId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("insertPlaylist: no row returned");
  }
  return { ...row, track_count: 0 };
}

export async function getPlaylistSummaryById(
  id: string
): Promise<PlaylistSummaryRow | null> {
  const result = await getPool().query<PlaylistSummaryRow>(
    `SELECT p.id, p.name, p.owner_user_id, p.created_at,
      COUNT(pt.track_id)::int AS track_count
     FROM playlists p
     LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
     WHERE p.id = $1::uuid
     GROUP BY p.id`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getPlaylistTracksDetail(
  playlistId: string
): Promise<PlaylistTrackDetailRow[]> {
  const result = await getPool().query<PlaylistTrackDetailRow>(
    `SELECT t.id AS track_id, t.recording_mbid, t.title AS track_title, a.id AS album_id,
            a.title AS album_title, a.artist, a.image AS album_image,
            pt.added_at
     FROM playlist_tracks pt
     JOIN tracks t ON t.id = pt.track_id
     JOIN albums a ON a.id = t.album_id
     WHERE pt.playlist_id = $1::uuid
     ORDER BY pt.added_at ASC`,
    [playlistId]
  );
  return result.rows;
}

export async function deletePlaylistById(playlistId: string): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM playlists WHERE id = $1::uuid RETURNING id`,
    [playlistId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function trackExists(trackId: number): Promise<boolean> {
  const result = await getPool().query<{ id: number }>(
    `SELECT id FROM tracks WHERE id = $1`,
    [trackId]
  );
  return result.rows.length > 0;
}

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: number,
  client?: PoolClient
): Promise<void> {
  const runner = client ?? getPool();
  await runner.query(
    `INSERT INTO playlist_tracks (playlist_id, track_id)
     VALUES ($1::uuid, $2)`,
    [playlistId, trackId]
  );
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: number,
  client?: PoolClient
): Promise<number> {
  const runner = client ?? getPool();
  const result = await runner.query(
    `DELETE FROM playlist_tracks
     WHERE playlist_id = $1::uuid AND track_id = $2`,
    [playlistId, trackId]
  );
  return result.rowCount ?? 0;
}
