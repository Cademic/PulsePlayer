export interface MusicSearchItemDto {
  mbid: string;
  audioDbTrackId?: string;
  trackId?: number;
  title: string;
  artist: string;
  year?: number;
  disambiguation?: string;
  albumId?: number | null;
  coverArtUrl?: string | null;
}

export interface FeaturedSongDto {
  idTrack: string;
  title: string;
  artist: string;
  albumId: string | null;
  album: string | null;
  coverArtUrl: string | null;
  trackNumber?: number;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function toYear(v: unknown): number | undefined {
  if (typeof v !== "string" || v.length < 4) return undefined;
  const y = parseInt(v.slice(0, 4), 10);
  return Number.isNaN(y) ? undefined : y;
}

function mapAlbumRow(row: Record<string, unknown>): MusicSearchItemDto | null {
  const idRaw = row.idAlbum;
  const id = typeof idRaw === "string" ? idRaw : null;
  if (!id) return null;
  const title = typeof row.strAlbum === "string" ? row.strAlbum : "Untitled album";
  const artist = typeof row.strArtist === "string" ? row.strArtist : "Unknown artist";
  const image =
    typeof row.strAlbumThumb === "string"
      ? row.strAlbumThumb
      : typeof row.strAlbumCDart === "string"
        ? row.strAlbumCDart
        : null;
  return {
    mbid: id,
    title,
    artist,
    year: toYear(row.intYearReleased),
    disambiguation: typeof row.strStyle === "string" ? row.strStyle : undefined,
    coverArtUrl: image,
  };
}

export function mapAudioDbAlbums(json: unknown): MusicSearchItemDto[] {
  const root = asRecord(json);
  const albums = root?.album;
  if (!Array.isArray(albums)) return [];
  const out: MusicSearchItemDto[] = [];
  for (const a of albums) {
    const row = asRecord(a);
    if (!row) continue;
    const mapped = mapAlbumRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}

export function mapAudioDbTracks(json: unknown): MusicSearchItemDto[] {
  const root = asRecord(json);
  const tracks = root?.track;
  if (!Array.isArray(tracks)) return [];
  const out: MusicSearchItemDto[] = [];
  for (const entry of tracks) {
    const row = asRecord(entry);
    if (!row) continue;
    const albumIdRaw = row.idAlbum;
    const albumId = typeof albumIdRaw === "string" ? albumIdRaw : null;
    if (!albumId) continue;
    const trackIdRaw = row.idTrack;
    const trackId = typeof trackIdRaw === "string" ? trackIdRaw : undefined;
    const trackTitle =
      typeof row.strTrack === "string" ? row.strTrack : "Untitled track";
    const albumTitle =
      typeof row.strAlbum === "string" ? row.strAlbum : "Unknown album";
    const artist =
      typeof row.strArtist === "string" ? row.strArtist : "Unknown artist";
    const image =
      typeof row.strTrackThumb === "string"
        ? row.strTrackThumb
        : typeof row.strAlbumThumb === "string"
          ? row.strAlbumThumb
          : null;
    out.push({
      mbid: albumId,
      audioDbTrackId: trackId,
      title: trackTitle,
      artist,
      disambiguation: `Song • ${albumTitle}`,
      coverArtUrl: image,
    });
  }
  return out;
}

export function mapAudioDbTrendingAlbums(json: unknown): MusicSearchItemDto[] {
  const root = asRecord(json);
  const trending = root?.trending;
  if (!Array.isArray(trending)) return [];
  const out: MusicSearchItemDto[] = [];
  for (const entry of trending) {
    const row = asRecord(entry);
    if (!row) continue;
    const idRaw = row.idAlbum;
    const id = typeof idRaw === "string" ? idRaw : null;
    if (!id) continue;
    out.push({
      mbid: id,
      title: typeof row.strAlbum === "string" ? row.strAlbum : "Untitled album",
      artist: typeof row.strArtist === "string" ? row.strArtist : "Unknown artist",
      coverArtUrl:
        typeof row.strAlbumThumb === "string" ? row.strAlbumThumb : null,
    });
  }
  return out;
}

export function mapAudioDbTopTracks(json: unknown): FeaturedSongDto[] {
  const root = asRecord(json);
  const tracks = root?.track;
  if (!Array.isArray(tracks)) return [];
  const out: FeaturedSongDto[] = [];
  for (const item of tracks) {
    const row = asRecord(item);
    if (!row) continue;
    const idTrack = typeof row.idTrack === "string" ? row.idTrack : null;
    if (!idTrack) continue;
    out.push({
      idTrack,
      title: typeof row.strTrack === "string" ? row.strTrack : "Untitled track",
      artist: typeof row.strArtist === "string" ? row.strArtist : "Unknown artist",
      albumId: typeof row.idAlbum === "string" ? row.idAlbum : null,
      album: typeof row.strAlbum === "string" ? row.strAlbum : null,
      coverArtUrl:
        typeof row.strTrackThumb === "string"
          ? row.strTrackThumb
          : typeof row.strAlbumThumb === "string"
            ? row.strAlbumThumb
            : null,
      trackNumber:
        typeof row.intTrackNumber === "string"
          ? Number.parseInt(row.intTrackNumber, 10) || undefined
          : undefined,
    });
  }
  return out;
}
