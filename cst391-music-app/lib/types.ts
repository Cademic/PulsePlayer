export interface Track {
  id?: number;
  number: number;
  title: string;
  lyrics?: string | null;
  video?: string | null;
  /** External metadata track id (TheAudioDB idTrack in current integration). */
  recordingMbid?: string | null;
}

export interface Album {
  id?: number;
  title: string;
  artist: string;
  year: number;
  image?: string | null;
  description?: string | null;
  /** External metadata album id (TheAudioDB idAlbum in current integration). */
  releaseMbid?: string | null;
  tracks?: Track[];
}

/** Track row in POST / PUT album bodies (API shape). */
export interface TrackMutationPayload {
  id?: number;
  number: number | null;
  title: string;
  lyrics?: string | null;
  video?: string | null;
}

/** Body for POST /api/albums */
export interface AlbumCreatePayload {
  title: string;
  artist: string;
  year: number;
  description?: string | null;
  image?: string | null;
  tracks: TrackMutationPayload[];
}

/** Body for PUT /api/albums — album primary key is `id` (not albumId). */
export interface AlbumUpdatePayload {
  id: number;
  title: string;
  artist: string;
  year: number;
  description?: string | null;
  image?: string | null;
  tracks: TrackMutationPayload[];
}

/** Playlist row as returned by playlist APIs (camelCase JSON). */
export interface PlaylistSummary {
  id: string;
  name: string;
  ownerUserId: string | null;
  createdAt: string;
  trackCount: number;
}

/** Track line in GET /api/playlists/[id] response. */
export interface PlaylistDetailTrack {
  trackId: number;
  recordingMbid?: string | null;
  title: string;
  albumId: number;
  albumTitle: string;
  artist: string;
  albumImage?: string | null;
  addedAt: string;
}

/** GET /api/playlists/[id] success body. */
export interface PlaylistDetailPayload {
  playlist: PlaylistSummary;
  tracks: PlaylistDetailTrack[];
}
