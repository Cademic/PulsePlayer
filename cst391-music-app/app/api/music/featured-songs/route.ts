import { NextResponse } from "next/server";
import { audioDbGet } from "@/lib/theaudiodb-client";
import { mapAudioDbTopTracks, type FeaturedSongDto } from "@/lib/theaudiodb-search-map";

export const runtime = "nodejs";

const DEFAULT_FEATURED_SONG_COUNT = 20;
const MAX_FEATURED_SONG_COUNT = 80;
const TRENDING_COUNTRIES = [
  "us",
  "gb",
  "de",
  "fr",
  "it",
  "es",
  "ca",
  "au",
  "jp",
  "br",
];
const FALLBACK_ARTISTS = [
  "coldplay",
  "taylor swift",
  "drake",
  "dua lipa",
  "the weeknd",
  "billie eilish",
  "ed sheeran",
  "ariana grande",
  "post malone",
  "bruno mars",
  "adele",
  "rihanna",
  "beyonce",
  "lady gaga",
  "justin bieber",
  "selena gomez",
  "shawn mendes",
  "harry styles",
  "imagine dragons",
  "one republic",
  "maroon 5",
  "katy perry",
  "sia",
  "khalid",
  "sam smith",
  "halsey",
  "lizzo",
  "camila cabello",
  "sabrina carpenter",
  "olivia rodrigo",
  "miley cyrus",
  "sia",
  "zedd",
  "calvin harris",
  "avicii",
  "linkin park",
  "green day",
  "u2",
  "queen",
  "elton john",
  "the beatles",
  "the rolling stones",
  "fleetwood mac",
  "red hot chili peppers",
  "foo fighters",
  "nirvana",
  "metallica",
  "radiohead",
  "bon jovi",
  "guns n roses",
];

function resolveFeaturedSongLimit(request: Request): number {
  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get("limit");
  if (!rawLimit) {
    return DEFAULT_FEATURED_SONG_COUNT;
  }

  const parsedLimit = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsedLimit)) {
    return DEFAULT_FEATURED_SONG_COUNT;
  }

  return Math.min(Math.max(parsedLimit, 1), MAX_FEATURED_SONG_COUNT);
}

export async function GET(request: Request) {
  try {
    const featuredSongCount = resolveFeaturedSongLimit(request);
    const artist = process.env.THEAUDIODB_FEATURED_QUERY?.trim() ?? "coldplay";
    const artistPool = Array.from(
      new Set([
        artist,
        ...FALLBACK_ARTISTS.filter((name) => name.toLowerCase() !== artist.toLowerCase()),
      ])
    );
    const tracks: FeaturedSongDto[] = [];

    for (const artistName of artistPool) {
      if (tracks.length >= featuredSongCount) break;
      try {
        const topRaw = await audioDbGet(
          `/track-top10.php?s=${encodeURIComponent(artistName)}`
        );
        const topTracks = mapAudioDbTopTracks(topRaw);
        for (const t of topTracks) {
          if (tracks.some((existing) => existing.idTrack === t.idTrack)) continue;
          tracks.push(t);
          if (tracks.length >= featuredSongCount) break;
        }
      } catch {
        // Keep trying additional artists.
      }
    }

    // If artist top10 is sparse on free tier, supplement with top chart singles.
    if (tracks.length < featuredSongCount) {
      for (const country of TRENDING_COUNTRIES) {
        if (tracks.length >= featuredSongCount) break;
        try {
          const trendingRaw = (await audioDbGet(
            `/trending.php?country=${country}&type=itunes&format=singles`
          )) as { trending?: unknown[] | null };
          const trendingTracks = mapAudioDbTopTracks({
            track: Array.isArray(trendingRaw.trending) ? trendingRaw.trending : [],
          });
          for (const t of trendingTracks) {
            if (tracks.some((existing) => existing.idTrack === t.idTrack)) continue;
            tracks.push(t);
            if (tracks.length >= featuredSongCount) break;
          }
        } catch {
          // Keep best-effort behavior if one country feed fails.
        }
      }
    }

    return NextResponse.json({
      artist,
      items: tracks.slice(0, featuredSongCount) as FeaturedSongDto[],
    });
  } catch (err) {
    console.error("GET /api/music/featured-songs error:", err);
    return NextResponse.json(
      { error: "TheAudioDB featured songs query failed" },
      { status: 502 }
    );
  }
}
