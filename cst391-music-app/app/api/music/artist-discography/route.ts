import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { audioDbGet } from "@/lib/theaudiodb-client";
import { upsertAlbumFromAudioDb } from "@/lib/theaudiodb-sync";
import type { Album, Track } from "@/lib/types";

export const runtime = "nodejs";

interface AlbumRow {
  id: number;
  title: string;
  artist: string;
  year: number;
  image: string | null;
  description: string | null;
  release_mbid: string | null;
}

interface TrackRow {
  id: number;
  album_id: number;
  title: string;
  number: number;
  lyrics: string | null;
  video_url: string | null;
  recording_mbid: string | null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const artist = url.searchParams.get("artist")?.trim() ?? "";
    if (artist.length < 2) {
      return NextResponse.json(
        { error: "artist query parameter is required." },
        { status: 400 }
      );
    }

    const raw = await audioDbGet(`/searchalbum.php?s=${encodeURIComponent(artist)}`);
    const root = asRecord(raw);
    const albums = Array.isArray(root?.album) ? root.album : [];

    const syncedAlbumIds: number[] = [];
    for (const entry of albums) {
      const row = asRecord(entry);
      const externalId = typeof row?.idAlbum === "string" ? row.idAlbum : null;
      if (!externalId) continue;
      try {
        const albumId = await upsertAlbumFromAudioDb(externalId);
        syncedAlbumIds.push(albumId);
      } catch (e) {
        console.error("artist-discography sync error:", e);
      }
    }

    if (syncedAlbumIds.length === 0) {
      return NextResponse.json({ artist, items: [] as Album[] });
    }

    const albumsRes = await getPool().query<AlbumRow>(
      `SELECT id, title, artist, year, image, description, release_mbid
       FROM albums
       WHERE id = ANY($1::int[])
       ORDER BY year DESC, title ASC`,
      [syncedAlbumIds]
    );
    const dbAlbums = albumsRes.rows;

    const tracksRes = await getPool().query<TrackRow>(
      `SELECT id, album_id, title, number, lyrics, video_url, recording_mbid
       FROM tracks
       WHERE album_id = ANY($1::int[])
       ORDER BY album_id, number, title`,
      [syncedAlbumIds]
    );

    const tracksByAlbum: Record<number, Track[]> = {};
    for (const track of tracksRes.rows) {
      (tracksByAlbum[track.album_id] ??= []).push({
        id: track.id,
        number: track.number,
        title: track.title,
        lyrics: track.lyrics,
        video: track.video_url,
        recordingMbid: track.recording_mbid,
      });
    }

    const items: Album[] = dbAlbums.map((album) => ({
      id: album.id,
      title: album.title,
      artist: album.artist,
      year: album.year,
      image: album.image,
      description: album.description,
      releaseMbid: album.release_mbid,
      tracks: tracksByAlbum[album.id] ?? [],
    }));

    return NextResponse.json({ artist, items });
  } catch (error) {
    console.error("GET /api/music/artist-discography error:", error);
    return NextResponse.json(
      { error: "Failed to load artist discography" },
      { status: 502 }
    );
  }
}
