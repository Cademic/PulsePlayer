import type { FeaturedSongDto, MusicSearchItemDto } from "@/lib/theaudiodb-search-map";

type FeaturedSongAlbumLink = Pick<FeaturedSongDto, "albumId" | "idTrack">;

function albumSegmentForSearchItem(item: MusicSearchItemDto): string | null {
  if (item.albumId != null) {
    return String(item.albumId);
  }
  const { mbid } = item;
  if (!mbid) {
    return null;
  }
  if (mbid.startsWith("local-")) {
    const rest = mbid.slice("local-".length);
    return /^\d+$/.test(rest) ? rest : null;
  }
  const trimmed = mbid.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

/** Path to the album detail route for a global search row, including track deep-link when applicable. */
export function albumPathFromSearchItem(item: MusicSearchItemDto): string | null {
  const segment = albumSegmentForSearchItem(item);
  if (!segment) {
    return null;
  }

  const params = new URLSearchParams();
  if (item.trackId != null) {
    params.set("track", String(item.trackId));
  } else if (item.audioDbTrackId) {
    params.set("recording", item.audioDbTrackId);
  }

  const query = params.toString();
  return query.length > 0 ? `/albums/${segment}?${query}` : `/albums/${segment}`;
}

export function albumPathFromFeaturedSong(song: FeaturedSongAlbumLink): string | null {
  if (!song.albumId) {
    return null;
  }
  const params = new URLSearchParams();
  if (song.idTrack) {
    params.set("recording", song.idTrack);
  }
  const query = params.toString();
  return query.length > 0
    ? `/albums/${song.albumId}?${query}`
    : `/albums/${song.albumId}`;
}
