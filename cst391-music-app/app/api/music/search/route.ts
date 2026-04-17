import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { audioDbGet } from "@/lib/theaudiodb-client";
import {
  mapAudioDbAlbums,
  mapAudioDbTopTracks,
  mapAudioDbTracks,
  type MusicSearchItemDto,
} from "@/lib/theaudiodb-search-map";

export const runtime = "nodejs";

const MAX_LIMIT = 20;

interface LocalSearchRow {
  album_id: number;
  album_title: string;
  artist: string;
  year: number | null;
  image: string | null;
  release_mbid: string | null;
  track_title: string | null;
  track_id: number | null;
}

function normalizeLoose(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function scoreSearchItem(item: MusicSearchItemDto, query: string): number {
  const q = normalizeLoose(query);
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => normalizeLoose(t))
    .filter(Boolean);

  const title = normalizeLoose(item.title ?? "");
  const artist = normalizeLoose(item.artist ?? "");
  const context = normalizeLoose(item.disambiguation ?? "");
  const haystack = `${title} ${artist} ${context}`;

  let score = 0;
  if (title === q) score += 1000;
  else if (title.includes(q)) score += 700;

  if (context.includes(q)) score += 550;
  if (artist.includes(q)) score += 400;

  for (const token of tokens) {
    if (title.includes(token)) score += 90;
    if (context.includes(token)) score += 65;
    if (artist.includes(token)) score += 45;
    if (haystack.includes(token)) score += 15;
  }

  return score;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10);
    const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(
      Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1),
      MAX_LIMIT
    );
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    if (q.length < 2) {
      return NextResponse.json({
        query: q,
        type: "release",
        items: [] as MusicSearchItemDto[],
        offset,
        limit,
      });
    }

    const pool = getPool();
    const localLike = `%${q}%`;
    const qNormalized = normalizeLoose(q);
    const localLooseLike = `%${qNormalized}%`;
    const localRes = await pool.query<LocalSearchRow>(
      `SELECT
         a.id AS album_id,
         a.title AS album_title,
         a.artist AS artist,
         a.year AS year,
         a.image AS image,
         a.release_mbid AS release_mbid,
         t.title AS track_title,
         t.id AS track_id
       FROM albums a
       LEFT JOIN tracks t ON t.album_id = a.id
       WHERE
         a.artist ILIKE $1 OR
         a.title ILIKE $1 OR
         t.title ILIKE $1 OR
         regexp_replace(lower(a.artist), '[^a-z0-9]+', '', 'g') LIKE $2 OR
         regexp_replace(lower(a.title), '[^a-z0-9]+', '', 'g') LIKE $2 OR
         regexp_replace(lower(COALESCE(t.title, '')), '[^a-z0-9]+', '', 'g') LIKE $2
       ORDER BY
         CASE
           WHEN a.artist ILIKE $1 THEN 0
           WHEN a.title ILIKE $1 THEN 1
           WHEN t.title ILIKE $1 THEN 2
           WHEN regexp_replace(lower(a.artist), '[^a-z0-9]+', '', 'g') LIKE $2 THEN 3
           WHEN regexp_replace(lower(a.title), '[^a-z0-9]+', '', 'g') LIKE $2 THEN 4
           ELSE 5
         END,
         a.year DESC NULLS LAST,
         a.title ASC,
         t.number ASC NULLS LAST,
         t.title ASC
       LIMIT 120`,
      [localLike, localLooseLike]
    );

    const localItems: MusicSearchItemDto[] = localRes.rows.map((row) => ({
      mbid: row.release_mbid ?? `local-${row.album_id}`,
      title: row.track_title ?? row.album_title,
      artist: row.artist,
      year: row.year ?? undefined,
      disambiguation: row.track_title ? `Song • ${row.album_title}` : "Album",
      coverArtUrl: row.image,
      albumId: row.album_id,
      trackId: row.track_id ?? undefined,
    }));

    async function fetchAudioDbItems(term: string): Promise<MusicSearchItemDto[]> {
      const [albumRes, trackByArtistRes, trackByTitleRes] = await Promise.allSettled([
        audioDbGet(`/searchalbum.php?s=${encodeURIComponent(term)}`),
        audioDbGet(`/searchtrack.php?s=${encodeURIComponent(term)}`),
        audioDbGet(`/searchtrack.php?t=${encodeURIComponent(term)}`),
      ]);
      if (
        albumRes.status === "rejected" &&
        trackByArtistRes.status === "rejected" &&
        trackByTitleRes.status === "rejected"
      ) {
        return [];
      }
      const albumItems =
        albumRes.status === "fulfilled" ? mapAudioDbAlbums(albumRes.value) : [];
      const trackItemsByArtist =
        trackByArtistRes.status === "fulfilled"
          ? mapAudioDbTracks(trackByArtistRes.value)
          : [];
      const trackItemsByTitle =
        trackByTitleRes.status === "fulfilled"
          ? mapAudioDbTracks(trackByTitleRes.value)
          : [];
      return [...albumItems, ...trackItemsByArtist, ...trackItemsByTitle];
    }

    async function fetchArtistPartialTrackItems(
      term: string
    ): Promise<MusicSearchItemDto[]> {
      const artistSearch = await audioDbGet(`/search.php?s=${encodeURIComponent(term)}`).catch(
        () => null
      );
      const root = asRecord(artistSearch);
      const artists = Array.isArray(root?.artists) ? root.artists : [];
      const normalizedTerm = normalizeLoose(term);
      const artistNames = artists
        .map((entry) => {
          const row = asRecord(entry);
          return typeof row?.strArtist === "string" ? row.strArtist : null;
        })
        .filter((name): name is string => !!name)
        .filter((name) => normalizeLoose(name).includes(normalizedTerm))
        .slice(0, 8);

      if (artistNames.length === 0) {
        return [];
      }

      const topTrackPayloads = await Promise.allSettled(
        artistNames.map((artist) =>
          audioDbGet(`/track-top10.php?s=${encodeURIComponent(artist)}`)
        )
      );
      const out: MusicSearchItemDto[] = [];
      for (const payload of topTrackPayloads) {
        if (payload.status !== "fulfilled") continue;
        const tracks = mapAudioDbTopTracks(payload.value);
        for (const track of tracks) {
          out.push({
            mbid: track.albumId ?? `track-${track.idTrack}`,
            audioDbTrackId: track.idTrack,
            title: track.title,
            artist: track.artist,
            disambiguation: track.album ? `Song • ${track.album}` : "Song",
            coverArtUrl: track.coverArtUrl,
          });
        }
      }
      return out;
    }

    function dedupeItems(items: MusicSearchItemDto[]): MusicSearchItemDto[] {
      const deduped: MusicSearchItemDto[] = [];
      const seen = new Set<string>();
      for (const item of items) {
        const key = `${item.mbid}::${item.title.toLowerCase()}::${item.artist.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
      }
      return deduped;
    }

    const primaryAudioItems = await fetchAudioDbItems(q);
    let deduped = dedupeItems([...localItems, ...primaryAudioItems]);

    if (deduped.length === 0) {
      const compact = q.replace(/\s+/g, "");
      const tokens = q.split(/\s+/).filter(Boolean);
      const fallbackTerms = Array.from(new Set([compact, ...tokens])).filter(
        (term) => term.length >= 2 && term.toLowerCase() !== q.toLowerCase()
      );
      const fallbackAudioItems = (
        await Promise.all(fallbackTerms.map((term) => fetchAudioDbItems(term)))
      ).flat();
      const partialArtistItems = await fetchArtistPartialTrackItems(q);
      deduped = dedupeItems([...localItems, ...fallbackAudioItems, ...partialArtistItems]);
    } else if (deduped.length < limit) {
      const partialArtistItems = await fetchArtistPartialTrackItems(q);
      deduped = dedupeItems([...deduped, ...partialArtistItems]);
    }

    const qNorm = normalizeLoose(q);
    const containsFiltered = deduped.filter((item) => {
      const haystack = [item.title, item.artist, item.disambiguation ?? ""]
        .map((v) => normalizeLoose(v))
        .join(" ");
      return haystack.includes(qNorm);
    });
    const rankedPool = (containsFiltered.length > 0 ? containsFiltered : deduped)
      .map((item) => ({ item, score: scoreSearchItem(item, q) }))
      .sort((a, b) => b.score - a.score || (b.item.year ?? 0) - (a.item.year ?? 0))
      .map((entry) => entry.item);
    deduped = rankedPool;
    const start = Math.min(offset, 5000);
    const end = start + limit;
    const items = deduped.slice(start, end);

    for (const item of items) {
      if (item.albumId != null) {
        continue;
      }
      const r = await pool.query<{ id: number }>(
        "SELECT id FROM albums WHERE release_mbid = $1 LIMIT 1",
        [item.mbid]
      );
      item.albumId = r.rows[0]?.id ?? null;
    }

    return NextResponse.json({
      query: q,
      type: "release",
      items,
      offset,
      limit,
    });
  } catch (err) {
    console.error("GET /api/music/search error:", err);
    return NextResponse.json(
      { error: "TheAudioDB search failed" },
      { status: 502 }
    );
  }
}
