import { getPool } from "@/lib/db";
import { audioDbGet } from "@/lib/theaudiodb-client";
import { isValidUuid } from "@/lib/uuid";

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function parseYear(v: unknown): number {
  if (typeof v !== "string" || v.length < 4) return new Date().getFullYear();
  const y = parseInt(v.slice(0, 4), 10);
  return Number.isNaN(y) ? new Date().getFullYear() : y;
}

/** TheAudioDB often returns empty string instead of null. */
function audioDbText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export async function upsertAlbumFromAudioDb(albumExternalId: string): Promise<number> {
  // TheAudioDB album lookup by album id uses `m`, not `i`.
  const albumJson = await audioDbGet(`/album.php?m=${encodeURIComponent(albumExternalId)}`);
  const albumRoot = asRecord(albumJson);
  const albumArr = albumRoot?.album;
  if (!Array.isArray(albumArr) || albumArr.length === 0) {
    throw new Error("TheAudioDB album not found");
  }
  const album = asRecord(albumArr[0]);
  if (!album) throw new Error("Invalid TheAudioDB album payload");

  const title = typeof album.strAlbum === "string" ? album.strAlbum : "Untitled album";
  const artist = typeof album.strArtist === "string" ? album.strArtist : "Unknown artist";
  const year = parseYear(album.intYearReleased);
  const image = typeof album.strAlbumThumb === "string" ? album.strAlbumThumb : null;

  const tracksJson = await audioDbGet(`/track.php?m=${encodeURIComponent(albumExternalId)}`);
  const tracksRoot = asRecord(tracksJson);
  const tracksArr = Array.isArray(tracksRoot?.track) ? tracksRoot?.track : [];

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: number }>(
      "SELECT id FROM albums WHERE release_mbid = $1 LIMIT 1",
      [albumExternalId]
    );
    let albumId: number;
    if (existing.rows.length > 0) {
      albumId = existing.rows[0].id;
      await client.query(
        "UPDATE albums SET title = $1, artist = $2, year = $3, image = $4 WHERE id = $5",
        [title, artist, year, image, albumId]
      );
      await client.query("DELETE FROM tracks WHERE album_id = $1 AND recording_mbid IS NOT NULL", [
        albumId,
      ]);
    } else {
      const created = await client.query<{ id: number }>(
        "INSERT INTO albums (title, artist, year, image, description, release_mbid) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [title, artist, year, image, null, albumExternalId]
      );
      albumId = created.rows[0].id;
    }

    for (const t of tracksArr) {
      const track = asRecord(t);
      if (!track) continue;
      const trackExternalId = typeof track.idTrack === "string" ? track.idTrack : null;
      if (!trackExternalId) continue;
      const trackTitle = typeof track.strTrack === "string" ? track.strTrack : "Untitled track";
      const trackNoRaw = typeof track.intTrackNumber === "string" ? parseInt(track.intTrackNumber, 10) : 0;
      const trackNo = Number.isNaN(trackNoRaw) ? 0 : trackNoRaw;
      const lyrics = audioDbText(track.strTrackLyrics);
      const videoUrl = audioDbText(track.strMusicVid);
      const ex = await client.query<{ id: number }>(
        "SELECT id FROM tracks WHERE recording_mbid = $1 LIMIT 1",
        [trackExternalId]
      );
      if (ex.rows.length > 0) {
        await client.query(
          "UPDATE tracks SET album_id = $1, title = $2, number = $3, lyrics = $4, video_url = $5 WHERE id = $6",
          [albumId, trackTitle, trackNo, lyrics, videoUrl, ex.rows[0].id]
        );
      } else {
        await client.query(
          "INSERT INTO tracks (album_id, title, number, lyrics, video_url, recording_mbid) VALUES ($1,$2,$3,$4,$5,$6)",
          [albumId, trackTitle, trackNo, lyrics, videoUrl, trackExternalId]
        );
      }
    }

    await client.query("COMMIT");
    return albumId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertTrackFromAudioDb(trackExternalId: string): Promise<number> {
  const pool = getPool();
  const found = await pool.query<{ id: number }>(
    "SELECT id FROM tracks WHERE recording_mbid = $1 LIMIT 1",
    [trackExternalId]
  );
  if (found.rows.length > 0) return found.rows[0].id;

  const trackPath = isValidUuid(trackExternalId)
    ? `/track-mb.php?i=${encodeURIComponent(trackExternalId)}`
    : `/track.php?h=${encodeURIComponent(trackExternalId)}`;
  const trackJson = await audioDbGet(trackPath);
  const root = asRecord(trackJson);
  const tracks = root?.track;
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("Track not found");
  const track = asRecord(tracks[0]);
  if (!track) throw new Error("Invalid track payload");
  const albumExternalId = typeof track.idAlbum === "string" ? track.idAlbum : null;
  if (!albumExternalId) throw new Error("Track missing album id");
  await upsertAlbumFromAudioDb(albumExternalId);

  const again = await pool.query<{ id: number }>(
    "SELECT id FROM tracks WHERE recording_mbid = $1 LIMIT 1",
    [trackExternalId]
  );
  if (again.rows.length === 0) throw new Error("Track sync failed");
  return again.rows[0].id;
}
