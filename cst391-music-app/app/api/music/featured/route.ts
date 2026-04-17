import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { audioDbGet } from "@/lib/theaudiodb-client";
import {
  mapAudioDbAlbums,
  mapAudioDbTrendingAlbums,
  type MusicSearchItemDto,
} from "@/lib/theaudiodb-search-map";

export const runtime = "nodejs";

const FEATURED_COUNT = 12;

export async function GET() {
  try {
    const query =
      process.env.THEAUDIODB_FEATURED_QUERY?.trim() ?? "coldplay";
    let items: MusicSearchItemDto[] = [];
    try {
      const trendingRaw = await audioDbGet(
        "/trending.php?country=us&type=itunes&format=albums"
      );
      items = mapAudioDbTrendingAlbums(trendingRaw).slice(0, FEATURED_COUNT);
    } catch {
      const searchRaw = await audioDbGet(
        `/searchalbum.php?s=${encodeURIComponent(query)}`
      );
      items = mapAudioDbAlbums(searchRaw).slice(0, FEATURED_COUNT);
    }

    const pool = getPool();
    for (const item of items) {
      const r = await pool.query<{ id: number }>(
        "SELECT id FROM albums WHERE release_mbid = $1 LIMIT 1",
        [item.mbid]
      );
      item.albumId = r.rows[0]?.id ?? null;
    }

    return NextResponse.json({
      query,
      items: items as MusicSearchItemDto[],
    });
  } catch (err) {
    console.error("GET /api/music/featured error:", err);
    return NextResponse.json(
      { error: "TheAudioDB featured query failed" },
      { status: 502 }
    );
  }
}
