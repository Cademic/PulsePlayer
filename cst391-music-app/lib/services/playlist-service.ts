import type { Session } from "next-auth";
import { getPool } from "@/lib/db";
import type {
  PlaylistDetailPayload,
  PlaylistDetailTrack,
  PlaylistSummary,
} from "@/lib/types";
import type { PlaylistSummaryRow } from "@/lib/repositories/playlist-repository";
import * as playlistRepo from "@/lib/repositories/playlist-repository";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function toSummary(row: PlaylistSummaryRow): PlaylistSummary {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at.toISOString(),
    trackCount: row.track_count,
  };
}

function requireAuth(session: Session | null): ServiceResult<{
  userId: string;
  role: "user" | "admin";
}> {
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }
  return { ok: true, data: { userId, role } };
}

function canViewPlaylist(
  ownerUserId: string | null,
  userId: string,
  role: "user" | "admin"
): boolean {
  if (role === "admin") {
    return true;
  }
  if (!ownerUserId) {
    return false;
  }
  return ownerUserId === userId;
}

function canMutatePlaylist(
  ownerUserId: string | null,
  userId: string,
  role: "user" | "admin"
): boolean {
  if (role === "admin") {
    return true;
  }
  if (!ownerUserId) {
    return false;
  }
  return ownerUserId === userId;
}

export async function listMine(
  session: Session | null
): Promise<ServiceResult<PlaylistSummary[]>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  const rows = await playlistRepo.listPlaylistsByOwner(auth.data.userId);
  return { ok: true, data: rows.map(toSummary) };
}

export async function listAllAdmin(
  session: Session | null
): Promise<ServiceResult<PlaylistSummary[]>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  if (auth.data.role !== "admin") {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const rows = await playlistRepo.listAllPlaylists();
  return { ok: true, data: rows.map(toSummary) };
}

export async function createPlaylist(
  session: Session | null,
  name: string
): Promise<ServiceResult<PlaylistSummary>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Missing or invalid name", status: 400 };
  }
  if (trimmed.length > 100) {
    return { ok: false, error: "name must be at most 100 characters", status: 400 };
  }
  const row = await playlistRepo.insertPlaylist(trimmed, auth.data.userId);
  return { ok: true, data: toSummary(row) };
}

export async function getPlaylistDetail(
  session: Session | null,
  playlistId: string
): Promise<ServiceResult<PlaylistDetailPayload>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  const summary = await playlistRepo.getPlaylistSummaryById(playlistId);
  if (!summary) {
    return { ok: false, error: "Playlist not found", status: 404 };
  }
  if (
    !canViewPlaylist(
      summary.owner_user_id,
      auth.data.userId,
      auth.data.role
    )
  ) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const trackRows = await playlistRepo.getPlaylistTracksDetail(playlistId);
  const tracks: PlaylistDetailTrack[] = trackRows.map((r) => ({
    trackId: r.track_id,
    recordingMbid: r.recording_mbid,
    title: r.track_title,
    albumId: r.album_id,
    albumTitle: r.album_title,
    artist: r.artist,
    albumImage: r.album_image,
    addedAt: r.added_at.toISOString(),
  }));
  return {
    ok: true,
    data: {
      playlist: toSummary(summary),
      tracks,
    },
  };
}

export async function deletePlaylistAdmin(
  session: Session | null,
  playlistId: string
): Promise<ServiceResult<null>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  if (auth.data.role !== "admin") {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const deleted = await playlistRepo.deletePlaylistById(playlistId);
  if (!deleted) {
    return { ok: false, error: "Playlist not found", status: 404 };
  }
  return { ok: true, data: null };
}

export async function addTrackToPlaylist(
  session: Session | null,
  playlistId: string,
  trackId: number
): Promise<ServiceResult<{ playlistId: string; trackId: number }>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  const summary = await playlistRepo.getPlaylistSummaryById(playlistId);
  if (!summary) {
    return { ok: false, error: "Playlist not found", status: 404 };
  }
  if (
    !canMutatePlaylist(
      summary.owner_user_id,
      auth.data.userId,
      auth.data.role
    )
  ) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const exists = await playlistRepo.trackExists(trackId);
  if (!exists) {
    return { ok: false, error: "Track not found", status: 404 };
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await playlistRepo.addTrackToPlaylist(playlistId, trackId, client);
    await client.query("COMMIT");
    return { ok: true, data: { playlistId, trackId } };
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      return { ok: false, error: "Track already in playlist", status: 409 };
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function removeTrackFromPlaylist(
  session: Session | null,
  playlistId: string,
  trackId: number
): Promise<ServiceResult<null>> {
  const auth = requireAuth(session);
  if (!auth.ok) {
    return auth;
  }
  const summary = await playlistRepo.getPlaylistSummaryById(playlistId);
  if (!summary) {
    return { ok: false, error: "Playlist not found", status: 404 };
  }
  if (
    !canMutatePlaylist(
      summary.owner_user_id,
      auth.data.userId,
      auth.data.role
    )
  ) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  const removed = await playlistRepo.removeTrackFromPlaylist(
    playlistId,
    trackId
  );
  if (removed === 0) {
    return { ok: false, error: "Track not in playlist", status: 404 };
  }
  return { ok: true, data: null };
}
